import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import QRCode from "react-native-qrcode-svg";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Group, PageHeader, PromotedCard, Row, RowSkeleton, SectionLabel } from "../../components/settings/SettingsAtoms";

function extractSecret(otpUri: string): string | null {
  const match = otpUri.match(/[?&]secret=([^&]+)/i);
  return match ? decodeURIComponent(match[1]!) : null;
}

// Group the secret into 4-char chunks so it's typeable: "ABCD EFGH IJKL".
function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export default function Security() {
  const { palette } = useTheme();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [has2fa, setHas2fa] = useState<boolean | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);

  const secret = useMemo(() => (otpUri ? extractSecret(otpUri) : null), [otpUri]);

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
            <PromotedCard
              palette={palette}
              glyph="shield"
              title="Add a second check at login"
              body="Use an authenticator app like 1Password, Authy, or Google Authenticator."
            />
          </View>
        ) : null}

        <SectionLabel palette={palette}>TWO-FACTOR AUTH</SectionLabel>
        <Group palette={palette}>
          {has2fa === null ? (
            <RowSkeleton palette={palette} last />
          ) : has2fa ? (
            <>
              <Row palette={palette} title="Status" value="Enabled" right={null} />
              <Row palette={palette} title="Disable two-factor auth" sub="Drops back to password-only sign-in." danger onPress={disable2fa} last />
            </>
          ) : !otpUri ? (
            <Row palette={palette} title="Enable two-factor auth" sub="Set up a TOTP code in your authenticator." onPress={startEnroll} last />
          ) : (
            <View style={{ padding: 18, gap: 14 }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>Scan in your authenticator</Text>

              {/* QR code — primary path */}
              <View style={{ alignItems: "center", paddingVertical: 4 }}>
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: palette.line,
                  }}
                >
                  <QRCode value={otpUri} size={184} backgroundColor="#ffffff" color="#0e181b" />
                </View>
              </View>

              {/* Same-device shortcut: hand the URI to the OS so the user's
                  authenticator app can intercept it directly. */}
              <Pressable
                onPress={() => Linking.openURL(otpUri).catch(() => undefined)}
                style={({ pressed }) => ({
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: palette.lineFirm,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>
                  Open in authenticator app
                </Text>
              </Pressable>

              {/* Manual-entry fallback — the secret only, not the full URI.
                  Selectable so long-press → Copy works without a clipboard
                  dependency. */}
              {secret ? (
                <View style={{ paddingTop: 4, gap: 6 }}>
                  <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                    Can't scan? Enter this code manually:
                  </Text>
                  <View style={{ padding: 12, borderRadius: 10, backgroundColor: palette.sunken, borderWidth: 1, borderColor: palette.line }}>
                    <Text
                      selectable
                      style={{
                        fontFamily: fonts.numMedium,
                        fontSize: 14,
                        color: palette.ink1,
                        letterSpacing: 1,
                        textAlign: "center",
                      }}
                    >
                      {formatSecret(secret)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, marginTop: 2 }}>Enter the 6-digit code:</Text>
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
