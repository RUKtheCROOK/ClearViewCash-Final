import { Tabs } from "expo-router";
import { View } from "react-native";
import { I, type IconKey } from "@cvc/ui";
import { SpaceHeader } from "../../components/SpaceHeader";
import { DashboardHeaderProvider } from "../../components/DashboardHeaderContext";
import { useTheme } from "../../lib/theme";

interface TabDef {
  name: string;
  title: string;
  icon: IconKey;
}

const TABS: TabDef[] = [
  { name: "dashboard", title: "Home", icon: "home" },
  { name: "accounts", title: "Accounts", icon: "card" },
  { name: "transactions", title: "Activity", icon: "summary" },
  { name: "plan", title: "Plan", icon: "brief" },
  { name: "you", title: "You", icon: "user" },
];

const HIDDEN_ROUTES = ["bills", "income", "forecast", "budgets", "goals", "reports"];

export default function TabsLayout() {
  const { palette } = useTheme();
  return (
    <DashboardHeaderProvider>
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
        <SpaceHeader />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: palette.ink1,
            tabBarInactiveTintColor: palette.ink3,
            tabBarStyle: {
              backgroundColor: palette.surface,
              borderTopColor: palette.line,
              borderTopWidth: 1,
              paddingTop: 6,
              paddingBottom: 10,
              height: 68,
            },
            tabBarLabelStyle: {
              fontSize: 11.5,
              fontWeight: "500",
              marginTop: 2,
            },
          }}
        >
          {TABS.map(({ name, title, icon }) => {
            const Icon = I[icon];
            return (
              <Tabs.Screen
                key={name}
                name={name}
                options={{
                  title,
                  tabBarIcon: ({ color }) => <Icon color={color} size={22} />,
                }}
              />
            );
          })}
          {HIDDEN_ROUTES.map((name) => (
            <Tabs.Screen key={name} name={name} options={{ href: null }} />
          ))}
        </Tabs>
      </View>
    </DashboardHeaderProvider>
  );
}
