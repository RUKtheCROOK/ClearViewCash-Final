import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { I, fonts, type Palette } from "@cvc/ui";
import { haptics } from "../../lib/haptics";

export interface RailChip {
  key: string;
  label: string;
  count?: number;
  active?: boolean;
  hasIcon?: boolean;
  onPress?: () => void;
}

interface Props {
  palette: Palette;
  chips: RailChip[];
}

export function FilterChipRail({ palette, chips }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 6 }}
      style={{ backgroundColor: palette.canvas }}
    >
      {chips.map((chip) => (
        <FilterChip key={chip.key} palette={palette} chip={chip} />
      ))}
    </ScrollView>
  );
}

function FilterChip({ palette, chip }: { palette: Palette; chip: RailChip }) {
  const active = !!chip.active;
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        chip.onPress?.();
      }}
      style={{
        flexShrink: 0,
        height: 32,
        paddingHorizontal: 11,
        borderRadius: 999,
        backgroundColor: active ? palette.ink1 : palette.surface,
        borderWidth: 1,
        borderColor: active ? palette.ink1 : palette.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {chip.hasIcon ? <I.filter color={active ? palette.canvas : palette.ink2} size={12} /> : null}
      <RNText
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 12.5,
          fontWeight: "500",
          color: active ? palette.canvas : palette.ink2,
        }}
      >
        {chip.label}
      </RNText>
      {typeof chip.count === "number" && chip.count > 0 ? (
        <View
          style={{
            backgroundColor: active ? "rgba(255,255,255,0.18)" : palette.tinted,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 999,
          }}
        >
          <RNText
            style={{
              fontFamily: fonts.numMedium,
              fontSize: 10,
              color: active ? palette.canvas : palette.ink2,
            }}
          >
            {chip.count}
          </RNText>
        </View>
      ) : null}
      {chip.hasIcon ? (
        <View style={{ transform: [{ rotate: active ? "180deg" : "0deg" }] }}>
          <I.chev color={active ? palette.canvas : palette.ink3} size={11} />
        </View>
      ) : null}
    </Pressable>
  );
}
