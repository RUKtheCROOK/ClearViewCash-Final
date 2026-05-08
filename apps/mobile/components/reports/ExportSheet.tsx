import type { ReactNode } from "react";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { fonts, type Palette } from "@cvc/ui";
import {
  ChevRightIcon,
  CloseIcon,
  CsvIcon,
  DownloadIcon,
  PdfIcon,
  ShareIcon,
} from "./reportGlyphs";

export type ExportFormat = "PDF" | "CSV";

export interface ExportIncludeFlags {
  chart: boolean;
  table: boolean;
  txnDetail: boolean;
  cover: boolean;
}

export interface ExportSheetProps {
  palette: Palette;
  open: boolean;
  onClose: () => void;
  title: string;
  rangeLabel: string;
  rangeSub: string;
  dataSummary: string;
  filenameStem: string;
  approxPages?: number;
  approxSize?: string;
  accountantEmail?: string | null;
  onGenerate: (format: ExportFormat, include: ExportIncludeFlags) => Promise<void> | void;
}

export function ExportSheet({
  palette,
  open,
  onClose,
  title,
  rangeLabel,
  rangeSub,
  dataSummary,
  filenameStem,
  approxPages = 4,
  approxSize = "~284 KB",
  accountantEmail,
  onGenerate,
}: ExportSheetProps) {
  const [format, setFormat] = useState<ExportFormat>("PDF");
  const [include, setInclude] = useState<ExportIncludeFlags>({
    chart: true,
    table: true,
    txnDetail: true,
    cover: false,
  });
  const [busy, setBusy] = useState(false);

  const filename = `${filenameStem}.${format.toLowerCase()}`;
  const tags = [
    include.chart ? "Chart" : null,
    include.table ? "Table" : null,
    include.txnDetail ? "Txns" : null,
    include.cover ? "Cover" : null,
  ].filter(Boolean) as string[];

  async function handleGenerate() {
    setBusy(true);
    try {
      await onGenerate(format, include);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,26,0.45)" }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            marginTop: "auto",
            backgroundColor: palette.canvas,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 10,
            paddingBottom: 28,
            maxHeight: "88%",
          }}
        >
          <View style={{ alignItems: "center", paddingVertical: 6 }}>
            <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: palette.lineFirm }} />
          </View>

          <View style={{ paddingHorizontal: 18, paddingBottom: 10, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.num,
                  fontSize: 9.5,
                  color: palette.ink3,
                  letterSpacing: 0.7,
                  fontWeight: "600",
                }}
              >
                EXPORT
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  fontFamily: fonts.uiMedium,
                  fontSize: 22,
                  fontWeight: "500",
                  color: palette.ink1,
                  letterSpacing: -0.4,
                }}
              >
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CloseIcon color={palette.ink2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }}>
            <SectionLabel palette={palette} label="FORMAT" />
            <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 10 }}>
              <FormatCard
                palette={palette}
                kind="PDF"
                name="PDF"
                sub="Formatted · share-ready"
                tag="FOR ACCOUNTANT"
                selected={format === "PDF"}
                onSelect={() => setFormat("PDF")}
              />
              <FormatCard
                palette={palette}
                kind="CSV"
                name="CSV"
                sub="Raw rows · for spreadsheets"
                tag="DATA"
                selected={format === "CSV"}
                onSelect={() => setFormat("CSV")}
              />
            </View>

            <SectionLabel palette={palette} label="DATE RANGE" />
            <View style={{ paddingHorizontal: 16 }}>
              <View
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                      {rangeLabel}
                    </Text>
                    <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3, marginTop: 2 }}>
                      {rangeSub}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: palette.line,
                  }}
                >
                  <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, lineHeight: 18 }}>
                    {dataSummary}
                  </Text>
                </View>
              </View>
            </View>

            <SectionLabel palette={palette} label="INCLUDE" />
            <View style={{ paddingHorizontal: 16 }}>
              <View
                style={{
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <ToggleRow
                  palette={palette}
                  title="Chart visualization"
                  sub={format === "PDF" ? "Render the chart on page 1" : "CSV is data only"}
                  on={include.chart}
                  disabled={format === "CSV"}
                  onChange={(v) => setInclude((s) => ({ ...s, chart: v }))}
                />
                <ToggleRow
                  palette={palette}
                  title="Data table"
                  sub="All rows with totals"
                  on={include.table}
                  onChange={(v) => setInclude((s) => ({ ...s, table: v }))}
                />
                <ToggleRow
                  palette={palette}
                  title="Transaction-level detail"
                  sub="Adds individual rows · accountant view"
                  on={include.txnDetail}
                  onChange={(v) => setInclude((s) => ({ ...s, txnDetail: v }))}
                />
                <ToggleRow
                  palette={palette}
                  title="Cover page"
                  sub="Logo, range, space, signature line"
                  on={include.cover}
                  disabled={format === "CSV"}
                  last
                  onChange={(v) => setInclude((s) => ({ ...s, cover: v }))}
                />
              </View>
            </View>

            <SectionLabel palette={palette} label="PREVIEW" />
            <View style={{ paddingHorizontal: 16 }}>
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <MiniDocPreview palette={palette} format={format} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.uiMedium,
                      fontSize: 13,
                      fontWeight: "500",
                      color: palette.ink1,
                    }}
                  >
                    {filename}
                  </Text>
                  <Text style={{ fontFamily: fonts.num, fontSize: 10.5, color: palette.ink3, marginTop: 2 }}>
                    {format === "PDF" ? `${approxPages} pages · ${approxSize}` : `Raw data · ${format}`}
                  </Text>
                  <View style={{ marginTop: 6, flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    {tags.map((t) => (
                      <Tag key={t} palette={palette} txt={t} />
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <SectionLabel palette={palette} label="WHERE TO" />
            <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 14 }}>
              <Destination
                palette={palette}
                icon={<ShareIcon color={palette.ink2} />}
                title="Share via…"
                sub="AirDrop, Mail, Messages"
                disabled
              />
              <Destination
                palette={palette}
                icon={<DownloadIcon color={palette.ink2} />}
                title="Save to Files"
                sub="iCloud · Documents"
                disabled
              />
              <Destination
                palette={palette}
                icon={<PdfIcon size={20} color={palette.ink2} />}
                title="Email to my accountant"
                sub={accountantEmail ?? "Add an email in settings"}
                hint={accountantEmail ? "ON FILE" : undefined}
                disabled
              />
            </View>
          </ScrollView>

          <View
            style={{
              paddingTop: 12,
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: palette.line,
              backgroundColor: palette.canvas,
            }}
          >
            <Pressable
              onPress={handleGenerate}
              disabled={busy}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 14,
                backgroundColor: palette.brand,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: busy ? 0.7 : pressed ? 0.9 : 1,
              })}
            >
              <ShareIcon color={palette.brandOn} />
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 15, fontWeight: "500", color: palette.brandOn }}>
                {busy ? "Generating…" : `Generate ${format} & share`}
              </Text>
            </Pressable>
            <Text
              style={{
                marginTop: 8,
                textAlign: "center",
                fontFamily: fonts.ui,
                fontSize: 11,
                color: palette.ink3,
              }}
            >
              Saves to <Text style={{ color: palette.ink2, fontWeight: "500" }}>Saved exports</Text> automatically.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SectionLabel({ palette, label }: { palette: Palette; label: string }) {
  return (
    <Text
      style={{
        marginTop: 14,
        paddingHorizontal: 18,
        paddingBottom: 6,
        fontFamily: fonts.num,
        fontSize: 10,
        color: palette.ink3,
        letterSpacing: 0.8,
        fontWeight: "600",
      }}
    >
      {label}
    </Text>
  );
}

function FormatCard({
  palette,
  kind,
  name,
  sub,
  tag,
  selected,
  onSelect,
}: {
  palette: Palette;
  kind: ExportFormat;
  name: string;
  sub: string;
  tag: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 14,
        backgroundColor: selected ? palette.brandTint : palette.surface,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? palette.brand : palette.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {kind === "PDF" ? (
            <PdfIcon color={selected ? palette.brand : palette.ink2} />
          ) : (
            <CsvIcon color={selected ? palette.brand : palette.ink2} />
          )}
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.numMedium ?? fonts.num,
            fontSize: 14,
            fontWeight: "700",
            color: palette.ink1,
            letterSpacing: 0.2,
          }}
        >
          {name}
        </Text>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: selected ? palette.brand : palette.lineFirm,
            backgroundColor: selected ? palette.brand : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: palette.surface }} /> : null}
        </View>
      </View>
      <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink2, lineHeight: 17 }}>{sub}</Text>
      <View
        style={{
          marginTop: 8,
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: palette.surface,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.num,
            fontSize: 9,
            color: palette.ink3,
            fontWeight: "600",
            letterSpacing: 0.6,
          }}
        >
          {tag}
        </Text>
      </View>
    </Pressable>
  );
}

function ToggleRow({
  palette,
  title,
  sub,
  on,
  disabled,
  last,
  onChange,
}: {
  palette: Palette;
  title: string;
  sub: string;
  on: boolean;
  disabled?: boolean;
  last?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.line,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>{title}</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 1 }}>{sub}</Text>
      </View>
      <Switch
        value={on}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: palette.lineFirm, true: palette.brand }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function Destination({
  palette,
  icon,
  title,
  sub,
  hint,
  disabled,
}: {
  palette: Palette;
  icon: ReactNode;
  title: string;
  sub: string;
  hint?: string;
  disabled?: boolean;
}) {
  // NOTE: Destinations are placeholder buttons. The "Generate" CTA at the
  // bottom of the sheet handles the export via the existing Sharing.shareAsync
  // flow. Wire up real destinations (email, Files, etc.) when those features
  // ship.
  return (
    <View
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: disabled ? 0.6 : 1,
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
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>{title}</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 1 }}>{sub}</Text>
      </View>
      {hint ? (
        <View
          style={{
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: palette.brandTint,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.num,
              fontSize: 9,
              color: palette.brand,
              fontWeight: "600",
              letterSpacing: 0.6,
            }}
          >
            {hint}
          </Text>
        </View>
      ) : null}
      <ChevRightIcon color={palette.ink3} />
    </View>
  );
}

function Tag({ palette, txt }: { palette: Palette; txt: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: palette.tinted,
      }}
    >
      <Text style={{ fontFamily: fonts.num, fontSize: 9, color: palette.ink3, fontWeight: "600", letterSpacing: 0.4 }}>
        {txt}
      </Text>
    </View>
  );
}

function MiniDocPreview({ palette, format }: { palette: Palette; format: ExportFormat }) {
  return (
    <View
      style={{
        width: 60,
        height: 78,
        borderRadius: 4,
        backgroundColor: "#fbfaf6",
        borderWidth: 1,
        borderColor: palette.line,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 8,
          backgroundColor: format === "PDF" ? "#1c4544" : "#2c6c47",
        }}
      />
      <View style={{ padding: 5 }}>
        <View style={{ height: 3, width: "70%", backgroundColor: "#a4abad", borderRadius: 1 }} />
        <View style={{ height: 2, width: "50%", backgroundColor: "#c2c8ca", borderRadius: 1, marginTop: 3 }} />
        {format === "PDF" ? (
          <View style={{ marginTop: 5 }}>
            <Svg width={50} height={34} viewBox="0 0 50 34">
              <Circle cx={14} cy={17} r={11} fill="none" stroke="#cb6d4d" strokeWidth={6} />
              <Circle
                cx={14}
                cy={17}
                r={11}
                fill="none"
                stroke="#5b8a64"
                strokeWidth={6}
                strokeDasharray="20 50"
              />
              <Rect x={30} y={6} width={18} height={2} fill="#cdd2d3" />
              <Rect x={30} y={11} width={14} height={2} fill="#cdd2d3" />
              <Rect x={30} y={16} width={16} height={2} fill="#cdd2d3" />
              <Rect x={30} y={21} width={12} height={2} fill="#cdd2d3" />
            </Svg>
          </View>
        ) : (
          <View style={{ marginTop: 5 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{
                  height: 2,
                  width: i % 2 === 0 ? "85%" : "60%",
                  backgroundColor: "#cdd2d3",
                  borderRadius: 1,
                  marginTop: 3,
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
