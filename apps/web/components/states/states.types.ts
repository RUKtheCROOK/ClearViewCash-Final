export type StateAccent = "brand" | "warn" | "pos" | "neg" | "info";

export type BannerTone = "neg" | "warn" | "info";

export interface ActionProp {
  label: string;
  onPress?: () => void;
  href?: string;
}

export interface SpaceMeta {
  name: string;
  hue: number;
}

export const ACCENT_VARS: Record<StateAccent, { fg: string; tint: string; soft: string; on: string }> = {
  brand: { fg: "var(--brand)", tint: "var(--brand-tint)", soft: "var(--brand-soft)", on: "var(--brand-on)" },
  warn: { fg: "var(--warn)", tint: "var(--warn-tint)", soft: "var(--warn-soft)", on: "white" },
  pos: { fg: "var(--pos)", tint: "var(--pos-tint)", soft: "var(--pos-tint)", on: "white" },
  neg: { fg: "var(--neg)", tint: "var(--neg-tint)", soft: "var(--neg-soft)", on: "white" },
  info: { fg: "var(--info)", tint: "var(--info-tint)", soft: "var(--info-tint)", on: "white" },
};
