// Mirror of packages/types/src/plaid.ts — Edge Functions cannot import outside
// supabase/functions/. Keep in sync.
import { z } from "npm:zod@^3.23.8";

export const PlaidWebhookSchema = z.object({
  webhook_type: z.enum(["TRANSACTIONS", "ITEM"]),
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
