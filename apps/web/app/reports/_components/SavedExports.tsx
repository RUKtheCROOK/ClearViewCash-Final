"use client";

import { CsvIcon, ChevRightIcon, PdfIcon, ShareIcon } from "./reportGlyphs";
import type { SavedExport } from "./savedExportsStore";

interface Props {
  exports: SavedExport[];
}

const FMT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function SavedExports({ exports }: Props) {
  if (exports.length === 0) return null;
  return (
    <>
      <div
        style={{
          padding: "18px 18px 8px",
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink-1)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Saved exports
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-num)",
            fontSize: 11,
            color: "var(--ink-3)",
          }}
        >
          {exports.length}
        </span>
      </div>
      <div
        style={{
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--line-soft)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        {exports.map((e, i) => {
          const when = (() => {
            const d = new Date(e.savedAt);
            return Number.isNaN(d.getTime()) ? "" : FMT_DATE.format(d);
          })();
          return (
            <div
              key={e.id}
              style={{
                padding: "12px 18px",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: 12,
                alignItems: "center",
                borderBottom: i === exports.length - 1 ? "none" : "1px solid var(--line-soft)",
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
                {e.format === "PDF" ? <PdfIcon size={20} /> : <CsvIcon size={20} />}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    color: "var(--ink-1)",
                    fontWeight: 500,
                  }}
                >
                  {e.name}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
                  {when} · {e.format}
                </div>
              </div>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  color: "var(--ink-3)",
                }}
              >
                <ShareIcon />
              </span>
              <ChevRightIcon color="var(--ink-3)" />
            </div>
          );
        })}
      </div>
    </>
  );
}
