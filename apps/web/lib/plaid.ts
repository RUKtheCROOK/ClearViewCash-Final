// Slim Plaid Link wrapper for the web app. Mirrors the web branch of
// apps/mobile/lib/plaid.ts without the React-Native SDK fallback.

let scriptPromise: Promise<void> | null = null;

async function loadPlaidScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="plaid.com/link"]');
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("plaid_script_failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function openPlaidLink(linkToken: string): Promise<string> {
  await loadPlaidScript();
  return new Promise<string>((resolve, reject) => {
    const handler = (window as unknown as {
      Plaid: {
        create: (cfg: {
          token: string;
          onSuccess: (publicToken: string) => void;
          onExit: (err: { error_message?: string } | null) => void;
        }) => { open: () => void };
      };
    }).Plaid.create({
      token: linkToken,
      onSuccess: (publicToken: string) => resolve(publicToken),
      onExit: (err) => {
        if (err) reject(new Error(err.error_message ?? "user_exited"));
        else reject(new Error("user_exited"));
      },
    });
    handler.open();
  });
}

interface SupabaseClientLike {
  auth: {
    getSession: () => Promise<{ data: { session: { access_token: string } | null } }>;
  };
}

// Drives the full Plaid reconnect flow for one broken item:
//   1) fetch an update-mode link_token for the item
//   2) open Plaid Link
//   3) trigger a sync once Link succeeds
// Resolves silently on user_exited so callers can no-op on that case.
export async function reconnectPlaidItem(
  supabase: SupabaseClientLike,
  itemRowId: string,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("not_signed_in");

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const tokenRes = await fetch(`${baseUrl}/functions/v1/plaid-link-token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ plaid_item_row_id: itemRowId }),
  });
  const tokenJson = (await tokenRes.json()) as { link_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.link_token) {
    throw new Error(tokenJson.error ?? "could_not_start_reconnect");
  }

  await openPlaidLink(tokenJson.link_token);

  await fetch(`${baseUrl}/functions/v1/plaid-sync`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ plaid_item_row_id: itemRowId }),
  });
}
