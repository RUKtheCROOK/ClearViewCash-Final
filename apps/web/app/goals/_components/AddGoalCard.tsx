"use client";

interface Props {
  onClick: () => void;
}

export function AddGoalCard({ onClick }: Props) {
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: "100%",
          padding: 18,
          borderRadius: 14,
          background: "var(--bg-surface)",
          border: "1.5px dashed var(--line-firm)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "var(--ink-2)",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          fontWeight: 500,
        }}
      >
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New goal
      </button>
    </div>
  );
}
