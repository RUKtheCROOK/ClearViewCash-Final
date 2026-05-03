import { Platform } from "react-native";

/**
 * Open Plaid Link and return the public_token. Different SDK on web vs native.
 *  - Native: react-native-plaid-link-sdk
 *  - Web:    Plaid's web Link.js loaded via script tag
 *
 * On web, this dynamically loads the Plaid script if not present. Works for
 * the RN Web export hosted on Vercel.
 */
export async function openPlaidLink(linkToken: string): Promise<string> {
  if (Platform.OS === "web") {
    return openPlaidLinkWeb(linkToken);
  }
  const { create, open, dismissLink } = await import("react-native-plaid-link-sdk");
  return new Promise<string>((resolve, reject) => {
    create({ token: linkToken });
    open({
      onSuccess: (success) => resolve(success.publicToken),
      onExit: (exit) => {
        if (exit.error) reject(new Error(exit.error.errorMessage ?? "user_exited"));
        else reject(new Error("user_exited"));
        dismissLink();
      },
    });
  });
}

async function openPlaidLinkWeb(linkToken: string): Promise<string> {
  await loadPlaidScript();
  return new Promise<string>((resolve, reject) => {
    // @ts-expect-error - Plaid attaches itself globally
    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: (publicToken: string) => resolve(publicToken),
      onExit: (err: { error_message?: string } | null) => {
        if (err) reject(new Error(err.error_message ?? "user_exited"));
        else reject(new Error("user_exited"));
      },
    });
    handler.open();
  });
}

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
