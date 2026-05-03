import { z } from "zod";

export const PlaidWebhookCodeSchema = z.enum([
  "SYNC_UPDATES_AVAILABLE",
  "DEFAULT_UPDATE",
  "INITIAL_UPDATE",
  "HISTORICAL_UPDATE",
  "ERROR",
  "PENDING_EXPIRATION",
  "USER_PERMISSION_REVOKED",
]);
export type PlaidWebhookCode = z.infer<typeof PlaidWebhookCodeSchema>;

export const PlaidWebhookTypeSchema = z.enum(["TRANSACTIONS", "ITEM"]);

export const PlaidWebhookSchema = z.object({
  webhook_type: PlaidWebhookTypeSchema,
  webhook_code: z.string(),
  item_id: z.string(),
  error: z
    .object({
      error_code: z.string(),
      error_message: z.string().optional(),
    })
    .nullish(),
  new_transactions: z.number().optional(),
  environment: z.string().optional(),
});
export type PlaidWebhook = z.infer<typeof PlaidWebhookSchema>;
