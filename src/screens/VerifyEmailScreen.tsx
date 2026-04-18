import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { apiFetch } from "../api/client";
import { getStoredUser, setStoredUser, getGuestId } from "../storage/auth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearGuestTransactions,
  login,
  selectGuestTransactions,
} from "../store/slices/transactionSlice";
import { SheetSelectionModal } from "../components/SheetSelectionModal";
import type { StoredUser } from "../navigation/types";
import theme from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyEmail">;


export function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const dispatch = useAppDispatch();
  const { expenses, incomes } = useAppSelector(selectGuestTransactions);

  const handleSheetSelected = async (sheetId: string, sheetName: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const currentGuestId = await getGuestId();

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

      const { results } = mergeResult as { results: { expensesMerged: number; incomesMerged: number; errors: string[] } };
      const totalMerged = results.expensesMerged + results.incomesMerged;

      if (totalMerged > 0) {
        Alert.alert("Merge Complete", `Successfully merged ${totalMerged} transaction(s) into "${sheetName}"`);
      }

      dispatch(login());
      navigation.reset({
        index: 0,
        routes: [{ name: "Sheets" }],
      });
    } catch (syncErr: unknown) {
      const message = syncErr instanceof Error ? syncErr.message : "Sync failed";
      Alert.alert("Sync Error", `Could not sync guest data: ${message}. You are verified but guest data was not merged.`);
      dispatch(login());
      navigation.reset({
        index: 0,
        routes: [{ name: "Sheets" }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp.trim() || otp.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<any>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, otp: otp.trim() }),
      });

      console.log("OTP verification success, data:", data);

      const storedUser = {
        _id: data._id,
        name: data.name,
        email: data.email,
        token: data.token,
      };
      await setStoredUser(storedUser);

      const hasOfflineData = expenses.length > 0 || incomes.length > 0;
      if (hasOfflineData) {
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
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Sheets", params: { autoAccepted: data.pendingInvitesAccepted > 0 } }],
                });
              },
            },
            {
              text: "Yes, Merge",
              style: "default",
              onPress: () => {
                setUser(storedUser);
                setShowSheetModal(true);
              },
            },
          ]
        );
      } else {
        dispatch(login());
        navigation.reset({
          index: 0,
          routes: [{ name: "Sheets", params: { autoAccepted: data.pendingInvitesAccepted > 0 } }],
        });
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      Alert.alert("Verification Failed", err.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiFetch("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      Alert.alert("Success", "A new verification code has been sent to your email.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.backBtnText}>← Back to Login</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Verify Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to
              <Text style={{ color: theme.COLORS.text, fontWeight: "700" }}> {email}</Text>.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={theme.COLORS.text4}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && { opacity: 0.7 }]}
              onPress={() => void handleVerify()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={() => void handleResend()} disabled={resending}>
                <Text style={[styles.footerLink, resending && { opacity: 0.5 }]}>
                  {resending ? "Resending..." : "Resend"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SheetSelectionModal
        visible={showSheetModal}
        onClose={() => setShowSheetModal(false)}
        onSheetSelected={handleSheetSelected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: theme.COMPONENT_STYLES.safeArea,
  container: {
    ...theme.COMPONENT_STYLES.screen,
    paddingHorizontal: theme.SPACING["3xl"]
  },
  card: {
    ...theme.COMPONENT_STYLES.cardLarge,
    gap: theme.SPACING["3xl"],
  },
  backBtn: { marginBottom: theme.SPACING.base },
  backBtnText: {
    ...theme.TYPOGRAPHY.link,
    fontSize: theme.FONTS.size.base
  },
  title: {
    ...theme.TYPOGRAPHY.h1,
    letterSpacing: -0.5
  },
  subtitle: {
    ...theme.TYPOGRAPHY.body,
    marginBottom: theme.SPACING.base,
    lineHeight: 20
  },
  field: { gap: theme.SPACING.base },
  label: theme.TYPOGRAPHY.label,
  input: {
    ...theme.COMPONENT_STYLES.inputLarge,
    backgroundColor: theme.COLORS.surface2,
    fontSize: theme.FONTS.size["5xl"],
    fontWeight: theme.FONTS.weight.black,
    textAlign: "center",
    letterSpacing: 8,
  },
  primaryButton: {
    ...theme.COMPONENT_STYLES.button,
    marginTop: theme.SPACING.base,
  },
  primaryButtonText: theme.TYPOGRAPHY.button,
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.SPACING.base
  },
  footerText: {
    ...theme.TYPOGRAPHY.bodySmall,
    fontWeight: theme.FONTS.weight.medium
  },
  footerLink: {
    ...theme.TYPOGRAPHY.link,
    fontSize: theme.FONTS.size.base
  },
});
