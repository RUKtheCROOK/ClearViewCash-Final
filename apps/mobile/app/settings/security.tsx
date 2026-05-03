import { useState } from "react";
import { ScrollView } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Button, Card, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

export default function Security() {
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);

  async function enable2FA() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) return alert(error?.message ?? "Failed to start 2FA");
    setOtpUri(data.totp.uri);
    setFactorId(data.id);
  }

  async function verify() {
    if (!factorId) return;
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error || !data) return alert(error?.message ?? "Invalid code");
    alert("2FA enabled");
    setOtpUri(null);
    setFactorId(null);
    setCode("");
  }

  async function checkBiometrics() {
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricsAvailable(has && enrolled);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="md">
          <Text variant="title">Two-factor authentication</Text>
          <Text variant="muted">Use an authenticator app like 1Password or Authy.</Text>
          {!otpUri ? (
            <Button label="Enable 2FA" onPress={enable2FA} />
          ) : (
            <Stack gap="sm">
              <Text>Scan this in your authenticator app:</Text>
              <Text variant="muted" style={{ fontFamily: "monospace" }} selectable>
                {otpUri}
              </Text>
              <Text>Enter the 6-digit code:</Text>
              {/* TextInput omitted for brevity — wire up code state */}
              <Button label="Verify" onPress={verify} disabled={!code} />
            </Stack>
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <Text variant="title">Biometrics</Text>
          <Text variant="muted">Unlock the app with Face ID / Touch ID / fingerprint.</Text>
          <Button label="Check device support" variant="secondary" onPress={checkBiometrics} />
          {biometricsAvailable !== null ? (
            <Text style={{ color: biometricsAvailable ? colors.positive : colors.negative }}>
              {biometricsAvailable ? "Available on this device" : "Not available — set up device biometrics first"}
            </Text>
          ) : null}
        </Stack>
      </Card>
    </ScrollView>
  );
}
