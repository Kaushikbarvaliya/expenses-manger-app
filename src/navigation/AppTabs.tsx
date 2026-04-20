import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, TouchableOpacity, StyleSheet, Text, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Home, BarChart2, Calendar, Settings, Plus, Repeat } from "lucide-react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { RecurringListScreen } from "../screens/RecurringListScreen";
import { BudgetsScreen } from "../screens/BudgetsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TabParamList } from "./types";
import { DESIGN_COLORS } from "../constants/design";
import { useAppSelector } from "../store/hooks";

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const IconComponent = {
    Home: Home,
    Recurring: Repeat,
    Plan: Calendar,
    Settings: Settings,
  }[name] || Home;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 10 }}>
      <IconComponent
        size={24}
        color={focused ? DESIGN_COLORS.primary : DESIGN_COLORS.text3}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

const Tab = createBottomTabNavigator<TabParamList>();

export function AppTabs({ navigation }: any) {
  const isLoggedIn = useAppSelector((state) => state.transactions.isLoggedIn);

  const handleFabPress = () => {
    navigation.navigate("AddTransaction");
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarActiveTintColor: DESIGN_COLORS.primary,
          tabBarInactiveTintColor: DESIGN_COLORS.text3,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
          ),
          tabBarLabelStyle: styles.tabBarLabel,
        })}
      >
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Recurring" component={RecurringListScreen} />

        <Tab.Screen
          name="AddPlaceholder"
          component={View as any}
          options={{
            tabBarLabel: () => null,
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.floatingButtonContainer}
                activeOpacity={0.9}
                onPress={handleFabPress}
              >
                <View style={styles.floatingButton}>
                  <Plus size={32} color="#fff" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            ),
          }}
        />

        <Tab.Screen name="Plan" component={BudgetsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 20,
    left: 15,
    right: 15,
    elevation: 10,
    backgroundColor: "transparent",
    borderRadius: 25,
    height: 70,
    borderTopWidth: 0,
    // Removed overflow: 'hidden' to allow floating button to display fully
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "700",
    paddingBottom: 10,
  },
  floatingButtonContainer: {
    top: -25, // Adjusted to sit higher as in the image
    justifyContent: "center",
    alignItems: "center",
    width: 70,
  },
  floatingButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: DESIGN_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: DESIGN_COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});

