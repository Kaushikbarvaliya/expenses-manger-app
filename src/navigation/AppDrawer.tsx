import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import type { DrawerParamList } from "./types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ExpensesScreen } from "../screens/ExpensesScreen";
import { IncomeScreen } from "../screens/IncomeScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { BudgetsScreen } from "../screens/BudgetsScreen";
import { MembersScreen } from "../screens/MembersScreen";

const Drawer = createDrawerNavigator<DrawerParamList>();

export function AppDrawer() {
  return (
    <Drawer.Navigator initialRouteName="Dashboard">
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Expenses" component={ExpensesScreen} />
      <Drawer.Screen name="Income" component={IncomeScreen} />
      <Drawer.Screen name="Budgets" component={BudgetsScreen} />
      <Drawer.Screen name="Members" component={MembersScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

