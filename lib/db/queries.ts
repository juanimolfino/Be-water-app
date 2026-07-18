import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  agendaItems,
  agendaNotices,
  activities,
  credits,
  diveCenters,
  expenseCategories,
  expenses,
  jobs,
  sales,
  staffMembers,
  subscriptions,
  transactions,
  users,
  type Currency,
  type CommissionStatus,
  type ExpensePaymentMethod,
  type JobType,
  type PaymentMethod,
  type PaymentStatus,
  type ProviderPaymentStatus,
  type Role,
  type StaffAffiliation,
  type StaffRole
} from "@/lib/db/schema";
import { sendPurchaseConfirmationEmail, sendWelcomeEmail } from "@/lib/email/send";
import type { User } from "@supabase/supabase-js";

function isSuperadminEmail(email: string) {
  const superadminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(superadminEmail) && email.trim().toLowerCase() === superadminEmail;
}

/**
 * Only the superadmin self-registers on first login. Admins and sellers are
 * provisioned ahead of time (by the superadmin / an admin) with email+password,
 * so any other email hitting this path with no existing row is denied.
 */
export async function ensureUserProfile(authUser: User) {
  const db = getDb();
  const email = authUser.email ?? "";
  const existing = await db.query.users.findFirst({ where: eq(users.authUserId, authUser.id) });
  if (existing) return existing;

  if (!isSuperadminEmail(email)) {
    throw new Error("Esta cuenta no está habilitada. Pedile a tu superadmin o admin que te cree un usuario.");
  }

  const signupCredits = Number(process.env.FREE_SIGNUP_CREDITS ?? 5);

  const { profile, createdProfile } = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        authUserId: authUser.id,
        email,
        fullName: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        role: "superadmin"
      })
      .onConflictDoNothing({ target: users.authUserId })
      .returning();

    const profile = created ?? (await tx.query.users.findFirst({ where: eq(users.authUserId, authUser.id) }));
    if (!profile) throw new Error("Could not create user profile");

    if (created) {
      await tx.insert(credits).values({ userId: profile.id, balance: signupCredits }).onConflictDoNothing();
      await tx.insert(subscriptions).values({ userId: profile.id, plan: "free", status: "active" });
      await tx.insert(transactions).values({
        userId: profile.id,
        type: "signup_bonus",
        credits: signupCredits,
        metadata: { source: "first_login" }
      });
    }

    return { profile, createdProfile: Boolean(created) };
  });
  if (createdProfile) await sendWelcomeEmail(email, signupCredits);

  return profile;
}

export async function getDashboard(userId: string) {
  const db = getDb();
  const [creditRow, subscriptionRows, jobRows] = await Promise.all([
    db.query.credits.findFirst({ where: eq(credits.userId, userId) }),
    db.query.subscriptions.findMany({ where: eq(subscriptions.userId, userId), orderBy: desc(subscriptions.createdAt), limit: 1 }),
    db.query.jobs.findMany({ where: eq(jobs.userId, userId), orderBy: desc(jobs.createdAt), limit: 50 })
  ]);

  return {
    credits: creditRow?.balance ?? 0,
    subscription: subscriptionRows[0] ?? null,
    jobs: jobRows
  };
}

export async function createPendingJob(input: {
  userId: string;
  type: JobType;
  payload: Record<string, unknown>;
  creditsUsed: number;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [creditRow] = await tx
      .select()
      .from(credits)
      .where(and(eq(credits.userId, input.userId), sql`${credits.balance} >= ${input.creditsUsed}`))
      .for("update");

    if (!creditRow) throw new Error("INSUFFICIENT_CREDITS");

    await tx
      .update(credits)
      .set({ balance: sql`${credits.balance} - ${input.creditsUsed}`, updatedAt: new Date() })
      .where(eq(credits.userId, input.userId));

    const [job] = await tx
      .insert(jobs)
      .values({
        userId: input.userId,
        type: input.type,
        input: input.payload,
        creditsUsed: input.creditsUsed
      })
      .returning();

    await tx.insert(transactions).values({
      userId: input.userId,
      type: "credit_spend",
      credits: -input.creditsUsed,
      metadata: { jobId: job.id, jobType: input.type }
    });

    return job;
  });
}

export async function refundJobCredits(jobId: string, reason: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [job] = await tx.select().from(jobs).where(eq(jobs.id, jobId)).for("update");
    if (!job) throw new Error("Job not found");
    if (job.status === "done") return;

    const refundKey = `job_refund:${jobId}`;
    const [refund] = await tx.insert(transactions).values({
      userId: job.userId,
      type: "credit_refund",
      credits: job.creditsUsed,
      stripeEventId: refundKey,
      metadata: { jobId, reason }
    }).onConflictDoNothing({ target: transactions.stripeEventId }).returning({ id: transactions.id });

    if (refund) {
      await tx
        .update(credits)
        .set({ balance: sql`${credits.balance} + ${job.creditsUsed}`, updatedAt: new Date() })
        .where(eq(credits.userId, job.userId));
    }

    await tx.update(jobs).set({ status: "failed", error: reason, updatedAt: new Date() }).where(eq(jobs.id, jobId));
  });
}

export async function markJobProcessing(jobId: string) {
  return getDb()
    .update(jobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "pending")));
}

export async function markJobDone(jobId: string, resultUrl: string) {
  return getDb()
    .update(jobs)
    .set({ status: "done", resultUrl, updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "processing")));
}

export async function getJobForUser(jobId: string, userId: string) {
  return getDb().query.jobs.findFirst({ where: and(eq(jobs.id, jobId), eq(jobs.userId, userId)) });
}

export async function addCredits(userId: string, amount: number, metadata: Record<string, unknown>, stripeEventId?: string) {
  const db = getDb();
  const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const applied = await db.transaction(async (tx) => {
    const [transaction] = await tx.insert(transactions).values({
      userId,
      type: metadata.kind === "subscription" ? "subscription_payment" : "credit_purchase",
      credits: amount,
      amountCents: typeof metadata.amountCents === "number" ? metadata.amountCents : null,
      stripeEventId,
      metadata
    }).onConflictDoNothing().returning({ id: transactions.id });

    if (!transaction) return false;

    await tx
      .insert(credits)
      .values({ userId, balance: amount })
      .onConflictDoUpdate({
        target: credits.userId,
        set: { balance: sql`${credits.balance} + ${amount}`, updatedAt: new Date() }
      });

    return true;
  });
  if (applied && profile?.email && amount > 0) await sendPurchaseConfirmationEmail(profile.email, amount);
}

// --- Dive centers ---------------------------------------------------------

export async function createDiveCenterWithAdmin(input: {
  adminAuthUserId: string;
  adminEmail: string;
  adminFullName?: string;
  name: string;
  phone?: string;
  email?: string;
  officeLocation?: string;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [admin] = await tx
      .insert(users)
      .values({
        authUserId: input.adminAuthUserId,
        email: input.adminEmail,
        fullName: input.adminFullName || null,
        role: "admin"
      })
      .returning();

    const [center] = await tx
      .insert(diveCenters)
      .values({
        ownerUserId: admin.id,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        officeLocation: input.officeLocation || null
      })
      .returning();

    const [linkedAdmin] = await tx
      .update(users)
      .set({ diveCenterId: center.id, updatedAt: new Date() })
      .where(eq(users.id, admin.id))
      .returning();

    return { admin: linkedAdmin, center };
  });
}

export async function getDiveCenterById(id: string) {
  return getDb().query.diveCenters.findFirst({ where: eq(diveCenters.id, id) });
}

export async function listDiveCentersWithStats() {
  const db = getDb();
  const centers = await db.query.diveCenters.findMany({ orderBy: desc(diveCenters.createdAt) });

  return Promise.all(
    centers.map(async (center) => {
      const [[activityCount], [sellerCount], [pendingCount], [approvedTotal]] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(activities).where(eq(activities.diveCenterId, center.id)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(and(eq(users.diveCenterId, center.id), eq(users.role, "seller"))),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(sales)
          .where(and(eq(sales.diveCenterId, center.id), eq(sales.commissionStatus, "pending"))),
        db
          .select({ total: sql<string>`coalesce(sum(${sales.commissionAmount}), 0)` })
          .from(sales)
          .where(and(eq(sales.diveCenterId, center.id), eq(sales.commissionStatus, "approved")))
      ]);

      return {
        center,
        activityCount: activityCount?.count ?? 0,
        sellerCount: sellerCount?.count ?? 0,
        pendingSalesCount: pendingCount?.count ?? 0,
        approvedCommissionTotal: approvedTotal?.total ?? "0"
      };
    })
  );
}

// --- Activities -------------------------------------------------------------

export async function listActivitiesForCenter(diveCenterId: string) {
  return getDb().query.activities.findMany({
    where: eq(activities.diveCenterId, diveCenterId),
    orderBy: desc(activities.createdAt)
  });
}

type ActivityDetails = {
  providerName: string;
  isOwnActivity: boolean;
  tourName: string;
  rackPrice?: string;
  netPrice?: string;
  commissionAmount?: string;
  currency: Currency;
  website?: string;
  phone?: string;
  officeLocation?: string;
  meetingPoint?: string;
  distanceToActivity?: string;
  meetingTime?: string;
  duration?: string;
  tourLocation?: string;
  includes?: string;
  excludes?: string;
  whatToBring?: string;
  whatYouWillSee?: string;
};

function activityValues(input: ActivityDetails) {
  return {
    providerName: input.providerName,
    isOwnActivity: input.isOwnActivity,
    tourName: input.tourName,
    rackPrice: input.rackPrice || null,
    netPrice: input.netPrice || null,
    commissionAmount: input.commissionAmount || null,
    currency: input.currency,
    website: input.website || null,
    phone: input.phone || null,
    officeLocation: input.officeLocation || null,
    meetingPoint: input.meetingPoint || null,
    distanceToActivity: input.distanceToActivity || null,
    meetingTime: input.meetingTime || null,
    duration: input.duration || null,
    tourLocation: input.tourLocation || null,
    includes: input.includes || null,
    excludes: input.excludes || null,
    whatToBring: input.whatToBring || null,
    whatYouWillSee: input.whatYouWillSee || null
  };
}

export async function createActivity(input: ActivityDetails & { diveCenterId: string; createdByUserId: string }) {
  const [activity] = await getDb()
    .insert(activities)
    .values({
      diveCenterId: input.diveCenterId,
      createdByUserId: input.createdByUserId,
      ...activityValues(input)
    })
    .returning();
  return activity;
}

export async function updateActivity(input: ActivityDetails & { id: string; diveCenterId: string }) {
  const [activity] = await getDb()
    .update(activities)
    .set({ ...activityValues(input), updatedAt: new Date() })
    .where(and(eq(activities.id, input.id), eq(activities.diveCenterId, input.diveCenterId)))
    .returning();
  return activity;
}

export async function deleteActivity(activityId: string, diveCenterId: string) {
  const existingSale = await getDb().query.sales.findFirst({
    columns: { id: true },
    where: and(eq(sales.activityId, activityId), eq(sales.diveCenterId, diveCenterId))
  });
  if (existingSale) return "has_sales" as const;

  const [deleted] = await getDb()
    .delete(activities)
    .where(and(eq(activities.id, activityId), eq(activities.diveCenterId, diveCenterId)))
    .returning({ id: activities.id });
  return deleted ? "deleted" as const : "not_found" as const;
}

export async function getActivityForCenter(activityId: string, diveCenterId: string) {
  return getDb().query.activities.findFirst({
    where: and(eq(activities.id, activityId), eq(activities.diveCenterId, diveCenterId))
  });
}

export async function updateCommissionPaymentDays(diveCenterId: string, paymentDays: number[]) {
  const [center] = await getDb()
    .update(diveCenters)
    .set({ commissionPaymentDays: paymentDays, updatedAt: new Date() })
    .where(eq(diveCenters.id, diveCenterId))
    .returning();
  return center;
}

// --- Sellers ------------------------------------------------------------

export async function listSellersForCenter(diveCenterId: string) {
  return getDb().query.users.findMany({
    where: and(eq(users.diveCenterId, diveCenterId), eq(users.role, "seller"), eq(users.active, true)),
    orderBy: asc(users.fullName)
  });
}

export async function createSellerProfile(input: {
  authUserId: string;
  email: string;
  fullName?: string;
  diveCenterId: string;
}) {
  const [seller] = await getDb()
    .insert(users)
    .values({
      authUserId: input.authUserId,
      email: input.email,
      fullName: input.fullName || null,
      role: "seller",
      diveCenterId: input.diveCenterId
    })
    .returning();
  return seller;
}

export async function updateSellerProfile(input: { sellerId: string; diveCenterId: string; fullName?: string | null; email: string }) {
  return getDb()
    .update(users)
    .set({ fullName: input.fullName || null, email: input.email, updatedAt: new Date() })
    .where(and(eq(users.id, input.sellerId), eq(users.diveCenterId, input.diveCenterId), eq(users.role, "seller")))
    .returning();
}

export async function deactivateSellerProfile(input: { sellerId: string; diveCenterId: string }) {
  return getDb()
    .update(users)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(users.id, input.sellerId), eq(users.diveCenterId, input.diveCenterId), eq(users.role, "seller")))
    .returning();
}

export async function listStaffMembersForCenter(diveCenterId: string) {
  return getDb().query.staffMembers.findMany({
    where: and(eq(staffMembers.diveCenterId, diveCenterId), eq(staffMembers.active, true)),
    orderBy: [asc(staffMembers.affiliation), asc(staffMembers.fullName)]
  });
}

export async function createStaffMember(input: {
  diveCenterId: string;
  fullName: string;
  phone?: string | null;
  role: StaffRole;
  affiliation: StaffAffiliation;
  createdByUserId: string;
}) {
  const [staff] = await getDb()
    .insert(staffMembers)
    .values({
      diveCenterId: input.diveCenterId,
      fullName: input.fullName,
      phone: input.phone || null,
      role: input.role,
      affiliation: input.affiliation,
      createdByUserId: input.createdByUserId
    })
    .returning();
  return staff;
}

export async function updateStaffMember(input: {
  staffId: string;
  diveCenterId: string;
  fullName: string;
  phone?: string | null;
  role: StaffRole;
  affiliation: StaffAffiliation;
}) {
  return getDb()
    .update(staffMembers)
    .set({
      fullName: input.fullName,
      phone: input.phone || null,
      role: input.role,
      affiliation: input.affiliation,
      updatedAt: new Date()
    })
    .where(and(eq(staffMembers.id, input.staffId), eq(staffMembers.diveCenterId, input.diveCenterId), eq(staffMembers.active, true)))
    .returning();
}

export async function deactivateStaffMember(input: { staffId: string; diveCenterId: string }) {
  return getDb()
    .update(staffMembers)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(staffMembers.id, input.staffId), eq(staffMembers.diveCenterId, input.diveCenterId), eq(staffMembers.active, true)))
    .returning();
}

// --- Sales ----------------------------------------------------------------

export async function createSale(input: {
  diveCenterId: string;
  activityId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  commissionPerUnit: number;
  commissionStatus?: CommissionStatus;
  validatedByUserId?: string;
  paymentStatus?: PaymentStatus;
  tourDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}) {
  const grossAmount = (input.quantity * input.unitPrice).toFixed(2);
  const commissionAmount = (input.quantity * input.commissionPerUnit).toFixed(2);

  const [sale] = await getDb()
    .insert(sales)
    .values({
      diveCenterId: input.diveCenterId,
      activityId: input.activityId,
      sellerId: input.sellerId,
      quantity: input.quantity,
      unitPrice: input.unitPrice.toFixed(2),
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      grossAmount,
      commissionAmount,
      commissionStatus: input.commissionStatus,
      validatedByUserId: input.validatedByUserId,
      validatedAt: input.validatedByUserId ? new Date() : null,
      paymentStatus: input.paymentStatus,
      tourDate: input.tourDate,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      notes: input.notes || null
    })
    .returning();
  return sale;
}

export async function listSalesForCenter(diveCenterId: string, status?: "pending" | "approved" | "rejected") {
  return getDb().query.sales.findMany({
    where: status
      ? and(eq(sales.diveCenterId, diveCenterId), eq(sales.commissionStatus, status), eq(sales.reservationStatus, "active"))
      : eq(sales.diveCenterId, diveCenterId),
    orderBy: desc(sales.saleDate),
    with: { activity: true, seller: true, assignedStaff: true, providerPaidBy: true }
  });
}

export async function countPendingProviderPaymentsForCenter(diveCenterId: string) {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .innerJoin(activities, eq(sales.activityId, activities.id))
    .where(
      and(
        eq(sales.diveCenterId, diveCenterId),
        eq(sales.reservationStatus, "active"),
        eq(sales.providerPaymentStatus, "pending"),
        eq(activities.isOwnActivity, false),
        sql`${activities.netPrice} is not null`
      )
    );

  return row?.count ?? 0;
}

export async function listSalesForSeller(sellerId: string) {
  return getDb().query.sales.findMany({
    where: eq(sales.sellerId, sellerId),
    orderBy: desc(sales.saleDate),
    with: { activity: true, assignedStaff: true }
  });
}

export async function validateSale(input: {
  saleId: string;
  diveCenterId: string;
  validatedByUserId: string;
  status: "approved" | "rejected";
}) {
  return getDb()
    .update(sales)
    .set({
      commissionStatus: input.status,
      validatedByUserId: input.validatedByUserId,
      validatedAt: new Date(),
      updatedAt: new Date()
    })
    .where(
      and(eq(sales.id, input.saleId), eq(sales.diveCenterId, input.diveCenterId), eq(sales.commissionStatus, "pending"))
    )
    .returning();
}

export async function cancelSale(input: {
  saleId: string;
  diveCenterId: string;
  cancelledByUserId: string;
  cancellationReason: string;
  sellerId?: string;
}) {
  const conditions = [
    eq(sales.id, input.saleId),
    eq(sales.diveCenterId, input.diveCenterId),
    eq(sales.reservationStatus, "active")
  ];
  if (input.sellerId) conditions.push(eq(sales.sellerId, input.sellerId));

  return getDb()
    .update(sales)
    .set({
      reservationStatus: "cancelled",
      cancellationReason: input.cancellationReason,
      cancelledByUserId: input.cancelledByUserId,
      cancelledAt: new Date(),
      updatedAt: new Date()
    })
    .where(and(...conditions))
    .returning();
}

export async function markSalePaid(input: { saleId: string; diveCenterId: string; sellerId?: string }) {
  const conditions = [
    eq(sales.id, input.saleId),
    eq(sales.diveCenterId, input.diveCenterId),
    eq(sales.reservationStatus, "active"),
    eq(sales.paymentStatus, "unpaid")
  ];
  if (input.sellerId) conditions.push(eq(sales.sellerId, input.sellerId));

  return getDb()
    .update(sales)
    .set({ paymentStatus: "paid", updatedAt: new Date() })
    .where(and(...conditions))
    .returning();
}

export async function assignSaleResponsible(input: { saleId: string; diveCenterId: string; responsibleStaffId?: string | null }) {
  const sale = await getDb().query.sales.findFirst({
    columns: { id: true },
    where: and(eq(sales.id, input.saleId), eq(sales.diveCenterId, input.diveCenterId)),
    with: { activity: true }
  });
  if (!sale || !sale.activity.isOwnActivity) return [];

  if (input.responsibleStaffId) {
    const responsible = await getDb().query.staffMembers.findFirst({
      columns: { id: true },
      where: and(eq(staffMembers.id, input.responsibleStaffId), eq(staffMembers.diveCenterId, input.diveCenterId), eq(staffMembers.active, true))
    });
    if (!responsible) return [];
  }

  return getDb()
    .update(sales)
    .set({ assignedStaffId: input.responsibleStaffId || null, updatedAt: new Date() })
    .where(and(eq(sales.id, input.saleId), eq(sales.diveCenterId, input.diveCenterId)))
    .returning();
}

export async function markProviderPaymentPaid(input: {
  saleId: string;
  diveCenterId: string;
  method: ExpensePaymentMethod;
  paidByUserId: string;
}) {
  const sale = await getDb().query.sales.findFirst({
    where: and(eq(sales.id, input.saleId), eq(sales.diveCenterId, input.diveCenterId)),
    with: { activity: true }
  });
  if (!sale || sale.activity.isOwnActivity || !sale.activity.netPrice) return [];

  return getDb()
    .update(sales)
    .set({
      providerPaymentStatus: "paid" satisfies ProviderPaymentStatus,
      providerPaymentMethod: input.method,
      providerPaidByUserId: input.paidByUserId,
      providerPaidAt: new Date(),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(sales.id, input.saleId),
        eq(sales.diveCenterId, input.diveCenterId),
        eq(sales.reservationStatus, "active"),
        eq(sales.providerPaymentStatus, "pending")
      )
    )
    .returning();
}

// --- Agenda -----------------------------------------------------------

export async function listAgendaItemsForCenter(diveCenterId: string) {
  return getDb().query.agendaItems.findMany({
    where: and(eq(agendaItems.diveCenterId, diveCenterId), eq(agendaItems.active, true)),
    orderBy: [asc(agendaItems.itemDate), asc(agendaItems.createdAt)],
    with: { activity: true, responsibleStaff: true, createdBy: true }
  });
}

export async function listAgendaNoticesForCenter(diveCenterId: string) {
  return getDb().query.agendaNotices.findMany({
    where: eq(agendaNotices.diveCenterId, diveCenterId),
    orderBy: [asc(agendaNotices.noticeDate), asc(agendaNotices.createdAt)],
    with: { createdBy: true }
  });
}

export async function createAgendaItem(input: {
  diveCenterId: string;
  itemDate: string;
  activityId: string;
  quantity?: number | null;
  responsibleStaffId?: string | null;
  notes?: string | null;
  createdByUserId: string;
}) {
  const activity = await getActivityForCenter(input.activityId, input.diveCenterId);
  if (!activity) return null;

  if (input.responsibleStaffId) {
    const responsible = await getDb().query.staffMembers.findFirst({
      columns: { id: true },
      where: and(eq(staffMembers.id, input.responsibleStaffId), eq(staffMembers.diveCenterId, input.diveCenterId), eq(staffMembers.active, true))
    });
    if (!responsible) return null;
  }

  const [item] = await getDb()
    .insert(agendaItems)
    .values({
      diveCenterId: input.diveCenterId,
      itemDate: input.itemDate,
      title: `${activity.providerName} · ${activity.tourName}`,
      activityId: activity.id,
      quantity: input.quantity ?? null,
      responsibleStaffId: activity.isOwnActivity ? input.responsibleStaffId || null : null,
      notes: input.notes || null,
      createdByUserId: input.createdByUserId
    })
    .returning();
  return item;
}

export async function assignAgendaItemResponsible(input: { itemId: string; diveCenterId: string; responsibleStaffId?: string | null }) {
  const item = await getDb().query.agendaItems.findFirst({
    columns: { id: true },
    where: and(eq(agendaItems.id, input.itemId), eq(agendaItems.diveCenterId, input.diveCenterId), eq(agendaItems.active, true)),
    with: { activity: true }
  });
  if (!item || !item.activity?.isOwnActivity) return [];

  if (input.responsibleStaffId) {
    const responsible = await getDb().query.staffMembers.findFirst({
      columns: { id: true },
      where: and(eq(staffMembers.id, input.responsibleStaffId), eq(staffMembers.diveCenterId, input.diveCenterId), eq(staffMembers.active, true))
    });
    if (!responsible) return [];
  }

  return getDb()
    .update(agendaItems)
    .set({ responsibleStaffId: input.responsibleStaffId || null, updatedAt: new Date() })
    .where(and(eq(agendaItems.id, input.itemId), eq(agendaItems.diveCenterId, input.diveCenterId), eq(agendaItems.active, true)))
    .returning();
}

export async function deactivateAgendaItem(input: { itemId: string; diveCenterId: string }) {
  return getDb()
    .update(agendaItems)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(agendaItems.id, input.itemId), eq(agendaItems.diveCenterId, input.diveCenterId), eq(agendaItems.active, true)))
    .returning();
}

export async function createAgendaNotice(input: {
  diveCenterId: string;
  noticeDate: string;
  message: string;
  createdByUserId: string;
}) {
  const [notice] = await getDb()
    .insert(agendaNotices)
    .values({
      diveCenterId: input.diveCenterId,
      noticeDate: input.noticeDate,
      message: input.message,
      createdByUserId: input.createdByUserId
    })
    .returning();
  return notice;
}

export async function deleteAgendaNotice(input: { noticeId: string; diveCenterId: string }) {
  return getDb()
    .delete(agendaNotices)
    .where(and(eq(agendaNotices.id, input.noticeId), eq(agendaNotices.diveCenterId, input.diveCenterId)))
    .returning();
}

// --- Expenses ---------------------------------------------------------

export async function listExpenseCategoriesForCenter(diveCenterId: string) {
  return getDb().query.expenseCategories.findMany({
    where: eq(expenseCategories.diveCenterId, diveCenterId),
    orderBy: asc(expenseCategories.name)
  });
}

export async function createExpenseCategory(input: { diveCenterId: string; name: string }) {
  const [category] = await getDb()
    .insert(expenseCategories)
    .values({ diveCenterId: input.diveCenterId, name: input.name })
    .returning();
  return category;
}

export async function getExpenseCategoryForCenter(categoryId: string, diveCenterId: string) {
  return getDb().query.expenseCategories.findFirst({
    where: and(eq(expenseCategories.id, categoryId), eq(expenseCategories.diveCenterId, diveCenterId))
  });
}

export async function deleteExpenseCategory(categoryId: string, diveCenterId: string) {
  const existingExpense = await getDb().query.expenses.findFirst({
    columns: { id: true },
    where: and(eq(expenses.categoryId, categoryId), eq(expenses.diveCenterId, diveCenterId))
  });
  if (existingExpense) return "has_expenses" as const;

  const [deleted] = await getDb()
    .delete(expenseCategories)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.diveCenterId, diveCenterId)))
    .returning({ id: expenseCategories.id });
  return deleted ? ("deleted" as const) : ("not_found" as const);
}

export async function createExpense(input: {
  diveCenterId: string;
  categoryId: string;
  amount: string;
  currency: Currency;
  paymentMethod: ExpensePaymentMethod;
  expenseDate: string;
  description: string;
  providerName?: string;
  createdByUserId: string;
}) {
  const [expense] = await getDb()
    .insert(expenses)
    .values({
      diveCenterId: input.diveCenterId,
      categoryId: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      expenseDate: input.expenseDate,
      description: input.description,
      providerName: input.providerName || null,
      createdByUserId: input.createdByUserId
    })
    .returning();
  return expense;
}

export async function listExpensesForCenter(input: {
  diveCenterId: string;
  from?: string;
  to?: string;
  categoryId?: string;
  providerName?: string;
}) {
  const conditions = [eq(expenses.diveCenterId, input.diveCenterId)];
  if (input.from) conditions.push(gte(expenses.expenseDate, input.from));
  if (input.to) conditions.push(lte(expenses.expenseDate, input.to));
  if (input.categoryId) conditions.push(eq(expenses.categoryId, input.categoryId));
  if (input.providerName) conditions.push(eq(expenses.providerName, input.providerName));

  return getDb().query.expenses.findMany({
    where: and(...conditions),
    orderBy: [desc(expenses.expenseDate), desc(expenses.createdAt)],
    with: { category: true }
  });
}

export async function listExpenseProvidersForCenter(diveCenterId: string) {
  const rows = await getDb()
    .selectDistinct({ providerName: expenses.providerName })
    .from(expenses)
    .where(and(eq(expenses.diveCenterId, diveCenterId), sql`${expenses.providerName} is not null`));
  return rows.map((row) => row.providerName as string).sort((a, b) => a.localeCompare(b));
}
