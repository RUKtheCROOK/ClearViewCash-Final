// Income icon disc colors per source-type hue. RN can't render oklch() so we
// precompute hex values for the hues used by the design (matching the web
// IncomeIcon and the bills convention). Income tints are quieter than bills:
// the saturation/chroma is held back by the design ("never solid green").

import type { ThemeMode } from "@cvc/ui";

interface HueColors {
  bg: string;
  fg: string;
}

// Light mode: oklch(94% 0.024 H) bg / oklch(38% 0.055 H) fg
const LIGHT_BG: Record<number, string> = {
  0:   "#f5dcd9", // one-time (red)
  30:  "#f3e5d4", // rental (terracotta)
  75:  "#ecead0", // investment (gold)
  155: "#d3ecda", // paycheck (sage)
  240: "#dde0ef", // freelance (blue)
};
const LIGHT_FG: Record<number, string> = {
  0:   "#6f3a3d",
  30:  "#5a432a",
  75:  "#574c1f",
  155: "#27563b",
  240: "#3c4767",
};

// Dark mode: oklch(28% 0.040 H) bg / oklch(80% 0.070 H) fg
const DARK_BG: Record<number, string> = {
  0:   "#382021",
  30:  "#322618",
  75:  "#2f2a14",
  155: "#152b1e",
  240: "#1c2336",
};
const DARK_FG: Record<number, string> = {
  0:   "#dab9b9",
  30:  "#d3c19f",
  75:  "#ccc191",
  155: "#9bcfae",
  240: "#aebcd9",
};

const FALLBACK_LIGHT: HueColors = { bg: "#e3e6ea", fg: "#37424c" };
const FALLBACK_DARK: HueColors = { bg: "#1d242a", fg: "#aab5c0" };

function nearestHue(target: number, table: Record<number, string>): number {
  const keys = Object.keys(table).map(Number);
  let best = keys[0] ?? 155;
  let bestDist = 360;
  for (const k of keys) {
    const d = Math.min(Math.abs(k - target), 360 - Math.abs(k - target));
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  }
  return best;
}

export function incomeHueColors(hue: number, mode: ThemeMode): HueColors {
  const bgTable = mode === "dark" ? DARK_BG : LIGHT_BG;
  const fgTable = mode === "dark" ? DARK_FG : LIGHT_FG;
  const fb = mode === "dark" ? FALLBACK_DARK : FALLBACK_LIGHT;
  const h = nearestHue(hue, bgTable);
  return { bg: bgTable[h] ?? fb.bg, fg: fgTable[h] ?? fb.fg };
}
