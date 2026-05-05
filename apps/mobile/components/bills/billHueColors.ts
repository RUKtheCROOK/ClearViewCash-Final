// Bill icon disc colors per hue. RN can't render oklch() so we precompute
// hex values for the hues used by the design (matching the web BillIcon).

import type { ThemeMode } from "@cvc/ui";

interface HueColors {
  bg: string;
  fg: string;
}

// oklch(94% 0.030 H) light bg / oklch(38% 0.060 H) light fg
// oklch(28% 0.045 H) dark bg / oklch(80% 0.075 H) dark fg
const LIGHT_BG: Record<number, string> = {
  0: "#ffe2dc",
  5: "#ffe1d5",
  25: "#fbe6cf",
  30: "#faead2",
  75: "#f4ecc4",
  155: "#cbeed4",
  195: "#cdebed",
  220: "#dbe5f0",
  240: "#dfe3f5",
  285: "#eaddf4",
  320: "#fadce4",
};
const LIGHT_FG: Record<number, string> = {
  0: "#76333c",
  5: "#7a3530",
  25: "#5e3d20",
  30: "#604226",
  75: "#5d4d12",
  155: "#1f5234",
  195: "#1f4f50",
  220: "#324658",
  240: "#3a4666",
  285: "#4d345e",
  320: "#5d2c44",
};
const DARK_BG: Record<number, string> = {
  0: "#3a1a1f",
  5: "#3b1c19",
  25: "#33240e",
  30: "#322712",
  75: "#322a09",
  155: "#0f2a18",
  195: "#0a2929",
  220: "#16242f",
  240: "#1a233e",
  285: "#2c1a3a",
  320: "#391823",
};
const DARK_FG: Record<number, string> = {
  0: "#e9b8b6",
  5: "#ebb8ab",
  25: "#dfc497",
  30: "#dec99b",
  75: "#dac98c",
  155: "#9bd4ad",
  195: "#9dd1d2",
  220: "#b3c4d3",
  240: "#bcc4e0",
  285: "#cab1da",
  320: "#dfb1c2",
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

export function billHueColors(hue: number, mode: ThemeMode): HueColors {
  const bgTable = mode === "dark" ? DARK_BG : LIGHT_BG;
  const fgTable = mode === "dark" ? DARK_FG : LIGHT_FG;
  const fb = mode === "dark" ? FALLBACK_DARK : FALLBACK_LIGHT;
  const h = nearestHue(hue, bgTable);
  return { bg: bgTable[h] ?? fb.bg, fg: fgTable[h] ?? fb.fg };
}
