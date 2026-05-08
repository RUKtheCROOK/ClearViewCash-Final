// Stable hue (0-360) per spending category. Mirrors the web file at
// apps/web/app/reports/_components/categoryHues.ts so a category renders the
// same color on both clients.

const EXPLICIT: Record<string, number> = {
  "dining & drinks": 30,
  "dining": 30,
  "food & drink": 30,
  "groceries": 145,
  "rent & housing": 220,
  "rent": 220,
  "housing": 220,
  "transit & auto": 75,
  "transit": 75,
  "transportation": 75,
  "auto": 75,
  "shopping": 305,
  "subscriptions": 195,
  "subs": 195,
  "health": 175,
  "healthcare": 175,
  "fitness": 175,
  "entertainment": 280,
  "travel": 250,
  "utilities": 50,
  "personal": 320,
  "education": 260,
  "gifts": 340,
  "fees": 15,
  "taxes": 15,
  "other": 240,
};

const FALLBACK_PALETTE = [30, 145, 220, 75, 305, 195, 175, 240, 280, 50, 320, 260, 340];

export function hueForCategory(name: string): number {
  const key = name.trim().toLowerCase();
  if (key in EXPLICIT) return EXPLICIT[key]!;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]!;
}

export function categoryColor(hue: number, mode: "light" | "dark" = "light"): string {
  if (mode === "dark") return `hsl(${hue} 60% 65%)`;
  return `hsl(${hue} 55% 50%)`;
}

export function categoryWash(hue: number, mode: "light" | "dark" = "light"): string {
  if (mode === "dark") return `hsl(${hue} 35% 22%)`;
  return `hsl(${hue} 50% 90%)`;
}
