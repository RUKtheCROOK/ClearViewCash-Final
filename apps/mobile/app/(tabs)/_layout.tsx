import { Tabs } from "expo-router";
import { View } from "react-native";
import { SpaceHeader } from "../../components/SpaceHeader";
import { colors } from "@cvc/ui";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SpaceHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
        <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
        <Tabs.Screen name="bills" options={{ title: "Bills" }} />
        <Tabs.Screen name="income" options={{ title: "Income" }} />
        <Tabs.Screen name="forecast" options={{ title: "Forecast" }} />
        <Tabs.Screen name="budgets" options={{ title: "Budgets" }} />
        <Tabs.Screen name="goals" options={{ title: "Goals" }} />
        <Tabs.Screen name="reports" options={{ title: "Reports" }} />
        <Tabs.Screen name="accounts" options={{ title: "Accounts" }} />
      </Tabs>
    </View>
  );
}
