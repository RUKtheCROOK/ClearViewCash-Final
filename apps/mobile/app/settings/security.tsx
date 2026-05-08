import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Group, PageHeader, Row, SectionLabel } from "../../components/settings/SettingsAtoms";
import { Si } from "../../components/settings/settingsGlyphs";

export default function Security() {
  const { palette, mode } = useTheme();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [has2fa, setHas2fa] = useState<boolean | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    refresh();
    LocalAuthentication.hasHardwareAsync().then(async (has) => {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(has && enrolled);
    });
  }, []);

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) {
      setHas2fa(false);
      return;
    }
    setHas2fa((data.totp ?? []).some((f) => f.status === "verified"));
  }

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) throw new Error(error?.message ?? "Failed to start 2FA");
      setOtpUri(data.totp.uri);
      setFactorId(data.id);
    } catch (e) {
      Alert.alert("Couldn't start 2FA", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!factorId || !code) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      setOtpUri(null);
      setFactorId(null);
      setCode("");
      Alert.alert("2FA enabled", "Future sign-ins will require a code from your authenticator.");
      await refresh();
    } catch (e) {
      Alert.alert("Couldn't verify", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disable2fa() {
    Alert.alert(
      "Disable two-factor auth?",
      "Sign-ins will only require your password. Less secure.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            const { data } = await supabase.auth.mfa.listFactors();
            const totp = (data?.totp ?? [])[0];
            if (!totp) return;
            const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
            if (error) {
              Alert.alert("Couldn't disable", error.message);
              return;
            }
            await refresh();
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="Security" onBack={() => router.back()} />

        {/* Promoted card if no 2FA */}
        {has2fa === false && !otpUri ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <View
              style={{
                padding: 14,
                borderRadius: 14,
                backgroundColor: palette.warnTint,
                borderWidth: 1,
                borderColor: mode === "dark" ? "oklch(40% 0.080 65)" : "oklch(88% 0.040 65)",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center" }}>
                {Si.shield(palette.warn)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                  Add a second check at login
                </Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink2, marginTop: 2, lineHeight: 16 }}>
                  Use an authenticator app like 1Password, Authy, or Google Authenticator.
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <SectionLabel palette={palette}>TWO-FACTOR AUTH</SectionLabel>
        <Group palette={palette}>
          {has2fa === null ? (
            <Row palette={palette} title="Loading…" right={null} last />
          ) : has2fa ? (
            <>
              <Row palette={palette} title="Status" value="Enabled" right={null} />
              <Row palette={palette} title="Disable two-factor auth" sub="Drops back to password-only sign-in." danger onPress={disable2fa} last />
            </>
          ) : !otpUri ? (
            <Row palette={palette} title="Enable two-factor auth" sub="Set up a TOTP code in your authenticator." onPress={startEnroll} last />
          ) : (
            <View style={{ padding: 18, gap: 12 }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>Scan in your authenticator</Text>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: palette.sunken, borderWidth: 1, borderColor: palette.line }}>
                <Text selectable style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink2, lineHeight: 16 }}>
                  {otpUri}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>Enter the 6-digit code:</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={palette.ink4}
                keyboardType="number-pad"
                autoFocus
                maxLength={6}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  fontFamily: fonts.numMedium,
                  fontSize: 18,
                  color: palette.ink1,
                  letterSpacing: 4,
                  textAlign: "center",
                }}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    setOtpUri(null);
                    setFactorId(null);
                    setCode("");
                  }}
                  style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: palette.lineFirm, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={verifyOtp}
                  disabled={busy || code.length < 6}
                  style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", opacity: busy || code.length < 6 ? 0.5 : 1 }}
                >
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>{busy ? "Verifying…" : "Verify"}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Group>

        <SectionLabel palette={palette}>BIOMETRICS</SectionLabel>
        <Group palette={palette}>
          <Row
            palette={palette}
            title="Device biometrics"
            sub={
              biometricsAvailable === null
                ? "Checking…"
                : biometricsAvailable
                  ? "Available — set up Face ID / Touch ID at next sign-in."
                  : "Not available on this device."
            }
            value={biometricsAvailable ? "Available" : "—"}
            right={null}
            last
          />
        </Group>
      </ScrollView>
    </View>
  );
}
