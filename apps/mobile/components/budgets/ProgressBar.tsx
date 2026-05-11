import { View } from "react-native";
import type { Palette } from "@cvc/ui";

export type ProgressState = "normal" | "near" | "over";

export function classifyState(spent: number, limit: number): ProgressState {
  if (limit <= 0) return "normal";
  if (spent > limit) return "over";
  if (spent / limit >= 0.85) return "near";
  return "normal";
}

interface Props {
  palette: Palette;
  spent: number;
  limit: number;
  height?: number;
}

/**
 * Calm progress bar. Three states inferred from spent/limit:
 *   normal — brand fill
 *   near   — accent (gold) fill at ≥85%
 *   over   — warn fill, with a soft hatched tail past the limit so the
 *            "over" portion reads as a zone rather than a blaring red bar
 */
export function ProgressBar({ palette, spent, limit, height = 6 }: Props) {
  const state = classifyState(spent, limit);
  const isOver = state === "over";
  const isNear = state === "near";
  const pct = limit > 0 ? Math.min(120, (spent / limit) * 100) : 0;
  const visualPct = isOver ? Math.min(100, (limit / spent) * 100) : pct;

  const fillColor = isOver ? palette.warn : isNear ? palette.accent : palette.brand;
  const fillOpacity = isOver ? 0.85 : isNear ? 0.85 : 0.78;

  return (
    <View
      style={{
        position: "relative",
        height,
        borderRadius: 999,
        backgroundColor: palette.tinted,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${visualPct}%`,
          backgroundColor: fillColor,
          opacity: fillOpacity,
        }}
      />
      {isOver ? (
        <>
          <View
            style={{
              position: "absolute",
              left: `${visualPct}%`,
              top: 0,
              bottom: 0,
              right: 0,
              backgroundColor: palette.warnTint,
              opacity: 0.9,
            }}
          />
          {/* Notch at the 100% boundary so "over" reads as a zone, not just a hue shift */}
          <View
            style={{
              position: "absolute",
              left: `${visualPct}%`,
              top: -1,
              bottom: -1,
              width: 1.5,
              marginLeft: -0.75,
              backgroundColor: palette.warn,
            }}
          />
        </>
      ) : null}
    </View>
  );
}
