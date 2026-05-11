import { Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import {
  Avatar,
  I,
  categoryTint,
  fonts,
  CategoryGlyph,
  type Palette,
  type ThemeMode,
} from "@cvc/ui";
import { TX_CATEGORY_KINDS, categoryKindLabel } from "@cvc/domain";
import type {
  AccountOpt,
  AmountRange,
  DateRangeKey,
  MemberOpt,
  Status,
} from "../../lib/activity-types";

interface Props {
  palette: Palette;
  mode: ThemeMode;
  status: Status;
  setStatus: (s: Status) => void;
  counts: { all: number; pending: number; completed: number };
  accountOpts: AccountOpt[];
  accountIds: Set<string>;
  toggleAccount: (id: string) => void;
  clearAccounts: () => void;
  categoryKinds: Set<string>;
  toggleCategoryKind: (k: string) => void;
  clearCategoryKinds: () => void;
  memberOpts: MemberOpt[];
  ownerUserIds: Set<string>;
  toggleOwner: (id: string) => void;
  clearOwners: () => void;
  showPersonGroup: boolean;
  dateRange: DateRangeKey;
  setDateRange: (k: DateRangeKey) => void;
  amountRange: AmountRange;
  setAmountRange: (r: AmountRange) => void;
  onApply: () => void;
  onReset: () => void;
  totalMatches: number;
}

export function ExpandedFilters(props: Props) {
  const { palette } = props;
  const amountSelected = props.amountRange.min !== null || props.amountRange.max !== null;
  return (
    <View style={{ padding: 16, backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.line }}>
      <FilterGroup
        palette={palette}
        label="Status"
        canClear={props.status !== "all"}
        onClear={() => props.setStatus("all")}
      >
        <Seg
          palette={palette}
          options={[
            { k: "all", label: "All", count: props.counts.all },
            { k: "pending", label: "Pending", count: props.counts.pending },
            { k: "completed", label: "Completed", count: props.counts.completed },
          ]}
          value={props.status}
          onChange={(k) => props.setStatus(k as Status)}
        />
      </FilterGroup>

      <FilterGroup
        palette={palette}
        label="Account"
        canClear={props.accountIds.size > 0}
        onClear={props.clearAccounts}
      >
        <ChipRow>
          {props.accountOpts.length === 0 ? (
            <RNText style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3 }}>
              No linked accounts.
            </RNText>
          ) : (
            props.accountOpts.map((a) => (
              <ChoiceChip
                key={a.id}
                palette={palette}
                label={a.name}
                active={props.accountIds.has(a.id)}
                onPress={() => props.toggleAccount(a.id)}
              />
            ))
          )}
        </ChipRow>
      </FilterGroup>

      <FilterGroup
        palette={palette}
        label="Category"
        canClear={props.categoryKinds.size > 0}
        onClear={props.clearCategoryKinds}
      >
        <ChipRow>
          {TX_CATEGORY_KINDS.map((kind) => (
            <CategoryChoiceChip
              key={kind}
              palette={palette}
              mode={props.mode}
              kind={kind}
              label={categoryKindLabel(kind)}
              active={props.categoryKinds.has(kind)}
              onPress={() => props.toggleCategoryKind(kind)}
            />
          ))}
        </ChipRow>
      </FilterGroup>

      {props.showPersonGroup && props.memberOpts.length > 0 ? (
        <FilterGroup
          palette={palette}
          label="Person"
          canClear={props.ownerUserIds.size > 0}
          onClear={props.clearOwners}
        >
          <ChipRow>
            {props.memberOpts.map((m) => (
              <PersonChip
                key={m.user_id}
                palette={palette}
                mode={props.mode}
                initial={memberInitial(m)}
                name={memberName(m)}
                hue={30}
                active={props.ownerUserIds.has(m.user_id)}
                onPress={() => props.toggleOwner(m.user_id)}
              />
            ))}
          </ChipRow>
        </FilterGroup>
      ) : null}

      <FilterGroup
        palette={palette}
        label="Date range"
        canClear={props.dateRange !== "30d"}
        onClear={() => props.setDateRange("30d")}
      >
        <ChipRow>
          {(
            [
              { k: "7d", label: "7 days" },
              { k: "30d", label: "30 days" },
              { k: "month", label: "This month" },
              { k: "all", label: "All time" },
            ] as Array<{ k: DateRangeKey; label: string }>
          ).map((opt) => (
            <ChoiceChip
              key={opt.k}
              palette={palette}
              label={opt.label}
              active={props.dateRange === opt.k}
              onPress={() => props.setDateRange(opt.k)}
            />
          ))}
        </ChipRow>
      </FilterGroup>

      <FilterGroup
        palette={palette}
        label="Amount range"
        canClear={amountSelected}
        onClear={() => props.setAmountRange({ min: null, max: null })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AmountInput
            palette={palette}
            placeholder="Min"
            value={props.amountRange.min}
            onChange={(v) => props.setAmountRange({ ...props.amountRange, min: v })}
          />
          <RNText style={{ color: palette.ink3, fontFamily: fonts.ui }}>–</RNText>
          <AmountInput
            palette={palette}
            placeholder="Max"
            value={props.amountRange.max}
            onChange={(v) => props.setAmountRange({ ...props.amountRange, max: v })}
          />
        </View>
      </FilterGroup>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <Pressable
          onPress={props.onApply}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 10,
            backgroundColor: palette.brand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RNText style={{ color: palette.brandOn, fontFamily: fonts.uiMedium, fontWeight: "500", fontSize: 13 }}>
            Show {props.totalMatches} {props.totalMatches === 1 ? "result" : "results"}
          </RNText>
        </Pressable>
        <Pressable
          onPress={props.onReset}
          style={{
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: palette.lineFirm,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RNText style={{ color: palette.ink1, fontFamily: fonts.uiMedium, fontWeight: "500", fontSize: 13 }}>
            Reset all
          </RNText>
        </Pressable>
      </View>
    </View>
  );
}

function FilterGroup({
  palette,
  label,
  children,
  canClear,
  onClear,
}: {
  palette: Palette;
  label: string;
  children: React.ReactNode;
  canClear?: boolean;
  onClear?: () => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <RNText
          style={{
            fontFamily: fonts.uiSemibold,
            fontSize: 11,
            fontWeight: "600",
            color: palette.ink2,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </RNText>
        {canClear && onClear ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <RNText
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: 11,
                fontWeight: "500",
                color: palette.ink3,
              }}
            >
              Clear
            </RNText>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {children}
    </ScrollView>
  );
}

function Seg({
  palette,
  options,
  value,
  onChange,
}: {
  palette: Palette;
  options: Array<{ k: string; label: string; count: number }>;
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: palette.tinted,
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.k === value;
        return (
          <Pressable
            key={opt.k}
            onPress={() => onChange(opt.k)}
            style={{
              flex: 1,
              height: 30,
              borderRadius: 6,
              backgroundColor: active ? palette.surface : "transparent",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: active ? palette.ink1 : palette.ink2 }}>
              {opt.label}
            </RNText>
            <RNText style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink3 }}>
              {opt.count}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoiceChip({
  palette,
  label,
  active,
  onPress,
}: {
  palette: Palette;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: 30,
        paddingHorizontal: 11,
        borderRadius: 999,
        backgroundColor: active ? palette.ink1 : palette.surface,
        borderWidth: 1,
        borderColor: active ? palette.ink1 : palette.line,
      }}
    >
      {active ? <I.check color={palette.canvas} size={12} /> : null}
      <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: active ? palette.canvas : palette.ink2 }}>
        {label}
      </RNText>
    </Pressable>
  );
}

function CategoryChoiceChip({
  palette,
  mode,
  kind,
  label,
  active,
  onPress,
}: {
  palette: Palette;
  mode: ThemeMode;
  kind: import("@cvc/ui").CategoryKind;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const tint = categoryTint(kind, mode);
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 30,
        paddingLeft: 6,
        paddingRight: 10,
        borderRadius: 999,
        backgroundColor: active ? tint.pillBg : palette.surface,
        borderWidth: 1,
        borderColor: active ? "transparent" : palette.line,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          backgroundColor: active ? tint.swatch : tint.pillBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CategoryGlyph kind={kind} color={active ? "#fff" : tint.pillFg} size={12} strokeWidth={1.8} />
      </View>
      <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: active ? tint.pillFg : palette.ink2 }}>
        {label}
      </RNText>
    </Pressable>
  );
}

function PersonChip({
  palette,
  mode,
  initial,
  name,
  hue,
  active,
  onPress,
}: {
  palette: Palette;
  mode: ThemeMode;
  initial: string;
  name: string;
  hue: number;
  active: boolean;
  onPress: () => void;
}) {
  // Use household tint for hue=30, else fall back to ink-tinted neutral.
  const tint = hue === 30 ? categoryTint("dining", mode) : { pillBg: palette.tinted, pillFg: palette.ink2, swatch: palette.ink3, wash: palette.tinted, edge: palette.line };
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 30,
        paddingLeft: 4,
        paddingRight: 11,
        borderRadius: 999,
        backgroundColor: active ? tint.pillBg : palette.surface,
        borderWidth: 1,
        borderColor: active ? "transparent" : palette.line,
      }}
    >
      <Avatar initial={initial} bg={tint.pillBg} fg={tint.pillFg} size={20} />
      <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: active ? tint.pillFg : palette.ink2 }}>
        {name}
      </RNText>
    </Pressable>
  );
}

function AmountInput({
  palette,
  placeholder,
  value,
  onChange,
}: {
  palette: Palette;
  placeholder: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: palette.tinted,
      }}
    >
      <RNText style={{ fontFamily: fonts.numMedium, fontSize: 12, color: palette.ink3 }}>$</RNText>
      <TextInput
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={palette.ink3}
        value={value === null ? "" : String(value)}
        onChangeText={(s) => {
          const t = s.trim();
          if (!t) return onChange(null);
          const n = Number(t);
          onChange(Number.isFinite(n) ? n : null);
        }}
        style={{
          flex: 1,
          fontFamily: fonts.numMedium,
          fontSize: 13,
          color: palette.ink1,
          padding: 0,
        }}
      />
    </View>
  );
}

function memberInitial(m: MemberOpt): string {
  const name = m.display_name ?? m.invited_email ?? "?";
  return (name.trim()[0] ?? "?").toUpperCase();
}

function memberName(m: MemberOpt): string {
  return m.display_name ?? m.invited_email ?? m.user_id.slice(0, 8);
}
