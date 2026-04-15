import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, TouchableOpacity, StyleSheet, Text, Platform, Modal, Pressable, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Home, BarChart2, Calendar, Settings, Plus } from "lucide-react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { BudgetsScreen } from "../screens/BudgetsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TabParamList } from "./types";
import { COLORS } from "../constants/design";
import { useAppSelector } from "../store/hooks";

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const IconComponent = {
    Home: Home,
    Report: BarChart2,
    Plan: Calendar,
    Settings: Settings,
  }[name] || Home;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 10 }}>
      <IconComponent 
        size={24} 
        color={focused ? COLORS.primary : COLORS.text3} 
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

const Tab = createBottomTabNavigator<TabParamList>();

export function AppTabs({ navigation }: any) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const isLoggedIn = useAppSelector((state) => state.transactions.isLoggedIn);

  const handleFabPress = () => {
    if (!isLoggedIn) {
      Alert.alert(
        "Sign In Required",
        "Please sign in or create an account to add transactions.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }
    setShowAddMenu(true);
  };

  const handleAddPress = (type: "Expense" | "Income") => {
    setShowAddMenu(false);
    navigation.navigate(type === "Expense" ? "ExpenseForm" : "IncomeForm", { mode: "add" });
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.text3,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
          ),
          tabBarLabelStyle: styles.tabBarLabel,
        })}
      >
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Report" component={ReportScreen} />
        
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

      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleAddPress("Income")}
            >
              <View style={[styles.menuIcon, { backgroundColor: COLORS.green + "20" }]}>
                <Text style={{fontSize: 24}}>💰</Text>
              </View>
              <Text style={styles.menuText}>Add Income</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleAddPress("Expense")}
            >
              <View style={[styles.menuIcon, { backgroundColor: COLORS.red + "20" }]}>
                <Text style={{fontSize: 24}}>💸</Text>
              </View>
              <Text style={styles.menuText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 150,
  },
  menuContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  menuItem: {
    alignItems: "center",
    gap: 12,
  },
  menuIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
});

