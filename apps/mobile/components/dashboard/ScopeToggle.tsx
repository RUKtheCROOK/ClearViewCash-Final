import { Pressable, View } from "react-native";
import { Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface Props {
  value: "mine" | "shared";
  onChange: (next: "mine" | "shared") => void;
  spaceTintHex?: string | null;
}

export function ScopeToggle({ value, onChange, spaceTintHex }: Props) {
  const { palette, sp } = useTheme(spaceTintHex);

  const Option = ({ k, dotColor }: { k: "mine" | "shared"; dotColor: string }) => {
    const active = value === k;
    return (
      <Pressable
        onPress={() => onChange(k)}
        style={{
          height: 30,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: active ? palette.surface : "transparent",
          borderColor: active ? palette.line : "transparent",
          borderWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: active ? dotColor : palette.ink4,
          }}
        />
        <Text style={{ fontSize: 13, fontWeight: "500", color: active ? palette.ink1 : palette.ink2 }}>
          {k === "mine" ? "Mine" : "Shared"}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        padding: 3,
        borderRadius: 999,
        backgroundColor: palette.tinted,
        borderColor: palette.line,
        borderWidth: 1,
        alignSelf: "flex-start",
      }}
    >
      <Option k="mine" dotColor={palette.brand} />
      <Option k="shared" dotColor={sp.pillFg} />
    </View>
  );
}
