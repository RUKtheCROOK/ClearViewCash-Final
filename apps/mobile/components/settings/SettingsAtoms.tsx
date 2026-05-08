import type { ReactNode } from "react";
import { Pressable, Text, View, type PressableProps, type ViewStyle } from "react-native";
import { fonts, iconDiscTint, type Palette, type ThemeMode } from "@cvc/ui";
import { Si, type GlyphKey } from "./settingsGlyphs";

// Mobile atoms mirror the design source (Settings.jsx). They take a `palette`
// prop derived from useTheme() so light/dark mode work consistently.

// ─── IconDisc ────────────────────────────────────────────────────────────

interface IconDiscProps {
  hue?: number;
  glyph: GlyphKey;
  size?: number;
  mode?: ThemeMode;
  glyphSize?: number;
  palette: Palette;
}

export function IconDisc({ hue, glyph, size = 32, mode = "light", glyphSize, palette }: IconDiscProps) {
  const tint = hue != null ? iconDiscTint(hue, mode) : null;
  const bg = tint ? tint.wash : "transparent";
  const fg = tint ? tint.fg : palette.ink2;
  const radius = Math.round(size * 0.25);
  const Glyph = Si[glyph];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Glyph(fg, glyphSize ?? Math.round(size * 0.56))}
    </View>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────

interface ToggleProps {
  on: boolean;
  accent?: string;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  palette: Palette;
}

export function Toggle({ on, accent, onChange, disabled, palette }: ToggleProps) {
  const bg = on ? (accent ?? palette.brand) : palette.tinted;
  return (
    <Pressable
      onPress={() => {
        if (!disabled && onChange) onChange(!on);
      }}
      disabled={disabled}
      hitSlop={8}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        backgroundColor: bg,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 20,
          height: 20,
          borderRadius: 999,
          backgroundColor: "white",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 2,
          elevation: 2,
        }}
      />
    </Pressable>
  );
}

// ─── SectionLabel ────────────────────────────────────────────────────────

interface SectionLabelProps {
  children: ReactNode;
  sub?: ReactNode;
  palette: Palette;
}

export function SectionLabel({ children, sub, palette }: SectionLabelProps) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 }}>
      <Text
        style={{
          fontFamily: fonts.numMedium,
          fontSize: 10,
          color: palette.ink3,
          letterSpacing: 1,
          fontWeight: "600",
          textTransform: "uppercase",
        }}
      >
        {children}
      </Text>
      {sub ? (
        <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

// ─── Group ───────────────────────────────────────────────────────────────

interface GroupProps {
  children: ReactNode;
  topAccent?: string;
  palette: Palette;
  style?: ViewStyle;
}

export function Group({ children, topAccent, palette, style }: GroupProps) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderTopWidth: topAccent ? 3 : 1,
          borderTopColor: topAccent ?? palette.line,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────

interface RowProps {
  glyph?: GlyphKey;
  hue?: number;
  title: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
  onPress?: PressableProps["onPress"];
  palette: Palette;
  mode?: ThemeMode;
}

export function Row({ glyph, hue, title, sub, value, right, danger, last, onPress, palette, mode = "light" }: RowProps) {
  const Inner = (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.line,
      }}
    >
      {glyph ? <IconDisc glyph={glyph} hue={hue} mode={mode} palette={palette} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 14,
            fontWeight: "500",
            color: danger ? palette.neg : palette.ink1,
            lineHeight: 18,
          }}
        >
          {title}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 2, lineHeight: 16 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {value != null ? (
          <Text style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3 }}>{value}</Text>
        ) : null}
        {right === undefined ? Si.chevR(danger ? palette.neg : palette.ink3) : right}
      </View>
    </View>
  );
  if (!onPress) return Inner;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: palette.tinted }}>
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.85 : 1 }}>{Inner}</View>
      )}
    </Pressable>
  );
}

// ─── ToggleRow ───────────────────────────────────────────────────────────

interface ToggleRowProps {
  glyph?: GlyphKey;
  hue?: number;
  title: ReactNode;
  sub?: ReactNode;
  on: boolean;
  onChange?: (next: boolean) => void;
  accent?: string;
  last?: boolean;
  disabled?: boolean;
  palette: Palette;
  mode?: ThemeMode;
}

export function ToggleRow({ glyph, hue, title, sub, on, onChange, accent, last, disabled, palette, mode = "light" }: ToggleRowProps) {
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.line,
      }}
    >
      {glyph ? <IconDisc glyph={glyph} hue={hue} mode={mode} palette={palette} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1, lineHeight: 18 }}>
          {title}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 3, lineHeight: 17 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Toggle on={on} accent={accent} onChange={onChange} disabled={disabled} palette={palette} />
    </View>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  palette: Palette;
}

export function PageHeader({ title, sub, right, onBack, palette }: PageHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: palette.tinted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Si.back(palette.ink2)}
        </Pressable>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 22,
            fontWeight: "500",
            letterSpacing: -0.5,
            color: palette.ink1,
            lineHeight: 26,
          }}
        >
          {title}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, marginTop: 2 }}>{sub}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

// ─── Channel pill ────────────────────────────────────────────────────────

interface ChannelProps {
  on: boolean;
  label: string;
  onToggle?: () => void;
  disabled?: boolean;
  palette: Palette;
}

export function Channel({ on, label, onToggle, disabled, palette }: ChannelProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: on ? palette.brand : palette.tinted,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          backgroundColor: on ? palette.brandOn : palette.ink3,
        }}
      />
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 12,
          fontWeight: "500",
          color: on ? palette.brandOn : palette.ink2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── ProChip / role chip ─────────────────────────────────────────────────

interface ProChipProps {
  children: ReactNode;
  tone?: "brand" | "muted" | "accent" | "pos";
  palette: Palette;
}

export function ProChip({ children, tone = "brand", palette }: ProChipProps) {
  const map = {
    brand: { bg: palette.brandTint, fg: palette.brand },
    muted: { bg: palette.tinted, fg: palette.ink2 },
    accent: { bg: palette.accentTint, fg: palette.accent },
    pos: { bg: palette.posTint, fg: palette.pos },
  } as const;
  const t = map[tone];
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: t.bg,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.numMedium,
          fontSize: 9.5,
          color: t.fg,
          fontWeight: "600",
          letterSpacing: 0.6,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
