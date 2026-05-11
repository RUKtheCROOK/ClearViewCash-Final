import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts, type Palette } from "@cvc/ui";
import { ChevRightIcon, CsvIcon, PdfIcon, reportFromKind } from "./reportGlyphs";
import type { SavedExport } from "./savedExportsStore";

interface Props {
  palette: Palette;
  exports: SavedExport[];
}

const FMT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function SavedExports({ palette, exports }: Props) {
  if (exports.length === 0) return null;
  return (
    <>
      <View style={{ paddingTop: 18, paddingHorizontal: 18, paddingBottom: 8, flexDirection: "row", alignItems: "baseline" }}>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.uiMedium,
            fontSize: 12,
            fontWeight: "600",
            color: palette.ink1,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Saved exports
        </Text>
        <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>{exports.length}</Text>
      </View>
      <View
        style={{
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderTopColor: palette.line,
          borderBottomColor: palette.line,
        }}
      >
        {exports.map((e, i) => {
          const when = (() => {
            const d = new Date(e.savedAt);
            return Number.isNaN(d.getTime()) ? "" : FMT_DATE.format(d);
          })();
          const slug = reportFromKind(e.reportKind)?.slug;
          return (
            <Pressable
              key={e.id}
              onPress={slug ? () => router.push(`/reports/${slug}` as never) : undefined}
              disabled={!slug}
              accessibilityLabel={`Open ${e.name}`}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: i === exports.length - 1 ? 0 : 1,
                borderBottomColor: palette.line,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: palette.tinted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {e.format === "PDF" ? <PdfIcon size={20} color={palette.ink2} /> : <CsvIcon size={20} color={palette.ink2} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.uiMedium,
                    fontSize: 13.5,
                    color: palette.ink1,
                    fontWeight: "500",
                  }}
                >
                  {e.name}
                </Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                  {when} · {e.format}
                </Text>
              </View>
              <ChevRightIcon color={palette.ink3} />
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
