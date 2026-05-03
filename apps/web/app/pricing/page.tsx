import Link from "next/link";

export default function Pricing() {
  return (
    <main className="container" style={{ padding: "64px 0" }}>
      <h1 style={{ textAlign: "center" }}>Pricing</h1>
      <p className="muted" style={{ textAlign: "center", maxWidth: 600, marginInline: "auto" }}>
        Start free. Upgrade when you want forecasting, payment links, and shared spaces.
      </p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 48 }}>
        <Plan
          name="Starter"
          price="$0"
          features={["1 space", "2 linked accounts", "Basic transactions & budgets", "14-day Pro trial"]}
          cta="Start free"
        />
        <Plan
          name="Personal Pro"
          price="$9.99 / mo"
          features={["Unlimited accounts", "3 spaces", "Cash Flow Forecast", "Goals, Bills, Budgets, Reports", "Alerts"]}
          cta="Start Pro"
          highlight
        />
        <Plan
          name="Household"
          price="$14.99 / mo"
          features={["Everything in Pro", "Unlimited spaces", "5 members per space", "Advanced sharing", "Priority support"]}
          cta="Start Household"
        />
      </section>
    </main>
  );
}

function Plan({ name, price, features, cta, highlight }: { name: string; price: string; features: string[]; cta: string; highlight?: boolean }) {
  return (
    <div className="card" style={{ borderColor: highlight ? "var(--primary)" : "var(--border)", borderWidth: highlight ? 2 : 1 }}>
      <h3 style={{ marginTop: 0 }}>{name}</h3>
      <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 16px" }}>{price}</p>
      <ul className="muted" style={{ paddingLeft: 18, marginBottom: 24 }}>
        {features.map((f) => (<li key={f}>{f}</li>))}
      </ul>
      <Link href="/sign-up" className="btn btn-primary" style={{ width: "100%", display: "flex" }}>{cta}</Link>
    </div>
  );
}
