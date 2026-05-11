import Link from "next/link";
import { notFound } from "next/navigation";
import { STATE_ENTRIES, type StateCategory } from "../../../components/states/screens";

const CATEGORY_LABELS: Record<StateCategory, string> = {
  empty: "Empty",
  error: "Error",
  edge: "Edge cases",
  permission: "Permission",
};

const ORDER: StateCategory[] = ["empty", "error", "edge", "permission"];

export default function StatesGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div style={{ padding: "32px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-ui)",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ink-1)",
        }}
      >
        State screens
      </h1>
      <p style={{ margin: "8px 0 24px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-3)" }}>
        Dev-only gallery of the 16 state screens. Pick one to preview.
      </p>

      {ORDER.map((cat) => {
        const items = STATE_ENTRIES.filter((e) => e.category === cat);
        return (
          <section key={cat} style={{ marginTop: 24 }}>
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.10em",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {CATEGORY_LABELS[cat].toUpperCase()}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {items.map((e) => (
                <Link
                  key={e.id}
                  href={`/dev/states/${e.id}`}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--line-soft)",
                    color: "var(--ink-1)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {e.name}
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginTop: 2 }}>{e.id}</div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
