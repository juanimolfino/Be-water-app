import { relations, sql } from "drizzle-orm";
import {
  boolean,
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
  saleDate: timestamp("sale_date", { withTimezone: true }).defaultNow().notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  notes: text("notes"),
  validatedByUserId: uuid("validated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
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
  activities: many(activities),
  sales: many(sales)
}));

export const activityRelations = relations(activities, ({ one, many }) => ({
  diveCenter: one(diveCenters, { fields: [activities.diveCenterId], references: [diveCenters.id] }),
  sales: many(sales)
}));

export const saleRelations = relations(sales, ({ one }) => ({
  diveCenter: one(diveCenters, { fields: [sales.diveCenterId], references: [diveCenters.id] }),
  activity: one(activities, { fields: [sales.activityId], references: [activities.id] }),
  seller: one(users, { fields: [sales.sellerId], references: [users.id] }),
  validatedBy: one(users, { fields: [sales.validatedByUserId], references: [users.id] })
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
