import { z } from "zod";

export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

export const MoneyCentsSchema = z.number().int().finite();
export type MoneyCents = number;

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type IsoDate = string;

export const SpaceKindSchema = z.enum(["personal", "shared"]);
export type SpaceKind = z.infer<typeof SpaceKindSchema>;

export const SpaceSchema = z.object({
  id: UuidSchema,
  owner_user_id: UuidSchema,
  name: z.string().min(1).max(64),
  tint: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  kind: SpaceKindSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Space = z.infer<typeof SpaceSchema>;

export const SpaceRoleSchema = z.enum(["owner", "member"]);
export type SpaceRole = z.infer<typeof SpaceRoleSchema>;

export const SpaceMemberSchema = z.object({
  space_id: UuidSchema,
  user_id: UuidSchema.nullable(),
  role: SpaceRoleSchema,
  invited_email: z.string().email().nullable(),
  accepted_at: z.string().nullable(),
});
export type SpaceMember = z.infer<typeof SpaceMemberSchema>;

export const AccountTypeSchema = z.enum(["depository", "credit", "loan", "investment", "other"]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountSchema = z.object({
  id: UuidSchema,
  plaid_item_id: UuidSchema,
  owner_user_id: UuidSchema,
  plaid_account_id: z.string(),
  name: z.string(),
  mask: z.string().nullable(),
  type: AccountTypeSchema,
  subtype: z.string().nullable(),
  current_balance: MoneyCentsSchema.nullable(),
  available_balance: MoneyCentsSchema.nullable(),
  currency: z.string().length(3),
});
export type Account = z.infer<typeof AccountSchema>;

export const AccountShareSchema = z.object({
  account_id: UuidSchema,
  space_id: UuidSchema,
  share_balances: z.boolean(),
  share_transactions: z.boolean(),
});
export type AccountShare = z.infer<typeof AccountShareSchema>;

export const TransactionSchema = z.object({
  id: UuidSchema,
  account_id: UuidSchema,
  owner_user_id: UuidSchema,
  plaid_transaction_id: z.string(),
  posted_at: z.string(),
  amount: MoneyCentsSchema,
  merchant_name: z.string().nullable(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  note: z.string().nullable(),
  is_recurring: z.boolean(),
  recurring_group_id: UuidSchema.nullable(),
  pending: z.boolean(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const CadenceSchema = z.enum(["monthly", "weekly", "biweekly", "yearly", "custom"]);
export type Cadence = z.infer<typeof CadenceSchema>;

export const BillSchema = z.object({
  id: UuidSchema,
  space_id: UuidSchema,
  owner_user_id: UuidSchema,
  name: z.string(),
  amount: MoneyCentsSchema,
  due_day: z.number().int().min(1).max(31),
  cadence: CadenceSchema,
  next_due_at: IsoDateSchema,
  autopay: z.boolean(),
  linked_account_id: UuidSchema.nullable(),
  source: z.enum(["detected", "manual"]),
  recurring_group_id: UuidSchema.nullable(),
});
export type Bill = z.infer<typeof BillSchema>;

export const IncomeEventSchema = BillSchema.extend({});
export type IncomeEvent = z.infer<typeof IncomeEventSchema>;

export const PaymentLinkCardSchema = z.object({
  payment_link_id: UuidSchema,
  card_account_id: UuidSchema,
  split_pct: z.number().min(0).max(100),
});
export type PaymentLinkCard = z.infer<typeof PaymentLinkCardSchema>;

export const PaymentLinkSchema = z.object({
  id: UuidSchema,
  owner_user_id: UuidSchema,
  funding_account_id: UuidSchema,
  name: z.string(),
  cross_space: z.boolean().default(false),
  cards: z.array(PaymentLinkCardSchema),
});
export type PaymentLink = z.infer<typeof PaymentLinkSchema>;

export const BudgetSchema = z.object({
  id: UuidSchema,
  space_id: UuidSchema,
  category: z.string(),
  period: z.enum(["monthly", "weekly"]),
  limit_amount: MoneyCentsSchema,
  rollover: z.boolean(),
});
export type Budget = z.infer<typeof BudgetSchema>;

export const GoalSchema = z.object({
  id: UuidSchema,
  space_id: UuidSchema,
  kind: z.enum(["save", "payoff"]),
  name: z.string(),
  target_amount: MoneyCentsSchema,
  target_date: IsoDateSchema.nullable(),
  linked_account_id: UuidSchema.nullable(),
  monthly_contribution: MoneyCentsSchema.nullable(),
});
export type Goal = z.infer<typeof GoalSchema>;
