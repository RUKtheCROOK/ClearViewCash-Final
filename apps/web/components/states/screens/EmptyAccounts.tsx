"use client";

import { EmptyScaffold } from "../EmptyScaffold";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloVault } from "../illustrations";

interface Props {
  onLink?: () => void;
  onAddManually?: () => void;
}

export function EmptyAccounts({ onLink, onAddManually }: Props) {
  return (
    <StateScreen>
      <StateHeader title="Accounts" sub="0 institutions · 0 accounts" space={{ name: "Personal", hue: 195 }} />
      <EmptyScaffold
        illo={<IlloVault />}
        eyebrow="ONE-TIME · 90 SECONDS"
        title="Link your first account"
        body="Pull in balances and transactions from any U.S. bank or card. Read-only — we never see your password and can't move money."
        primary={{ label: "Link an account", onPress: onLink }}
        secondary={{ label: "Add manually instead", onPress: onAddManually }}
        footnote={
          <>
            Bank-grade security via <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>Plaid</span> · 256-bit
            encryption · You stay in control
          </>
        }
      />
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { l: "READ", v: "Only" },
            { l: "OWN", v: "Your data" },
            { l: "EXPORT", v: "Anytime" },
          ].map((x) => (
            <div
              key={x.l}
              style={{
                padding: "10px 8px",
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                textAlign: "center",
              }}
            >
              <StateMono style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.06em", fontWeight: 600 }}>
                {x.l}
              </StateMono>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-1)",
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                {x.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StateScreen>
  );
}
