import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "done", "failed"]);
export const jobTypeEnum = pgEnum("job_type", ["image", "tts"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "credit_purchase",
  "subscription_payment",
  "credit_spend",
  "credit_refund",
  "signup_bonus"
]);

export const roleEnum = pgEnum("role", ["superadmin", "admin", "seller"]);
export const currencyEnum = pgEnum("currency", ["CRC", "USD"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "tour_operator"]);
export const commissionStatusEnum = pgEnum("commission_status", ["pending", "approved", "rejected"]);
export const reservationStatusEnum = pgEnum("reservation_status", ["active", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["paid", "unpaid"]);
export const providerPaymentStatusEnum = pgEnum("provider_payment_status", ["pending", "paid"]);
export const expensePaymentMethodEnum = pgEnum("expense_payment_method", ["cash", "bank_transfer"]);
export const staffRoleEnum = pgEnum("staff_role", ["instructor", "dm"]);
export const staffAffiliationEnum = pgEnum("staff_affiliation", ["be_water", "freelance"]);

export const diveCenters = pgTable("dive_centers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerUserId: uuid("owner_user_id").notNull().unique(),
  phone: text("phone"),
  email: text("email"),
  officeLocation: text("office_location"),
  commissionPaymentDays: jsonb("commission_payment_days").$type<number[]>().default(sql`'[1, 15]'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    role: roleEnum("role").default("admin").notNull(),
    diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "set null" }),
    active: boolean("active").default(true).notNull(),
    stripeCustomerId: text("stripe_customer_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("users_one_superadmin_idx")
      .on(table.role)
      .where(sql`${table.role} = 'superadmin'`)
  ]
);

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "cascade" }).notNull(),
  providerName: text("provider_name").notNull(),
  isOwnActivity: boolean("is_own_activity").default(true).notNull(),
  tourName: text("tour_name").notNull(),
  rackPrice: numeric("rack_price", { precision: 10, scale: 2 }),
  netPrice: numeric("net_price", { precision: 10, scale: 2 }),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }),
  currency: currencyEnum("currency").default("USD").notNull(),
  website: text("website"),
  phone: text("phone"),
  officeLocation: text("office_location"),
  meetingPoint: text("meeting_point"),
  distanceToActivity: text("distance_to_activity"),
  meetingTime: text("meeting_time"),
  duration: text("duration"),
  tourLocation: text("tour_location"),
  includes: text("includes"),
  excludes: text("excludes"),
  whatToBring: text("what_to_bring"),
  whatYouWillSee: text("what_you_will_see"),
  active: boolean("active").default(true).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "cascade" }).notNull(),
  activityId: uuid("activity_id").references(() => activities.id, { onDelete: "restrict" }).notNull(),
  sellerId: uuid("seller_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  grossAmount: numeric("gross_amount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commissionStatus: commissionStatusEnum("commission_status").default("pending").notNull(),
  reservationStatus: reservationStatusEnum("reservation_status").default("active").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("paid").notNull(),
  saleDate: timestamp("sale_date", { withTimezone: true }).defaultNow().notNull(),
  tourDate: date("tour_date"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledByUserId: uuid("cancelled_by_user_id").references(() => users.id, { onDelete: "set null" }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
  assignedStaffId: uuid("assigned_staff_id").references(() => staffMembers.id, { onDelete: "set null" }),
  providerPaymentStatus: providerPaymentStatusEnum("provider_payment_status").default("pending").notNull(),
  providerPaymentMethod: expensePaymentMethodEnum("provider_payment_method"),
  providerPaidByUserId: uuid("provider_paid_by_user_id").references(() => users.id, { onDelete: "set null" }),
  providerPaidAt: timestamp("provider_paid_at", { withTimezone: true }),
  validatedByUserId: uuid("validated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const agendaItems = pgTable("agenda_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "cascade" }).notNull(),
  itemDate: date("item_date").notNull(),
  title: text("title").notNull(),
  activityId: uuid("activity_id").references(() => activities.id, { onDelete: "set null" }),
  quantity: integer("quantity"),
  responsibleUserId: uuid("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  responsibleStaffId: uuid("responsible_staff_id").references(() => staffMembers.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const staffMembers = pgTable("staff_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "cascade" }).notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: staffRoleEnum("role").notNull(),
  affiliation: staffAffiliationEnum("affiliation").notNull(),
  active: boolean("active").default(true).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const agendaNotices = pgTable("agenda_notices", {
  id: uuid("id").defaultRandom().primaryKey(),
  diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "cascade" }).notNull(),
  noticeDate: date("notice_date").notNull(),
  message: text("message").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("expense_categories_center_name_idx").on(table.diveCenterId, table.name)]
);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  diveCenterId: uuid("dive_center_id").references(() => diveCenters.id, { onDelete: "cascade" }).notNull(),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "restrict" }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD").notNull(),
  paymentMethod: expensePaymentMethodEnum("payment_method").notNull(),
  expenseDate: date("expense_date").notNull(),
  description: text("description").notNull(),
  providerName: text("provider_name"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const credits = pgTable("credits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  plan: text("plan").default("free").notNull(),
  status: text("status").default("inactive").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").default("pending").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().notNull(),
  resultUrl: text("result_url"),
  error: text("error"),
  creditsUsed: integer("credits_used").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  credits: integer("credits").notNull(),
  amountCents: integer("amount_cents"),
  stripeEventId: text("stripe_event_id").unique(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const userRelations = relations(users, ({ one, many }) => ({
  credits: one(credits),
  jobs: many(jobs),
  subscriptions: many(subscriptions),
  transactions: many(transactions),
  diveCenter: one(diveCenters, { fields: [users.diveCenterId], references: [diveCenters.id] })
}));

export const diveCenterRelations = relations(diveCenters, ({ many }) => ({
  members: many(users),
  staffMembers: many(staffMembers),
  activities: many(activities),
  sales: many(sales),
  agendaItems: many(agendaItems),
  agendaNotices: many(agendaNotices),
  expenseCategories: many(expenseCategories),
  expenses: many(expenses)
}));

export const activityRelations = relations(activities, ({ one, many }) => ({
  diveCenter: one(diveCenters, { fields: [activities.diveCenterId], references: [diveCenters.id] }),
  sales: many(sales)
}));

export const saleRelations = relations(sales, ({ one }) => ({
  diveCenter: one(diveCenters, { fields: [sales.diveCenterId], references: [diveCenters.id] }),
  activity: one(activities, { fields: [sales.activityId], references: [activities.id] }),
  seller: one(users, { fields: [sales.sellerId], references: [users.id] }),
  assignedTo: one(users, { fields: [sales.assignedToUserId], references: [users.id] }),
  assignedStaff: one(staffMembers, { fields: [sales.assignedStaffId], references: [staffMembers.id] }),
  providerPaidBy: one(users, { fields: [sales.providerPaidByUserId], references: [users.id] }),
  validatedBy: one(users, { fields: [sales.validatedByUserId], references: [users.id] })
}));

export const agendaItemRelations = relations(agendaItems, ({ one }) => ({
  diveCenter: one(diveCenters, { fields: [agendaItems.diveCenterId], references: [diveCenters.id] }),
  activity: one(activities, { fields: [agendaItems.activityId], references: [activities.id] }),
  responsible: one(users, { fields: [agendaItems.responsibleUserId], references: [users.id] }),
  responsibleStaff: one(staffMembers, { fields: [agendaItems.responsibleStaffId], references: [staffMembers.id] }),
  createdBy: one(users, { fields: [agendaItems.createdByUserId], references: [users.id] })
}));

export const staffMemberRelations = relations(staffMembers, ({ one }) => ({
  diveCenter: one(diveCenters, { fields: [staffMembers.diveCenterId], references: [diveCenters.id] }),
  createdBy: one(users, { fields: [staffMembers.createdByUserId], references: [users.id] })
}));

export const agendaNoticeRelations = relations(agendaNotices, ({ one }) => ({
  diveCenter: one(diveCenters, { fields: [agendaNotices.diveCenterId], references: [diveCenters.id] }),
  createdBy: one(users, { fields: [agendaNotices.createdByUserId], references: [users.id] })
}));

export const expenseCategoryRelations = relations(expenseCategories, ({ one, many }) => ({
  diveCenter: one(diveCenters, { fields: [expenseCategories.diveCenterId], references: [diveCenters.id] }),
  expenses: many(expenses)
}));

export const expenseRelations = relations(expenses, ({ one }) => ({
  diveCenter: one(diveCenters, { fields: [expenses.diveCenterId], references: [diveCenters.id] }),
  category: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
  createdBy: one(users, { fields: [expenses.createdByUserId], references: [users.id] })
}));

export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobType = typeof jobTypeEnum.enumValues[number];
export type JobStatus = typeof jobStatusEnum.enumValues[number];
export type Role = typeof roleEnum.enumValues[number];
export type DiveCenter = typeof diveCenters.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Currency = typeof currencyEnum.enumValues[number];
export type PaymentMethod = typeof paymentMethodEnum.enumValues[number];
export type CommissionStatus = typeof commissionStatusEnum.enumValues[number];
export type ReservationStatus = typeof reservationStatusEnum.enumValues[number];
export type PaymentStatus = typeof paymentStatusEnum.enumValues[number];
export type ProviderPaymentStatus = typeof providerPaymentStatusEnum.enumValues[number];
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpensePaymentMethod = typeof expensePaymentMethodEnum.enumValues[number];
export type AgendaItem = typeof agendaItems.$inferSelect;
export type AgendaNotice = typeof agendaNotices.$inferSelect;
export type StaffMember = typeof staffMembers.$inferSelect;
export type StaffRole = typeof staffRoleEnum.enumValues[number];
export type StaffAffiliation = typeof staffAffiliationEnum.enumValues[number];
