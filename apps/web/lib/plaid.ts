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
