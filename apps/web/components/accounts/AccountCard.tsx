"use client";

import { accountKind } from "@cvc/domain";
import { I } from "../../lib/icons";
import { Money } from "../money";
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
  ownership: "private" | "shared";
  effectiveAvailableCents?: number | null;
  linkDirection: "in" | "out";
  links: LinkChip[];
  syncStatus?: "good" | "error" | "pending" | null;
  apr?: string | null;
  fullyCovered?: boolean;
  onPress: () => void;
  onReconnectPress?: () => void;
  reconnecting?: boolean;
}

export function AccountCard(props: AccountCardData) {
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

  const ownerColor = props.ownership === "shared" ? "var(--space-pill-fg)" : "var(--ink-2)";
  const ownerBg = props.ownership === "shared" ? "var(--space-pill-bg)" : "var(--bg-tinted)";

  return (
    <button
      type="button"
      onClick={props.onPress}
      style={{
        appearance: "none",
        textAlign: "left",
        cursor: "pointer",
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--brand-tint)",
              color: "var(--brand)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <InstIcon color="var(--brand)" size={18} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 14.5,
                fontWeight: 500,
                color: "var(--ink-1)",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {props.name}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
              {props.institution}
              {props.mask ? (
                <span style={{ fontFamily: "var(--font-num)", fontSize: 11, marginLeft: 4 }}>
                  ···{props.mask}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            borderRadius: 999,
            background: ownerBg,
            color: ownerColor,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {props.ownership === "shared" ? (
            <I.share color={ownerColor} size={11} />
          ) : (
            <I.lock color={ownerColor} size={11} />
          )}
          {props.ownership === "shared" ? "Household" : "Private"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginTop: 2,
        }}
      >
        <Money
          cents={props.balanceCents}
          splitCents
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--ink-1)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: isError ? "var(--warn)" : "var(--ink-3)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {isError ? <I.syncErr color="var(--warn)" size={11} /> : <I.sync color="var(--ink-3)" size={11} />}
          {isError ? "Reconnect" : props.lastSyncedAgo ?? "—"}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: -4 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
          {isCredit
            ? props.apr
              ? `Statement balance · ${props.apr} APR`
              : "Statement balance"
            : "Available balance"}
        </span>
        {props.fullyCovered ? (
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 999,
              background: "var(--pos-tint)",
              color: "var(--pos)",
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Fully covered
          </span>
        ) : null}
      </div>

      {props.links.length > 0 ? (
        <LinkStrip direction={props.linkDirection} links={props.links} />
      ) : null}

      {!isCredit &&
      kind !== "invest" &&
      props.effectiveAvailableCents != null &&
      props.effectiveAvailableCents !== props.balanceCents ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            padding: "10px 12px",
            background: "var(--bg-sunken)",
            borderRadius: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-2)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <I.link color="var(--ink-2)" size={12} />
            Effective available
          </span>
          <Money
            cents={props.effectiveAvailableCents}
            splitCents
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-1)",
            }}
          />
        </div>
      ) : null}

      {isError && props.onReconnectPress ? (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!props.reconnecting) props.onReconnectPress?.();
          }}
          style={{
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--warn-tint)",
            color: "var(--warn)",
            fontWeight: 600,
            fontSize: 13,
            textAlign: "center",
            cursor: props.reconnecting ? "default" : "pointer",
            fontFamily: "var(--font-ui)",
          }}
        >
          {props.reconnecting ? "Reconnecting…" : "Reconnect bank"}
        </span>
      ) : null}
    </button>
  );
}
