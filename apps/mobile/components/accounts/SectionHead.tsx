import { View } from "react-native";
import { Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface Props {
  eyebrow: string;
  caption?: string;
}

export function SectionHead({ eyebrow, caption }: Props) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 0.9,
          textTransform: "uppercase",
          color: palette.ink2,
        }}
      >
        {eyebrow}
      </Text>
      {caption ? (
        <Text style={{ fontSize: 11, color: palette.ink3 }}>{caption}</Text>
      ) : null}
    </View>
  );
}
