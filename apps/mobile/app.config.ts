import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "ClearViewCash",
  slug: "clearviewcash",
  version: "0.1.0",
  orientation: "portrait",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? "clearviewcash",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.ruktech.clearviewcash",
    infoPlist: {
      NSFaceIDUsageDescription: "Use Face ID to unlock your finances",
    },
  },
  android: {
    package: "com.ruktech.clearviewcash",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#0EA5E9",
    },
  },
  web: {
    bundler: "metro",
    output: "single",
  },
  plugins: ["expo-router", "expo-secure-store", "expo-local-authentication"],
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },
  extra: {
    eas: { projectId: "" },
  },
};

export default config;
