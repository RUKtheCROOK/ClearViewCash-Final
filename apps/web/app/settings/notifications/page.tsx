"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { useTheme } from "../../../lib/theme-provider";
import { useNotificationPreferences } from "../../../lib/notification-preferences";
import {
  Channel,
  Group,
  PageHeader,
  Row,
  SectionLabel,
  ToggleRow,
} from "../_components/SettingsAtoms";
import { NotifPermissionDeclined } from "../../../components/states";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export default function NotificationsPage() {
  const { resolved } = useTheme();
  const { prefs, loading, update } = useNotificationPreferences();
  const [email, setEmail] = useState<string>("");
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }
    setBrowserPermission(Notification.permission);
  }, []);

  const showPushBlocked =
    browserPermission === "denied" || (prefs != null && !prefs.push_enabled && browserPermission !== "granted");

  async function requestPush() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    const result = await Notification.requestPermission();
    setBrowserPermission(result);
    if (result === "granted") await update({ push_enabled: true });
  }

  const channelCount = prefs ? [prefs.push_enabled, prefs.email_enabled, prefs.sms_enabled].filter(Boolean).length : 0;
  const toggles = prefs
    ? [
        prefs.bill_reminders,
        prefs.low_balance,
        prefs.large_transactions,
        prefs.weekly_summary,
        prefs.budget_warnings,
        prefs.goal_milestones,
        prefs.unusual_spending,
        prefs.plaid_connection_issues,
      ]
    : [];
  const enabledCount = toggles.filter(Boolean).length + 1;

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader
          title="Notifications"
          sub={loading ? "Loading…" : `${enabledCount} of ${toggles.length + 1} enabled · across ${channelCount} channels`}
          backHref="/settings"
        />

        {showPushBlocked ? (
          <NotifPermissionDeclined
            onOpenSettings={browserPermission === "denied" ? undefined : requestPush}
            askAgainNote={
              browserPermission === "denied"
                ? "Push is blocked in your browser. Allow notifications for this site to turn it back on."
                : undefined
            }
          />
        ) : null}

        {/* Master delivery card */}
        <div style={{ padding: "8px 16px 0" }}>
          <div style={{ padding: 14, borderRadius: 14, background: "var(--bg-surface)", border: "1px solid var(--line-soft)" }}>
            <div style={{ fontFamily: "var(--font-num)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>
              Deliver via
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Channel on={!!prefs?.push_enabled} label="Push" onToggle={() => update({ push_enabled: !prefs?.push_enabled })} disabled={loading} />
              <Channel on={!!prefs?.email_enabled} label="Email" onToggle={() => update({ email_enabled: !prefs?.email_enabled })} disabled={loading} />
              <Channel on={!!prefs?.sms_enabled} label="SMS" onToggle={() => update({ sms_enabled: !prefs?.sms_enabled })} disabled={loading} />
            </div>
            <div style={{ marginTop: 10, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
              Push goes to <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>this device</span>
              {email ? (
                <>
                  . Email to <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{email}</span>.
                </>
              ) : (
                <>.</>
              )}
            </div>
          </div>
        </div>

        {/* MONEY MOVING */}
        <SectionLabel>MONEY MOVING</SectionLabel>
        <Group>
          <ToggleRow mode={resolved} glyph="card" hue={195} title="Bill reminders" sub="Heads up 3 days before a bill is due, plus the day of." on={!!prefs?.bill_reminders} onChange={(v) => update({ bill_reminders: v })} />
          <ToggleRow mode={resolved} glyph="warn" hue={35} title="Low balance" sub={`Ping if any checking dips below $${((prefs?.low_balance_threshold_cents ?? 25000) / 100).toFixed(0)}.`} on={!!prefs?.low_balance} onChange={(v) => update({ low_balance: v })} />
          <ToggleRow mode={resolved} glyph="warn" hue={25} title="Large transactions" sub={`Anything over $${((prefs?.large_txn_personal_cents ?? 20000) / 100).toFixed(0)} personal, or $${((prefs?.large_txn_shared_cents ?? 50000) / 100).toFixed(0)} shared.`} on={!!prefs?.large_transactions} onChange={(v) => update({ large_transactions: v })} last />
        </Group>

        <SectionLabel>INSIGHTS &amp; SUMMARIES</SectionLabel>
        <Group>
          <ToggleRow mode={resolved} glyph="info" hue={220} title="Weekly summary" sub="Sent every Monday morning — money in, out, and what's coming up." on={!!prefs?.weekly_summary} onChange={(v) => update({ weekly_summary: v })} />
          <ToggleRow mode={resolved} glyph="info" hue={155} title="Budget warnings" sub="When you hit 80% of any budget category for the month." on={!!prefs?.budget_warnings} onChange={(v) => update({ budget_warnings: v })} />
          <ToggleRow mode={resolved} glyph="info" hue={45} title="Goal milestones" sub="At 25%, 50%, 75% — and the moment you reach a savings goal." on={!!prefs?.goal_milestones} onChange={(v) => update({ goal_milestones: v })} />
          <ToggleRow mode={resolved} glyph="info" hue={75} title="Unusual spending patterns" sub="If we notice a category trending way over your usual." on={!!prefs?.unusual_spending} onChange={(v) => update({ unusual_spending: v })} last />
        </Group>

        <SectionLabel>ACCOUNT &amp; SECURITY</SectionLabel>
        <Group>
          <ToggleRow mode={resolved} glyph="shield" hue={155} title="New device sign-ins" sub="Always on for security — alerts can't be disabled, only routed." on={true} disabled />
          <ToggleRow mode={resolved} glyph="plug" hue={240} title="Plaid connection issues" sub="When a bank reauth is needed so your data keeps flowing." on={!!prefs?.plaid_connection_issues} onChange={(v) => update({ plaid_connection_issues: v })} last />
        </Group>

        <SectionLabel>QUIET HOURS</SectionLabel>
        <Group>
          <ToggleRow
            mode={resolved}
            title="Pause non-urgent pushes"
            sub={`${(prefs?.quiet_hours_start ?? "22:00").slice(0, 5)} – ${(prefs?.quiet_hours_end ?? "07:00").slice(0, 5)}`}
            on={!!prefs?.quiet_hours_enabled}
            onChange={(v) => update({ quiet_hours_enabled: v })}
          />
          <Row mode={resolved} title="Time zone" value={prefs?.time_zone ?? "America/Los_Angeles"} last right={null} />
        </Group>

        <div style={{ padding: "24px 16px 0", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
            We never email or push you marketing. Only stuff about your money.
          </span>
        </div>
      </div>
    </main>
  );
}
