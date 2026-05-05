import { Pressable, View } from "react-native";
import { I, Money, Text } from "@cvc/ui";
import {
  accountKind,
  hueForCardId,
  tintForHue,
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
  onPress: () => void;
  onReconnectPress?: () => void;
  reconnecting?: boolean;
}

export function AccountCard(props: AccountCardData) {
  const { mode, palette, sp } = useTheme(props.sharedSpaceHex);
  const kind = accountKind({ type: props.type, subtype: props.subtype ?? null });
  const isCredit = kind === "credit" || kind === "loan";
  const isError = props.syncStatus === "error";

  const InstIcon = (() => {
    switch (kind) {
      case "credit":
      case "loan":
        return I.card;
      case "savings":
        return I.vault;
      case "invest":
        return I.spark;
      default:
        return I.bank;
    }
  })();

  const ownerColor = props.ownership === "shared" ? sp.pillFg : palette.ink2;
  const ownerBg = props.ownership === "shared" ? sp.pillBg : palette.tinted;

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.surface,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: palette.brandTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <InstIcon color={palette.brand} size={18} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 14.5, fontWeight: "500", color: palette.ink1, lineHeight: 18 }}
            >
              {props.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: palette.ink3 }}>
                {props.institution}
              </Text>
              {props.mask ? (
                <Text style={{ fontFamily: "Menlo", fontSize: 11, color: palette.ink3 }}>
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

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: 2,
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
      ) : null}

      {!isCredit &&
      kind !== "invest" &&
      props.effectiveAvailableCents != null &&
      props.effectiveAvailableCents !== props.balanceCents ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: palette.sunken,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <I.link color={palette.ink2} size={12} />
            <Text style={{ fontSize: 12, color: palette.ink2 }}>Effective available</Text>
          </View>
          <Money
            cents={props.effectiveAvailableCents}
            splitCents
            style={{ fontSize: 14, fontWeight: "600", color: palette.ink1 }}
            centsStyle={{ color: palette.ink3 }}
          />
        </View>
      ) : null}

      {isError && props.onReconnectPress ? (
        <Pressable
          onPress={props.onReconnectPress}
          disabled={props.reconnecting}
          style={{
            marginTop: 6,
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
    </Pressable>
  );
}

// Suppress unused-mode warning when downstream doesn't use it.
void (undefined as unknown as LinkTintMode);
