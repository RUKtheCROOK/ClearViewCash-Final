import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { forecast } from "../_shared/forecast.ts";

/**
 * Nightly job (Supabase scheduled trigger): for each user, recompute the
 * 14-day forecast and write notifications for each low-balance day that
 * doesn't already have one. Idempotent on (user_id, kind, payload->>'date').
 *
 * Schedule via pg_cron after deploy:
 *   select cron.schedule(
 *     'forecast-recompute-daily',
 *     '0 8 * * *',  -- 08:00 UTC every day
 *     $$ select net.http_post(
 *          url := 'https://<project>.functions.supabase.co/forecast-recompute',
 *          headers := jsonb_build_object('Authorization', 'Bearer ' || vault_get('SERVICE_ROLE_KEY'))
 *        ) $$
 *   );
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const supa = adminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: users } = await supa.from("users").select("id, default_space_id");
  if (!users) return jsonResponse({ ok: true, users: 0 });

  let flagged = 0;
  for (const u of users) {
    if (!u.default_space_id) continue;

    const [accountsRes, billsRes, incomeRes, linksRes, cardsRes] = await Promise.all([
      supa.from("accounts").select("*").eq("owner_user_id", u.id),
      supa.from("bills").select("*").eq("space_id", u.default_space_id),
      supa.from("income_events").select("*").eq("space_id", u.default_space_id),
      supa.from("payment_links").select("*").eq("owner_user_id", u.id),
      supa.from("payment_link_cards").select("*"),
    ]);

    const accounts = accountsRes.data ?? [];
    const fundingAccounts = accounts.filter((a) => a.type === "depository");
    const cardAccounts = accounts.filter((a) => a.type === "credit");

    if (fundingAccounts.length === 0) continue;

    const links = (linksRes.data ?? []).map((pl) => ({
      ...pl,
      cards: (cardsRes.data ?? []).filter((c) => c.payment_link_id === pl.id),
    }));

    const result = forecast({
      startDate: today,
      horizonDays: 14,
      fundingBalances: fundingAccounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
      cardBalances: cardAccounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
      bills: (billsRes.data ?? []) as never,
      incomeEvents: (incomeRes.data ?? []) as never,
      paymentLinks: links as never,
      lowBalanceThreshold: 0,
    });

    for (const day of result.lowBalanceDays) {
      // Idempotent: only insert if no existing low_balance notification for this day.
      const { data: existing } = await supa
        .from("notifications")
        .select("id")
        .eq("user_id", u.id)
        .eq("kind", "low_balance")
        .filter("payload->>date", "eq", day)
        .maybeSingle();
      if (!existing) {
        await supa.from("notifications").insert({
          user_id: u.id,
          kind: "low_balance",
          payload: { date: day },
        });
        flagged++;
      }
    }
  }

  return jsonResponse({ ok: true, users: users.length, flagged });
});
