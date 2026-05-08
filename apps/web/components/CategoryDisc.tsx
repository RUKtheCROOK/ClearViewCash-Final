"use client";

import type { CategoryIconKey, Category, UncategorizedDescriptor } from "@cvc/domain";
import { tintForColor } from "@cvc/domain";
import { I } from "../lib/icons";
import { useTheme } from "../lib/theme-provider";

type Renderable =
  | Pick<Category, "color" | "icon" | "name">
  | UncategorizedDescriptor
  | { color: string; icon: CategoryIconKey; name?: string };

interface Props {
  category: Renderable;
  size?: number;
  /** Stroke/icon color override (defaults to the tint's fg). */
  strokeColor?: string;
  /** Render as a soft chip (bg tint) rather than the bold swatch. */
  soft?: boolean;
}

export function CategoryDisc({ category, size = 36, strokeColor, soft = true }: Props) {
  const { resolved } = useTheme();
  const tint = tintForColor(category.color, resolved === "dark" ? "dark" : "light");
  const iconKey = category.icon as keyof typeof I;
  const Icon = (I as Record<string, (props: { color?: string; size?: number; strokeWidth?: number }) => JSX.Element>)[iconKey] ?? I.doc;
  const bg = soft ? tint.bg : category.color;
  const fg = strokeColor ?? (soft ? tint.fg : "#ffffff");
  const iconSize = Math.round(size * 0.55);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <Icon color={fg} size={iconSize} strokeWidth={1.7} />
    </span>
  );
}
