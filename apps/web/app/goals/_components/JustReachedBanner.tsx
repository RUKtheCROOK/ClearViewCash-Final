"use client";

interface Props {
  name: string;
  detail: string;
  onView?: () => void;
}

export function JustReachedBanner({ name, detail, onView }: Props) {
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "14px 16px",
          borderRadius: 14,
          background: "var(--pos-tint)",
          border: "1px solid var(--pos-tint)",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 12,
          alignItems: "center",
        }}
        className="cvc-just-reached"
      >
        <svg
          width={80}
          height={60}
          viewBox="0 0 80 60"
          aria-hidden="true"
          style={{ position: "absolute", right: 0, top: 0, opacity: 0.35, pointerEvents: "none" }}
        >
          <circle cx={20} cy={14} r={1.5} fill="var(--pos)" />
          <circle cx={38} cy={8} r={1} fill="var(--pos)" />
          <circle cx={60} cy={18} r={1.8} fill="var(--pos)" />
          <circle cx={72} cy={38} r={1.2} fill="var(--pos)" />
          <path d="M55 4l1.5 3 3 1.5-3 1.5L55 13l-1.5-3-3-1.5 3-1.5z" fill="var(--pos)" />
        </svg>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "var(--pos)",
            color: "var(--bg-surface)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <CheckIcon />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
            You reached &quot;{name}&quot;
          </div>
          <div style={{ marginTop: 2, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-2)" }}>
            {detail}
          </div>
        </div>
        {onView ? (
          <button
            type="button"
            onClick={onView}
            style={{
              padding: "6px 11px",
              borderRadius: 999,
              background: "var(--pos)",
              color: "var(--bg-surface)",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            View
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}
