import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getStoredUser } from "../storage/auth";
import type { RootStackParamList } from "./types";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { VerifyEmailScreen } from "../screens/VerifyEmailScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen";
import { SheetsScreen } from "../screens/SheetsScreen";
import { ExpenseFormScreen } from "../screens/ExpenseFormScreen";
import { BudgetFormScreen } from "../screens/BudgetFormScreen";
import { IncomeFormScreen } from "../screens/IncomeFormScreen";
import { AddTransactionScreen } from "../screens/AddTransactionScreen";
import { RecurringListScreen } from "../screens/RecurringListScreen";
import { AddEditRecurringScreen } from "../screens/AddEditRecurringScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { AppTabs } from "./AppTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      // We still run bootstrap to ensure storage is ready, but we don't force a route change here
      await getStoredUser();
      setBootstrapped(true);
    };
    void bootstrap();
  }, []);

  if (!bootstrapped) return null;

  return (
    <Stack.Navigator initialRouteName="App">
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign In" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Create account" }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: "Verify email" }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Forgot Password" }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
      <Stack.Screen name="Sheets" component={SheetsScreen} options={{ title: "Choose a sheet" }} />
      <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />

      <Stack.Screen
        name="ExpenseForm"
        component={ExpenseFormScreen}
        options={({ route }) => ({
          headerShown: false,
          presentation: "modal", // Native modal behavior
        })}
      />
      <Stack.Screen 
        name="BudgetForm" 
        component={BudgetFormScreen} 
        options={{ 
          headerShown: false, 
          presentation: "modal" // Native modal behavior 
        }} 
      />
      <Stack.Screen 
        name="IncomeForm"
        component={IncomeFormScreen}
        options={{
          headerShown: false,
          presentation: "modal"
        }}
      />
      <Stack.Screen 
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          headerShown: false,
          presentation: "modal"
        }}
      />
      <Stack.Screen name="RecurringList" component={RecurringListScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="AddEditRecurring" 
        component={AddEditRecurringScreen} 
        options={{ headerShown: false, presentation: "modal" }} 
      />
      <Stack.Screen name="Report" component={ReportScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

