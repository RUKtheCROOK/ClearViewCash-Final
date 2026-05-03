import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";

export default function Gate() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session) router.replace("/(tabs)/dashboard");
    else router.replace("/(auth)/sign-in");
  }, [session, loading]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
