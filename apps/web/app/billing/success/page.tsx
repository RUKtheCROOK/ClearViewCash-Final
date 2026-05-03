import Link from "next/link";

/**
 * Stripe Checkout success return page. The webhook handler is the source of
 * truth for subscription state — this page just confirms and deep-links back
 * into the app on mobile or to the dashboard on web.
 */
export default function BillingSuccess() {
  const appScheme = process.env.NEXT_PUBLIC_APP_SCHEME ?? "clearviewcash";
  return (
    <main className="container" style={{ padding: "80px 0", textAlign: "center" }}>
      <h1>You're in.</h1>
      <p className="muted">Your subscription is active. The app should reflect your new plan within a few seconds.</p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 32 }}>
        <Link href={`${appScheme}://dashboard`} className="btn btn-primary">Open the app</Link>
        <Link href="/dashboard" className="btn btn-secondary">Continue on web</Link>
      </div>
    </main>
  );
}
