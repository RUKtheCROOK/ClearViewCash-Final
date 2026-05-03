import Link from "next/link";

export default function Landing() {
  return (
    <main>
      <header className="container" style={{ display: "flex", padding: "24px 0", justifyContent: "space-between", alignItems: "center" }}>
        <strong>ClearViewCash</strong>
        <nav style={{ display: "flex", gap: 24 }}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up" className="btn btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="container" style={{ padding: "80px 0", textAlign: "center" }}>
        <h1 style={{ fontSize: 56, lineHeight: 1.05, margin: 0 }}>See what you actually have.</h1>
        <p className="muted" style={{ fontSize: 20, marginTop: 24, maxWidth: 640, marginInline: "auto" }}>
          ClearViewCash subtracts your linked credit card balances from your checking — live. So the number on your dashboard is the money you can actually spend.
        </p>
        <div style={{ marginTop: 32, display: "flex", gap: 16, justifyContent: "center" }}>
          <Link href="/sign-up" className="btn btn-primary">Start free — no card</Link>
          <Link href="/pricing" className="btn btn-secondary">See pricing</Link>
        </div>
      </section>

      <section className="container" style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(3, 1fr)", paddingBottom: 80 }}>
        <Feature title="Effective Available" body="Your funding balance minus all linked credit card balances. Live, every time you open the app." />
        <Feature title="Spaces, not joint accounts" body="You own your accounts. Choose what to share — by account, by transaction. Toggle My View ⇄ Shared View on every screen." />
        <Feature title="Cash flow you can see" body="Project balances forward using bills, income, and card payments. Run what-ifs. Know before a low-balance day happens." />
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="muted" style={{ margin: 0 }}>{body}</p>
    </div>
  );
}
