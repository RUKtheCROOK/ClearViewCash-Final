// Tiny web-local mirror of the helpers we need from @cvc/ui. Pulling the full
// package into Next bundles React Native, which we don't want — these are pure
// functions / constants with no RN dependency, so they're safe to copy here.

export type ThemeMode = "light" | "dark";

export interface IconDiscTint {
  wash: string;
  fg: string;
}

export function iconDiscTint(hue: number, mode: ThemeMode = "light"): IconDiscTint {
  if (mode === "dark") {
    return {
      wash: `oklch(28% 0.045 ${hue})`,
      fg: `oklch(82% 0.090 ${hue})`,
    };
  }
  return {
    wash: `oklch(94% 0.024 ${hue})`,
    fg: `oklch(38% 0.060 ${hue})`,
  };
}

export const SPACE_HUES = {
  personal: 195,
  household: 30,
  business: 270,
  family: 145,
  travel: 220,
} as const;

export type SpaceKey = keyof typeof SPACE_HUES;

const HEX_TO_SPACE_KEY: Record<string, SpaceKey> = {
  "#0EA5E9": "personal",
  "#0ea5e9": "personal",
  "#1c4544": "personal",
  "#d97706": "household",
  "#7c3aed": "business",
  "#16a34a": "family",
  "#0284c7": "travel",
};

export function spaceKeyFromTint(tint: string | null | undefined): SpaceKey {
  if (!tint) return "personal";
  return HEX_TO_SPACE_KEY[tint.toLowerCase()] ?? HEX_TO_SPACE_KEY[tint] ?? "personal";
}
