import Link from "next/link";
import { notFound } from "next/navigation";
import { findStateEntry } from "../../../../components/states/screens";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StatePreviewPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") notFound();

  const { id } = await params;
  const entry = findStateEntry(id);
  if (!entry) notFound();

  const { Component, name, category } = entry;

  return (
    <div style={{ background: "var(--bg-canvas)", minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "10px 16px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href="/dev/states"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-2)",
            textDecoration: "none",
          }}
        >
          ← Gallery
        </Link>
        <div
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {category}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
          {name}
        </div>
      </div>
      <Component />
    </div>
  );
}
