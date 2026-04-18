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
import { getStoredUser, setStoredUser, getActiveSheetId, setActiveSheetId } from "../storage/auth";
import { getGuestId } from "../storage/auth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearGuestTransactions,
  login,
  selectGuestTransactions,
  setLoggedIn,
} from "../store/slices/transactionSlice";
import { SheetSelectionModal } from "../components/SheetSelectionModal";
import theme from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
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

  const handleSheetSelected = async (sheetId: string, sheetName: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const currentGuestId = await getGuestId();

      // Use the new merge-guest-data endpoint with selected sheet
      const mergeResult = await apiFetch("/auth/merge-guest-data", {
        method: "POST",
        token: user.token,
        body: JSON.stringify({
          guestExpenses: expenses,
          guestIncomes: incomes,
          guestId: currentGuestId,
          sheetId: sheetId,
        }),
      });

      const { results } = mergeResult as { results: { expensesMerged: number; expensesSkipped: number; incomesMerged: number; incomesSkipped: number; errors: string[] } };

      // Show merge results to user
      const totalMerged = results.expensesMerged + results.incomesMerged;
      const totalSkipped = results.expensesSkipped + results.incomesSkipped;

      if (totalMerged > 0) {
        let message = `Successfully merged ${totalMerged} transaction(s) into "${sheetName}"`;
        if (totalSkipped > 0) {
          message += ` and skipped ${totalSkipped} duplicate(s)`;
        }
        if (results.errors.length > 0) {
          message += `. Some items had errors.`;
        }
        Alert.alert("Merge Complete", message);
      }

      // Set active sheet and navigate to App immediately
      await setActiveSheetId(sheetId);
      dispatch(login());
      navigation.replace("App");
    } catch (syncErr: unknown) {
      const message = syncErr instanceof Error ? syncErr.message : "Sync failed";
      Alert.alert("Sync Error", `Could not sync guest data: ${message}. You are logged in but guest data was not merged.`);
      dispatch(login());
      navigation.replace("Sheets");
    } finally {
      setLoading(false);
    }
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
              onPress: () => {
                // Store user and show sheet selection modal
                setUser(user);
                setShowSheetModal(true);
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
    <>
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
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SheetSelectionModal
        visible={showSheetModal}
        onClose={() => setShowSheetModal(false)}
        onSheetSelected={handleSheetSelected}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: theme.COMPONENT_STYLES.safeArea,
  container: {
    ...theme.COMPONENT_STYLES.screen,
    justifyContent: "center"
  },
  card: {
    ...theme.COMPONENT_STYLES.cardLarge,
    gap: theme.SPACING.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.SPACING.lg,
    marginBottom: theme.SPACING.base
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: theme.BORDER_RADIUS.xl,
    backgroundColor: theme.COLORS.primary,
  },
  brandName: {
    ...theme.TYPOGRAPHY.h5,
    color: theme.COLORS.text
  },
  title: {
    ...theme.TYPOGRAPHY.h2,
    letterSpacing: -0.4
  },
  subtitle: {
    ...theme.TYPOGRAPHY.body,
    marginBottom: theme.SPACING.lg
  },
  field: { gap: theme.SPACING.base },
  label: theme.TYPOGRAPHY.label,
  input: theme.COMPONENT_STYLES.input,
  primaryButton: {
    ...theme.COMPONENT_STYLES.button,
    marginTop: theme.SPACING.base,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: theme.TYPOGRAPHY.button,
  linkButton: {
    paddingVertical: theme.SPACING.base,
    alignItems: "center"
  },
  linkText: {
    ...theme.TYPOGRAPHY.link,
    fontSize: theme.FONTS.size.sm
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.SPACING.lg,
    marginVertical: theme.SPACING.base
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.COLORS.border
  },
  dividerText: {
    ...theme.TYPOGRAPHY.caption,
    fontWeight: theme.FONTS.weight.semibold
  },
  guestButton: {
    ...theme.COMPONENT_STYLES.buttonOutline,
    borderWidth: 2,
    backgroundColor: theme.COLORS.surface2,
  },
  guestButtonText: {
    ...theme.TYPOGRAPHY.buttonText,
    color: theme.COLORS.text2,
    fontWeight: theme.FONTS.weight.black
  },
});
