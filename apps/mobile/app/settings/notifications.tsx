import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { useNotificationPreferences } from "../../hooks/useNotificationPreferences";
import {
  Channel,
  Group,
  PageHeader,
  Row,
  SectionLabel,
  ToggleRow,
} from "../../components/settings/SettingsAtoms";

export default function Notifications() {
  const { palette, mode } = useTheme();
  const { prefs, loading, update } = useNotificationPreferences();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

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
  const enabledCount = toggles.filter(Boolean).length + 1; // +1 for forced-on new device sign-ins

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}>
        <PageHeader
          palette={palette}
          title="Notifications"
          sub={loading ? "Loading…" : `${enabledCount} of ${toggles.length + 1} enabled · across ${channelCount} channels`}
          onBack={() => router.back()}
        />

        {/* Master delivery card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ padding: 14, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }}>
            <Text
              style={{
                fontFamily: fonts.numMedium,
                fontSize: 9.5,
                color: palette.ink3,
                letterSpacing: 0.8,
                fontWeight: "600",
                textTransform: "uppercase",
              }}
            >
              Deliver via
            </Text>
            <View style={{ marginTop: 8, flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              <Channel palette={palette} on={!!prefs?.push_enabled} label="Push" onToggle={() => update({ push_enabled: !prefs?.push_enabled })} disabled={loading} />
              <Channel palette={palette} on={!!prefs?.email_enabled} label="Email" onToggle={() => update({ email_enabled: !prefs?.email_enabled })} disabled={loading} />
              <Channel palette={palette} on={!!prefs?.sms_enabled} label="SMS" onToggle={() => update({ sms_enabled: !prefs?.sms_enabled })} disabled={loading} />
            </View>
            <Text style={{ marginTop: 10, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, lineHeight: 17 }}>
              Push goes to <Text style={{ color: palette.ink2, fontWeight: "500" }}>this device</Text>
              {email ? (
                <>
                  . Email to <Text style={{ color: palette.ink2, fontWeight: "500" }}>{email}</Text>.
                </>
              ) : (
                <>.</>
              )}
            </Text>
          </View>
        </View>

        {/* MONEY MOVING */}
        <SectionLabel palette={palette}>MONEY MOVING</SectionLabel>
        <Group palette={palette}>
          <ToggleRow palette={palette} mode={mode} glyph="card" hue={195} title="Bill reminders" sub="Heads up 3 days before a bill is due, plus the day of." on={!!prefs?.bill_reminders} onChange={(v) => update({ bill_reminders: v })} />
          <ToggleRow palette={palette} mode={mode} glyph="warn" hue={35} title="Low balance" sub={`Ping if any checking dips below $${((prefs?.low_balance_threshold_cents ?? 25000) / 100).toFixed(0)}.`} on={!!prefs?.low_balance} onChange={(v) => update({ low_balance: v })} />
          <ToggleRow palette={palette} mode={mode} glyph="warn" hue={25} title="Large transactions" sub={`Anything over $${((prefs?.large_txn_personal_cents ?? 20000) / 100).toFixed(0)} personal, or $${((prefs?.large_txn_shared_cents ?? 50000) / 100).toFixed(0)} shared.`} on={!!prefs?.large_transactions} onChange={(v) => update({ large_transactions: v })} last />
        </Group>

        {/* INSIGHTS & SUMMARIES */}
        <SectionLabel palette={palette}>INSIGHTS &amp; SUMMARIES</SectionLabel>
        <Group palette={palette}>
          <ToggleRow palette={palette} mode={mode} glyph="info" hue={220} title="Weekly summary" sub="Sent every Monday morning — money in, out, and what's coming up." on={!!prefs?.weekly_summary} onChange={(v) => update({ weekly_summary: v })} />
          <ToggleRow palette={palette} mode={mode} glyph="info" hue={155} title="Budget warnings" sub="When you hit 80% of any budget category for the month." on={!!prefs?.budget_warnings} onChange={(v) => update({ budget_warnings: v })} />
          <ToggleRow palette={palette} mode={mode} glyph="info" hue={45} title="Goal milestones" sub="At 25%, 50%, 75% — and the moment you reach a savings goal." on={!!prefs?.goal_milestones} onChange={(v) => update({ goal_milestones: v })} />
          <ToggleRow palette={palette} mode={mode} glyph="info" hue={75} title="Unusual spending patterns" sub="If we notice a category trending way over your usual." on={!!prefs?.unusual_spending} onChange={(v) => update({ unusual_spending: v })} last />
        </Group>

        {/* ACCOUNT & SECURITY */}
        <SectionLabel palette={palette}>ACCOUNT &amp; SECURITY</SectionLabel>
        <Group palette={palette}>
          <ToggleRow palette={palette} mode={mode} glyph="shield" hue={155} title="New device sign-ins" sub="Always on for security — alerts can't be disabled, only routed." on={true} disabled />
          <ToggleRow palette={palette} mode={mode} glyph="plug" hue={240} title="Plaid connection issues" sub="When a bank reauth is needed so your data keeps flowing." on={!!prefs?.plaid_connection_issues} onChange={(v) => update({ plaid_connection_issues: v })} last />
        </Group>

        {/* QUIET HOURS */}
        <SectionLabel palette={palette}>QUIET HOURS</SectionLabel>
        <Group palette={palette}>
          <ToggleRow
            palette={palette}
            mode={mode}
            title="Pause non-urgent pushes"
            sub={`${(prefs?.quiet_hours_start ?? "22:00").slice(0, 5)} – ${(prefs?.quiet_hours_end ?? "07:00").slice(0, 5)}`}
            on={!!prefs?.quiet_hours_enabled}
            onChange={(v) => update({ quiet_hours_enabled: v })}
          />
          <Row palette={palette} mode={mode} title="Time zone" value={prefs?.time_zone ?? "America/Los_Angeles"} last right={null} />
        </Group>

        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, lineHeight: 17, textAlign: "center" }}>
            We never email or push you marketing. Only stuff about your money.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
