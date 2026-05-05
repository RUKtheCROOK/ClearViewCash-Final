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
  { name: "bills", title: "Bills", icon: "bill" },
  { name: "income", title: "Income", icon: "bolt" },
  { name: "forecast", title: "Forecast", icon: "spark" },
  { name: "budgets", title: "Budgets", icon: "cart" },
  { name: "goals", title: "Goals", icon: "star" },
  { name: "reports", title: "Reports", icon: "chevR" },
];

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
              paddingTop: 4,
              paddingBottom: 8,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: "500",
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
                  tabBarIcon: ({ color }) => <Icon color={color} size={20} />,
                }}
              />
            );
          })}
        </Tabs>
      </View>
    </DashboardHeaderProvider>
  );
}
