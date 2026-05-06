// Budget category icon disc colors per hue. RN can't render oklch() so we
// precompute hex values for the hues used by the design (matching the bills
// convention).

import type { ThemeMode } from "@cvc/ui";

interface HueColors {
  bg: string;
  fg: string;
}

// oklch(94% 0.024 H) light bg / oklch(38% 0.060 H) light fg
const LIGHT_BG: Record<number, string> = {
  0:   "#f5dcd9", // health
  30:  "#f3e5d4", // food & dining
  75:  "#ecead0", // utilities
  80:  "#ebebd2", // pet care
  145: "#d3ecda", // groceries
  195: "#d2ecec", // learning
  220: "#dde0ef", // transport
  240: "#dee0ef", // home goods
  270: "#e7dff3", // entertainment
  305: "#efddee", // subscriptions
  320: "#f1dce7", // shopping
};
const LIGHT_FG: Record<number, string> = {
  0:   "#6f3a3d",
  30:  "#5a432a",
  75:  "#574c1f",
  80:  "#52511f",
  145: "#27563b",
  195: "#1f4f50",
  220: "#3c4767",
  240: "#3a4566",
  270: "#4a3868",
  305: "#5a3358",
  320: "#612e44",
};

// oklch(28% 0.040 H) dark bg / oklch(80% 0.075 H) dark fg
const DARK_BG: Record<number, string> = {
  0:   "#382021",
  30:  "#322618",
  75:  "#2f2a14",
  80:  "#2e2a14",
  145: "#152b1e",
  195: "#152b2c",
  220: "#1c2336",
  240: "#1d2336",
  270: "#251a37",
  305: "#321939",
  320: "#371927",
};
const DARK_FG: Record<number, string> = {
  0:   "#dab9b9",
  30:  "#d3c19f",
  75:  "#ccc191",
  80:  "#c8c592",
  145: "#9bcfae",
  195: "#9ed1d2",
  220: "#aebcd9",
  240: "#abbad7",
  270: "#bdaadb",
  305: "#d2a5d5",
  320: "#dca4bc",
};

const FALLBACK_LIGHT: HueColors = { bg: "#e3e6ea", fg: "#37424c" };
const FALLBACK_DARK: HueColors = { bg: "#1d242a", fg: "#aab5c0" };

function nearestHue(target: number, table: Record<number, string>): number {
  const keys = Object.keys(table).map(Number);
  let best = keys[0] ?? 220;
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

export function categoryHueColors(hue: number, mode: ThemeMode): HueColors {
  const bgTable = mode === "dark" ? DARK_BG : LIGHT_BG;
  const fgTable = mode === "dark" ? DARK_FG : LIGHT_FG;
  const fb = mode === "dark" ? FALLBACK_DARK : FALLBACK_LIGHT;
  const h = nearestHue(hue, bgTable);
  return { bg: bgTable[h] ?? fb.bg, fg: fgTable[h] ?? fb.fg };
}
