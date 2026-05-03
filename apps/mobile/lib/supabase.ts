import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCvcClient } from "@cvc/api-client";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  console.warn("[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

// Web has its own localStorage; native uses AsyncStorage. SecureStore could be
// substituted for native if encryption-at-rest of the session token is needed.
const storage = Platform.OS === "web" ? undefined : AsyncStorage;

export const supabase = createCvcClient({
  url: url ?? "http://localhost:54321",
  anonKey: anonKey ?? "",
  storage,
});
