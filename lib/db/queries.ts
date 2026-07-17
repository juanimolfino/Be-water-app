import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  activities,
  credits,
  diveCenters,
  jobs,
  sales,
  subscriptions,
  transactions,
  users,
  type Currency,
  type JobType,
  type PaymentMethod,
  type Role
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

export async function createActivity(input: {
  diveCenterId: string;
  createdByUserId: string;
  providerName: string;
  isOwnActivity: boolean;
  tourName: string;
  rackPrice?: string;
  netPrice?: string;
  commissionAmount?: string;
  currency: Currency;
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
}) {
  const [activity] = await getDb()
    .insert(activities)
    .values({
      diveCenterId: input.diveCenterId,
      createdByUserId: input.createdByUserId,
      providerName: input.providerName,
      isOwnActivity: input.isOwnActivity,
      tourName: input.tourName,
      rackPrice: input.rackPrice || null,
      netPrice: input.netPrice || null,
      commissionAmount: input.commissionAmount || null,
      currency: input.currency,
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
    })
    .returning();
  return activity;
}

export async function getActivityForCenter(activityId: string, diveCenterId: string) {
  return getDb().query.activities.findFirst({
    where: and(eq(activities.id, activityId), eq(activities.diveCenterId, diveCenterId))
  });
}

// --- Sellers ------------------------------------------------------------

export async function listSellersForCenter(diveCenterId: string) {
  return getDb().query.users.findMany({
    where: and(eq(users.diveCenterId, diveCenterId), eq(users.role, "seller")),
    orderBy: desc(users.createdAt)
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
      notes: input.notes || null
    })
    .returning();
  return sale;
}

export async function listSalesForCenter(diveCenterId: string, status?: "pending" | "approved" | "rejected") {
  return getDb().query.sales.findMany({
    where: status
      ? and(eq(sales.diveCenterId, diveCenterId), eq(sales.commissionStatus, status))
      : eq(sales.diveCenterId, diveCenterId),
    orderBy: desc(sales.saleDate),
    with: { activity: true, seller: true }
  });
}

export async function listSalesForSeller(sellerId: string) {
  return getDb().query.sales.findMany({
    where: eq(sales.sellerId, sellerId),
    orderBy: desc(sales.saleDate),
    with: { activity: true }
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
