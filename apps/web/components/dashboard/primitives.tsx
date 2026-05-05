// Small primitives shared across the web dashboard sections. Kept colocated
// so they don't sprawl into a huge module each.

import type { CSSProperties, ReactNode } from "react";
import { I } from "../../lib/icons";

export function Module({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section style={{ padding: "0 16px", marginTop: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
          padding: "0 4px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ink-2)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </h3>
        {action ? (
          <button
            type="button"
            onClick={onAction}
            style={{
              appearance: "none",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: 2,
            }}
          >
            {action} <I.chevR color="var(--ink-2)" />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  style,
  flush,
}: {
  children: ReactNode;
  style?: CSSProperties;
  flush?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 16,
        padding: flush ? 0 : 16,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PlaceholderCard() {
  return (
    <Card>
      <div style={{ height: 12, width: "60%", background: "var(--skeleton)", borderRadius: 4 }} />
      <div
        style={{
          height: 10,
          width: "40%",
          background: "var(--skeleton)",
          borderRadius: 4,
          marginTop: 10,
        }}
      />
    </Card>
  );
}
