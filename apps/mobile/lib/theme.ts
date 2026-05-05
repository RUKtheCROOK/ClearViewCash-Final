import { useColorScheme } from "react-native";
import {
  darkPalette,
  lightPalette,
  paletteFor,
  spaceKeyFromTint,
  spaceTint,
  type Palette,
  type SpaceKey,
  type SpaceTint,
  type ThemeMode as PaletteMode,
} from "@cvc/ui";
import { useApp } from "./store";

export interface UseThemeResult {
  mode: PaletteMode;
  palette: Palette;
  sp: SpaceTint;
  spaceKey: SpaceKey;
  setMode: (mode: "system" | "light" | "dark") => void;
}

/**
 * Resolve the active palette + active space tint in one hook. Defaults to
 * 'personal' tint when no active space is supplied.
 *
 * spaceTintHex: pass `activeSpace?.tint` so the hook can map it to one of
 * the 5 known space hues. Unknown hex values fall back to 'personal'.
 */
export function useTheme(spaceTintHex?: string | null): UseThemeResult {
  const sysScheme = useColorScheme();
  const themeMode = useApp((s) => s.themeMode);
  const setThemeMode = useApp((s) => s.setThemeMode);

  const resolved: PaletteMode =
    themeMode === "system" ? (sysScheme === "dark" ? "dark" : "light") : themeMode;

  const palette = paletteFor(resolved);
  const spaceKey = spaceKeyFromTint(spaceTintHex);
  const sp = spaceTint(spaceKey, resolved);

  return {
    mode: resolved,
    palette,
    sp,
    spaceKey,
    setMode: setThemeMode,
  };
}

export { lightPalette, darkPalette };
