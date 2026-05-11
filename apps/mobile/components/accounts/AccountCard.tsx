import { Pressable, View } from "react-native";
import { I, Money, Text, type IconKey } from "@cvc/ui";
import {
  accountKind,
  defaultAccountIcon,
  isAccountIconKey,
  isValidHexColor,
  readableTextOn,
  type LinkTintMode,
} from "@cvc/domain";
import { useTheme } from "../../lib/theme";
import { LinkStrip, type LinkChip } from "./LinkStrip";

export interface AccountCardData {
  id: string;
  type: string;
  subtype?: string | null;
  name: string;
  institution: string;
  mask: string | null;
  balanceCents: number;
  lastSyncedAgo: string | null;
  /** "private" or "shared" — derived from account_shares for the active space. */
  ownership: "private" | "shared";
  /** Space hue key for the shared pill colour. Only used when ownership === "shared". */
  sharedSpaceHex?: string | null;
  /** Effective available cents (cash accounts only). null hides the row. */
  effectiveAvailableCents?: number | null;
  /** Direction + link chips. Empty array hides the strip. */
  linkDirection: "in" | "out";
  links: LinkChip[];
  /** Plaid sync state. "error" shows the reconnect chip + button. */
  syncStatus?: "good" | "error" | "pending" | null;
  /** Optional APR shown next to "Statement balance" for credit cards. */
  apr?: string | null;
  /** True when a credit card's balance is fully covered by linked funders. */
  fullyCovered?: boolean;
  /** User-chosen hex color for this account. When set, tints the header band. */
  color?: string | null;
  /** User-chosen icon override for this account. */
  iconKey?: string | null;
  onPress: () => void;
  onReconnectPress?: () => void;
  reconnecting?: boolean;
  /** Optional tap on the "Effective available" row — opens an explainer sheet. */
  onEffectivePress?: () => void;
  /** Credit cards only: opens the payment-link wizard pre-selected to this card. */
  onSetUpCoverage?: () => void;
}

export function AccountCard(props: AccountCardData) {
  const { palette, sp } = useTheme(props.sharedSpaceHex);
  const kind = accountKind({ type: props.type, subtype: props.subtype ?? null });
  const isCredit = kind === "credit" || kind === "loan";
  const isError = props.syncStatus === "error";

  const iconKey: IconKey = isAccountIconKey(props.iconKey ?? null)
    ? (props.iconKey as IconKey)
    : (defaultAccountIcon(kind) as IconKey);
  const InstIcon = I[iconKey] ?? I.bank;

  const hasColor = isValidHexColor(props.color ?? null);
  const headerBg = hasColor ? (props.color as string) : palette.surface;
  const headerFg = hasColor ? readableTextOn(props.color) : palette.ink1;
  const headerSub = hasColor ? readableTextOn(props.color) : palette.ink3;
  const iconBg = hasColor ? "rgba(255,255,255,0.22)" : palette.brandTint;
  const iconFg = hasColor ? readableTextOn(props.color) : palette.brand;

  const ownerColor = hasColor
    ? readableTextOn(props.color)
    : props.ownership === "shared"
      ? sp.pillFg
      : palette.ink2;
  const ownerBg = hasColor
    ? "rgba(255,255,255,0.22)"
    : props.ownership === "shared"
      ? sp.pillBg
      : palette.tinted;

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.surface,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 16,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: headerBg,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: iconBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <InstIcon color={iconFg} size={18} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 14.5, fontWeight: "500", color: headerFg, lineHeight: 18 }}
            >
              {props.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: headerSub }}>
                {props.institution}
              </Text>
              {props.mask ? (
                <Text style={{ fontFamily: "Menlo", fontSize: 11, color: headerSub }}>
                  ···{props.mask}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingVertical: 3,
            paddingHorizontal: 8,
            borderRadius: 999,
            backgroundColor: ownerBg,
          }}
        >
          {props.ownership === "shared" ? (
            <I.share color={ownerColor} size={11} />
          ) : (
            <I.lock color={ownerColor} size={11} />
          )}
          <Text style={{ fontSize: 11, fontWeight: "500", color: ownerColor }}>
            {props.ownership === "shared" ? "Household" : "Private"}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <Money
            cents={props.balanceCents}
            splitCents
            style={{
              fontSize: 26,
              fontWeight: "500",
              letterSpacing: -0.5,
              color: palette.ink1,
            }}
            centsStyle={{ color: palette.ink3 }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {isError ? (
              <I.syncErr color={palette.warn} size={11} />
            ) : (
              <I.sync color={palette.ink3} size={11} />
            )}
            <Text
              style={{
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: 0.7,
                color: isError ? palette.warn : palette.ink3,
              }}
            >
              {isError ? "Reconnect" : props.lastSyncedAgo ?? "—"}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -4 }}>
          <Text style={{ fontSize: 11, color: palette.ink3 }}>
            {isCredit
              ? props.apr
                ? `Statement balance · ${props.apr} APR`
                : "Statement balance"
              : "Available balance"}
          </Text>
          {props.fullyCovered ? (
            <View
              style={{
                paddingVertical: 1,
                paddingHorizontal: 6,
                borderRadius: 999,
                backgroundColor: palette.posTint,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: palette.pos,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Fully covered
              </Text>
            </View>
          ) : null}
        </View>

        {props.links.length > 0 ? (
          <LinkStrip direction={props.linkDirection} links={props.links} />
        ) : isCredit && props.onSetUpCoverage ? (
          <Pressable
            onPress={props.onSetUpCoverage}
            accessibilityLabel="Set up coverage for this card"
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              borderStyle: "dashed",
              borderWidth: 1,
              borderColor: palette.line,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <I.link color={palette.ink3} size={12} />
              <Text style={{ fontSize: 12, color: palette.ink2 }}>Not linked</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "500", color: palette.brand }}>
                Set up coverage
              </Text>
              <I.chevR color={palette.brand} size={11} />
            </View>
          </Pressable>
        ) : null}

        {!isCredit &&
        kind !== "invest" &&
        props.effectiveAvailableCents != null &&
        props.effectiveAvailableCents !== props.balanceCents ? (
          <Pressable
            onPress={props.onEffectivePress}
            disabled={!props.onEffectivePress}
            accessibilityLabel="What is Effective available?"
            style={({ pressed }) => ({
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: palette.sunken,
              opacity: pressed && props.onEffectivePress ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <I.link color={palette.ink2} size={12} />
              <Text style={{ fontSize: 12, color: palette.ink2 }}>Effective available</Text>
              {props.onEffectivePress ? (
                <I.info color={palette.ink3} size={12} />
              ) : null}
            </View>
            <Money
              cents={props.effectiveAvailableCents}
              splitCents
              style={{ fontSize: 14, fontWeight: "600", color: palette.ink1 }}
              centsStyle={{ color: palette.ink3 }}
            />
          </Pressable>
        ) : null}

        {isError && props.onReconnectPress ? (
          <Pressable
            onPress={props.onReconnectPress}
            disabled={props.reconnecting}
            style={{
              marginTop: 2,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: palette.warnTint,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: palette.warn,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {props.reconnecting ? "Reconnecting…" : "Reconnect bank"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

// Suppress unused-mode warning when downstream doesn't use it.
void (undefined as unknown as LinkTintMode);
