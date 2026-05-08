"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevRightIcon,
  CloseIcon,
  CsvIcon,
  DownloadIcon,
  PdfIcon,
  ShareIcon,
} from "./reportGlyphs";

export type ExportFormat = "PDF" | "CSV";

export interface ExportIncludeFlags {
  chart: boolean;
  table: boolean;
  txnDetail: boolean;
  cover: boolean;
}

export interface ExportSheetProps {
  open: boolean;
  onClose: () => void;
  /** Report title (e.g. "Spending by Category"). */
  title: string;
  /** Active range label (e.g. "This month"). */
  rangeLabel: string;
  /** Range sub copy (e.g. "May 1 – May 31, 2025 · 31 days"). */
  rangeSub: string;
  /** Data summary (e.g. "Personal space · 116 transactions across 8 categories"). */
  dataSummary: string;
  /** Default destination email if known. */
  accountantEmail?: string | null;
  /** Default filename stem (no extension). */
  filenameStem: string;
  /** Approx page count when exporting PDF. */
  approxPages?: number;
  /** Approx file size string (e.g. "~284 KB"). */
  approxSize?: string;
  onChangeRange?: () => void;
  /** Called with the selected format + flags when the user confirms. */
  onGenerate: (format: ExportFormat, include: ExportIncludeFlags) => Promise<void> | void;
}

export function ExportSheet({
  open,
  onClose,
  title,
  rangeLabel,
  rangeSub,
  dataSummary,
  accountantEmail,
  filenameStem,
  approxPages = 4,
  approxSize = "~284 KB",
  onChangeRange,
  onGenerate,
}: ExportSheetProps) {
  const [format, setFormat] = useState<ExportFormat>("PDF");
  const [include, setInclude] = useState<ExportIncludeFlags>({
    chart: true,
    table: true,
    txnDetail: true,
    cover: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filename = `${filenameStem}.${format.toLowerCase()}`;
  const ext = format === "PDF" ? "PDF" : "CSV";
  const tags = [
    include.chart ? "Chart" : null,
    include.table ? "Table" : null,
    include.txnDetail ? "Txns" : null,
    include.cover ? "Cover" : null,
  ].filter(Boolean) as string[];

  async function handleGenerate() {
    setBusy(true);
    try {
      await onGenerate(format, include);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Export ${title}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(20,22,26,0.45)",
          border: 0,
          padding: 0,
          cursor: "pointer",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          background: "var(--bg-canvas)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -12px 36px rgba(0,0,0,0.18)",
          padding: "10px 0 28px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "grid", placeItems: "center", padding: "4px 0 6px" }}>
          <span
            style={{
              width: 38,
              height: 4,
              borderRadius: 999,
              background: "var(--line-firm)",
            }}
          />
        </div>

        <div style={{ padding: "4px 18px 10px", display: "flex", alignItems: "center" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              EXPORT
            </div>
            <h2
              style={{
                margin: "2px 0 0",
                fontFamily: "var(--font-ui)",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--ink-1)",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "var(--bg-tinted)",
              border: 0,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--ink-2)",
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <Section label="FORMAT">
            <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FormatCard
                kind="PDF"
                name="PDF"
                sub="Formatted · share-ready"
                tag="FOR ACCOUNTANT"
                selected={format === "PDF"}
                onSelect={() => setFormat("PDF")}
              />
              <FormatCard
                kind="CSV"
                name="CSV"
                sub="Raw rows · for spreadsheets"
                tag="DATA"
                selected={format === "CSV"}
                onSelect={() => setFormat("CSV")}
              />
            </div>
          </Section>

          <Section label="DATE RANGE">
            <div style={{ padding: "0 16px" }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
                      {rangeLabel}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-num)",
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginTop: 2,
                      }}
                    >
                      {rangeSub}
                    </div>
                  </div>
                  {onChangeRange ? (
                    <button
                      type="button"
                      onClick={onChangeRange}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "var(--bg-tinted)",
                        color: "var(--ink-2)",
                        border: 0,
                        cursor: "pointer",
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        fontWeight: 500,
                      }}
                    >
                      Change
                    </button>
                  ) : null}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid var(--line-soft)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    lineHeight: 1.55,
                  }}
                >
                  {dataSummary}
                </div>
              </div>
            </div>
          </Section>

          <Section label="INCLUDE">
            <div style={{ padding: "0 16px" }}>
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <ToggleRow
                  title="Chart visualization"
                  sub={format === "PDF" ? "Render the chart on page 1" : "CSV is data only"}
                  on={include.chart}
                  disabled={format === "CSV"}
                  onChange={(v) => setInclude((s) => ({ ...s, chart: v }))}
                />
                <ToggleRow
                  title="Data table"
                  sub="All rows with totals"
                  on={include.table}
                  onChange={(v) => setInclude((s) => ({ ...s, table: v }))}
                />
                <ToggleRow
                  title="Transaction-level detail"
                  sub="Adds individual rows · accountant view"
                  on={include.txnDetail}
                  onChange={(v) => setInclude((s) => ({ ...s, txnDetail: v }))}
                />
                <ToggleRow
                  title="Cover page"
                  sub="Logo, range, space, signature line"
                  on={include.cover}
                  disabled={format === "CSV"}
                  last
                  onChange={(v) => setInclude((s) => ({ ...s, cover: v }))}
                />
              </div>
            </div>
          </Section>

          <Section label="PREVIEW">
            <div style={{ padding: "0 16px" }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <MiniDocPreview format={format} />
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
                    {filename}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-num)",
                      fontSize: 10.5,
                      color: "var(--ink-3)",
                      marginTop: 2,
                    }}
                  >
                    {format === "PDF" ? `${approxPages} pages · ${approxSize}` : `Raw data · ${ext}`}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {tags.map((t) => (
                      <Tag key={t} txt={t} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section label="WHERE TO">
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Destination
                icon={<ShareIcon />}
                title="Share via…"
                sub="AirDrop, Mail, Messages"
                disabled
              />
              <Destination
                icon={<DownloadIcon />}
                title="Save to Files"
                sub="iCloud · Documents"
                disabled
              />
              <Destination
                icon={<PdfIcon size={20} />}
                title="Email to my accountant"
                sub={accountantEmail ?? "Add an email in settings"}
                hint={accountantEmail ? "ON FILE" : undefined}
                disabled
              />
            </div>
          </Section>
        </div>

        <div
          style={{
            padding: "12px 16px 0",
            borderTop: "1px solid var(--line-soft)",
            background: "var(--bg-canvas)",
          }}
        >
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: 0,
              cursor: busy ? "default" : "pointer",
              background: "var(--brand)",
              color: "var(--brand-on)",
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: busy ? 0.7 : 1,
            }}
          >
            <ShareIcon /> {busy ? "Generating…" : `Generate ${format} & share`}
          </button>
          <div
            style={{
              marginTop: 8,
              textAlign: "center",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-3)",
            }}
          >
            Saves to <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>Saved exports</span> automatically.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          padding: "0 18px 6px",
          fontFamily: "var(--font-num)",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function FormatCard({
  kind,
  name,
  sub,
  tag,
  selected,
  onSelect,
}: {
  kind: ExportFormat;
  name: string;
  sub: string;
  tag: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        padding: 14,
        borderRadius: 14,
        background: selected ? "var(--brand-tint)" : "var(--bg-surface)",
        border: `${selected ? 1.5 : 1}px solid ${selected ? "var(--brand)" : "var(--line-soft)"}`,
        position: "relative",
        textAlign: "left",
        cursor: "pointer",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--bg-surface)",
            color: selected ? "var(--brand)" : "var(--ink-2)",
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--line-soft)",
          }}
        >
          {kind === "PDF" ? <PdfIcon /> : <CsvIcon />}
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-num)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink-1)",
              letterSpacing: "0.02em",
            }}
          >
            {name}
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            width: 20,
            height: 20,
            borderRadius: 999,
            border: `2px solid ${selected ? "var(--brand)" : "var(--line-firm)"}`,
            background: selected ? "var(--brand)" : "transparent",
            display: "grid",
            placeItems: "center",
          }}
        >
          {selected ? <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--bg-surface)" }} /> : null}
        </span>
      </div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.45 }}>
        {sub}
      </div>
      <div
        style={{
          marginTop: 8,
          display: "inline-flex",
          padding: "2px 8px",
          borderRadius: 999,
          background: "var(--bg-surface)",
          color: "var(--ink-3)",
          fontFamily: "var(--font-num)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.06em",
        }}
      >
        {tag}
      </div>
    </button>
  );
}

function ToggleRow({
  title,
  sub,
  on,
  disabled,
  last,
  onChange,
}: {
  title: string;
  sub: string;
  on: boolean;
  disabled?: boolean;
  last?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px 16px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
        background: "transparent",
        border: 0,
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        color: "inherit",
      }}
    >
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
      <span
        style={{
          width: 40,
          height: 24,
          borderRadius: 999,
          background: on ? "var(--brand)" : "var(--line-firm)",
          position: "relative",
          display: "inline-block",
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "white",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }}
        />
      </span>
    </button>
  );
}

function Destination({
  icon,
  title,
  sub,
  hint,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  hint?: string;
  disabled?: boolean;
}) {
  // NOTE: Destinations are visual-only for now. The "Generate" CTA at the bottom
  // of the sheet handles the actual export via the existing share/download flow.
  // When real destinations are wired up (email, Files, native share), add an
  // onClick prop and remove the disabled fallback.
  return (
    <div
      aria-disabled={disabled}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 12,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 12,
        alignItems: "center",
        textAlign: "left",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--bg-tinted)",
          color: "var(--ink-2)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
      {hint ? (
        <span
          style={{
            padding: "2px 7px",
            borderRadius: 999,
            background: "var(--brand-tint)",
            color: "var(--brand)",
            fontFamily: "var(--font-num)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}
        >
          {hint}
        </span>
      ) : (
        <span />
      )}
      <ChevRightIcon color="var(--ink-3)" />
    </div>
  );
}

function Tag({ txt }: { txt: string }) {
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: 999,
        background: "var(--bg-tinted)",
        color: "var(--ink-3)",
        fontFamily: "var(--font-num)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      {txt}
    </span>
  );
}

function MiniDocPreview({ format }: { format: ExportFormat }) {
  return (
    <div
      style={{
        width: 60,
        height: 78,
        borderRadius: 4,
        background: "oklch(98% 0.005 90)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        position: "relative",
        flexShrink: 0,
        border: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          height: 8,
          background: format === "PDF" ? "oklch(36% 0.045 195)" : "oklch(48% 0.090 155)",
          borderRadius: "4px 4px 0 0",
        }}
      />
      <div style={{ padding: 5 }}>
        <div style={{ height: 3, width: "70%", background: "oklch(70% 0.008 220)", borderRadius: 1 }} />
        <div style={{ height: 2, width: "50%", background: "oklch(80% 0.006 220)", borderRadius: 1, marginTop: 3 }} />
        {format === "PDF" ? (
          <svg width={50} height={34} viewBox="0 0 50 34" style={{ marginTop: 5 }}>
            <circle cx={14} cy={17} r={11} fill="none" stroke="oklch(58% 0.110 30)" strokeWidth={6} />
            <circle
              cx={14}
              cy={17}
              r={11}
              fill="none"
              stroke="oklch(56% 0.090 145)"
              strokeWidth={6}
              strokeDasharray="20 50"
            />
            <rect x={30} y={6} width={18} height={2} fill="oklch(85% 0.006 220)" />
            <rect x={30} y={11} width={14} height={2} fill="oklch(85% 0.006 220)" />
            <rect x={30} y={16} width={16} height={2} fill="oklch(85% 0.006 220)" />
            <rect x={30} y={21} width={12} height={2} fill="oklch(85% 0.006 220)" />
          </svg>
        ) : (
          <div style={{ marginTop: 5 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: 2,
                  width: i % 2 === 0 ? "85%" : "60%",
                  background: "oklch(82% 0.006 220)",
                  borderRadius: 1,
                  marginTop: 3,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
