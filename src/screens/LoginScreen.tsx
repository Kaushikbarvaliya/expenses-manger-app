import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { getStoredUser, setStoredUser, getActiveSheetId } from "../storage/auth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearGuestTransactions,
  login,
  selectGuestTransactions,
  setLoggedIn,
} from "../store/slices/transactionSlice";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const { expenses, incomes } = useAppSelector(selectGuestTransactions);

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const user = await getStoredUser();
      if (user?.token) navigation.replace("Sheets");
    };
    void redirectIfLoggedIn();
  }, [navigation]);

  const handleContinueAsGuest = () => {
    dispatch(setLoggedIn(false));
    navigation.replace("App");
  };

  const handleLogin = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      Alert.alert("Missing details", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const user = await apiFetch<StoredUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: e, password }),
      });
      await setStoredUser(user);

      const hasOfflineData = expenses.length > 0 || incomes.length > 0;
      if (hasOfflineData) {
        // Must call setLoading(false) before Alert so button re-enables
        setLoading(false);
        Alert.alert(
          "Sync Guest Data?",
          `You have ${expenses.length + incomes.length} transaction(s) created as a guest. Merge them into your account?`,
          [
            {
              text: "No, Delete It",
              style: "destructive",
              onPress: () => {
                dispatch(clearGuestTransactions());
                dispatch(login());
                navigation.replace("Sheets");
              },
            },
            {
              text: "Yes, Merge",
              style: "default",
              onPress: async () => {
                setLoading(true);
                try {
                  const sid = await getActiveSheetId();

                  // Sync expenses
                  for (const exp of expenses) {
                    await apiFetch(`/expenses`, {
                      method: "POST",
                      token: user.token,
                      sheetId: sid || undefined,
                      body: JSON.stringify({
                        name: exp.name,
                        amount: exp.amount,
                        category: exp.category,
                        date: exp.date,
                        method: exp.method,
                        memberId: "self",
                        recurring: exp.recurring,
                      }),
                    }).catch(() => {});
                  }

                  // Sync incomes
                  for (const inc of incomes) {
                    await apiFetch(`/incomes`, {
                      method: "POST",
                      token: user.token,
                      sheetId: sid || undefined,
                      body: JSON.stringify({
                        name: inc.name,
                        amount: inc.amount,
                        source: inc.source,
                        date: inc.date,
                        method: inc.method,
                        memberId: "self",
                      }),
                    }).catch(() => {});
                  }

                  dispatch(login());
                  navigation.replace("Sheets");
                } catch (syncErr: unknown) {
                  Alert.alert("Sync Error", "Could not fully sync guest data, but you are logged in.");
                  dispatch(login());
                  navigation.replace("Sheets");
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
      } else {
        dispatch(login());
        navigation.replace("Sheets");
        setLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.toLowerCase().includes("verify your email")) {
        setLoading(false);
        navigation.navigate("VerifyEmail", { email: e });
        return;
      }
      Alert.alert("Login failed", message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon} />
            <Text style={styles.brandName}>SpendSmart</Text>
          </View>

          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your credentials to continue</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={() => void handleLogin()}
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
            style={{ alignSelf: "flex-end", marginTop: -4 }}
          >
            <Text style={{ color: "#6655ee", fontWeight: "700", fontSize: 13 }}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={() => void handleLogin()}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{loading ? "Signing in..." : "Sign In"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.8}
          >
            <Text style={styles.linkText}>Don't have an account? Create one</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleContinueAsGuest}
            activeOpacity={0.8}
          >
            <Text style={styles.guestButtonText}>👤  Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f4f8" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#7c6aff",
  },
  brandName: { fontSize: 16, fontWeight: "900", color: "#111827" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827", letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: "#4b5563", fontWeight: "600", marginBottom: 10 },
  field: { gap: 7 },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6b7280",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#f9fafb",
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#7c6aff",
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 15 },
  linkButton: { paddingVertical: 6, alignItems: "center" },
  linkText: { color: "#6655ee", fontWeight: "900", fontSize: 13 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  dividerText: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  guestButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#f9fafb",
    paddingVertical: 13,
    alignItems: "center",
  },
  guestButtonText: { color: "#374151", fontWeight: "800", fontSize: 14 },
});
