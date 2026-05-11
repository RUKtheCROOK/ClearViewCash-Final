"use client";

import { useTheme } from "../../../lib/theme-provider";
import { EmptyScaffold } from "../EmptyScaffold";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloFlag } from "../illustrations";

interface Props {
  onCreate?: () => void;
  onPickStarter?: (kind: "save" | "payoff") => void;
}

export function EmptyGoals({ onCreate, onPickStarter }: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  return (
    <StateScreen>
      <StateHeader title="Goals" sub="No goals yet" space={{ name: "Personal", hue: 195 }} />
      <EmptyScaffold
        illo={<IlloFlag accent="var(--pos)" />}
        accent="pos"
        eyebrow="ONE THING AT A TIME"
        title="What are you trying to do with your money?"
        body="Build savings, pay off a debt, or save for something specific. Pick one to start — you can add more later."
        primary={{ label: "Create my first goal", onPress: onCreate }}
      />
      <div style={{ padding: "4px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { l: "SAVE", t: "Emergency fund", sub: "3 months of expenses", hue: 155, kind: "save" as const },
          { l: "PAY OFF", t: "Credit card debt", sub: "Avalanche or snowball", hue: 25, kind: "payoff" as const },
        ].map((x) => (
          <button
            type="button"
            key={x.l}
            onClick={() => onPickStarter?.(x.kind)}
            style={{
              padding: 12,
              borderRadius: 12,
              textAlign: "left",
              cursor: "pointer",
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <StateMono
              style={{
                fontSize: 9,
                color: isDark ? `oklch(72% 0.110 ${x.hue})` : `oklch(48% 0.085 ${x.hue})`,
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              {x.l}
            </StateMono>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                fontWeight: 500,
                color: "var(--ink-1)",
                marginTop: 4,
              }}
            >
              {x.t}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              {x.sub}
            </div>
          </button>
        ))}
      </div>
    </StateScreen>
  );
}
