import { Configuration, PlaidApi, PlaidEnvironments } from "npm:plaid@^29.0.0";

let cached: PlaidApi | null = null;

export function plaidClient(): PlaidApi {
  if (cached) return cached;
  const env = Deno.env.get("PLAID_ENV") ?? "sandbox";
  const cfg = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": Deno.env.get("PLAID_CLIENT_ID") ?? "",
        "PLAID-SECRET": Deno.env.get("PLAID_SECRET") ?? "",
      },
    },
  });
  cached = new PlaidApi(cfg);
  return cached;
}

export function plaidAmountToCents(amount: number): number {
  // Plaid returns dollars as float. Convert to integer cents and flip sign:
  // Plaid: positive = outflow. Our convention: negative = outflow.
  return Math.round(amount * -100);
}
