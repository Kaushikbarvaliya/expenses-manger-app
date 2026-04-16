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
import { setStoredUser } from "../storage/auth";
import theme from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyEmail">;


export function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

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

      // Auto-login after successful verification
      await setStoredUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        token: data.token,
      });

      console.log("User stored, resetting navigation to Sheets...");
      console.log("User data being stored:", data);
      // Add small delay to ensure AsyncStorage completes
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Sheets", params: { autoAccepted: data.pendingInvitesAccepted > 0 } }],
        });
        console.log("Navigation reset called.");
      }, 100);
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
