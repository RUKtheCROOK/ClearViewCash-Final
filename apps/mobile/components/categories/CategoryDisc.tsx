import { View } from "react-native";
import type { Category, CategoryIconKey, UncategorizedDescriptor } from "@cvc/domain";
import { tintForColor } from "@cvc/domain";
import { I, type IconKey } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

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
  const { mode } = useTheme();
  const tint = tintForColor(category.color, mode === "dark" ? "dark" : "light");
  const iconKey = category.icon as IconKey;
  const Icon = (I as Record<string, ((p: { color?: string; size?: number; strokeWidth?: number }) => JSX.Element) | undefined>)[iconKey] ?? I.note;
  const bg = soft ? tint.bg : category.color;
  const fg = strokeColor ?? (soft ? tint.fg : "#ffffff");
  const iconSize = Math.round(size * 0.55);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon color={fg} size={iconSize} strokeWidth={1.7} />
    </View>
  );
}
