export type LinkTintMode = "light" | "dark";

export interface LinkTint {
  wash: string;
  pillBg: string;
  pillFg: string;
  edge: string;
  swatch: string;
}

function oklchToHex(L: number, C: number, H: number): string {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  let R = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let G = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let B = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const toGamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  R = toGamma(R);
  G = toGamma(G);
  B = toGamma(B);
  const clamp = (c: number) => Math.max(0, Math.min(1, c));
  const hex = (c: number) =>
    Math.round(clamp(c) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(R)}${hex(G)}${hex(B)}`;
}

export function tintForHue(hue: number, mode: LinkTintMode = "light"): LinkTint {
  if (mode === "dark") {
    return {
      wash: oklchToHex(0.24, 0.03, hue),
      pillBg: oklchToHex(0.3, 0.05, hue),
      pillFg: oklchToHex(0.85, 0.08, hue),
      edge: oklchToHex(0.4, 0.06, hue),
      swatch: oklchToHex(0.6, 0.08, hue),
    };
  }
  return {
    wash: oklchToHex(0.96, 0.02, hue),
    pillBg: oklchToHex(0.92, 0.035, hue),
    pillFg: oklchToHex(0.35, 0.06, hue),
    edge: oklchToHex(0.8, 0.045, hue),
    swatch: oklchToHex(0.6, 0.08, hue),
  };
}

const PALETTE_HUES = [25, 55, 95, 145, 175, 205, 235, 265, 285, 315, 345, 5];

export function hueForCardId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE_HUES[h % PALETTE_HUES.length]!;
}
