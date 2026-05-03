export default function Privacy() {
  return (
    <main className="container" style={{ padding: "64px 0", maxWidth: 720 }}>
      <h1>Privacy & data handling</h1>
      <p className="muted">
        ClearViewCash uses Plaid to read account balances and transactions on a read-only basis. We never see your bank credentials.
        We never sell or share your data. You can revoke a connection or delete your account at any time from Settings.
      </p>
      <h2>What we store</h2>
      <ul className="muted">
        <li>Account balances and transaction history (read from your bank via Plaid)</li>
        <li>Bills, income events, budgets, goals, and payment links you configure</li>
        <li>Spaces you create and the members you invite</li>
        <li>Subscription state from Stripe (no card numbers)</li>
      </ul>
      <h2>What we never store</h2>
      <ul className="muted">
        <li>Bank usernames or passwords</li>
        <li>Card numbers</li>
        <li>Social security numbers</li>
      </ul>
      <h2>Account deletion</h2>
      <p className="muted">
        Settings → Delete account permanently removes your data, revokes all Plaid connections, and cancels any active Stripe subscription.
      </p>
    </main>
  );
}
