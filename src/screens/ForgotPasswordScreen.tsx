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
import theme from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;


export function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await apiFetch<{ message: string }>("/auth/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      Alert.alert("Success", "OTP has been sent to your email.");
      setStep(2);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    try {
      await apiFetch<{ message: string }>("/auth/forgot-password/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });
      setStep(3);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await apiFetch<{ message: string }>("/auth/forgot-password/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      Alert.alert("Success", "Password updated successfully!");
      navigation.navigate("Login");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reset password");
    } finally {
      setLoading(false);
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
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
               <Text style={styles.backBtnText}>← Back to Login</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {step === 1 ? "Forgot Password" : step === 2 ? "Verify identity" : "Reset Password"}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 
                ? "Enter your email to receive a password reset code." 
                : step === 2 
                ? `Enter the 6-digit code sent to ${email}`
                : "Create a new strong password for your account."}
            </Text>

            {step === 1 && (
              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.COLORS.text4}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            )}

            {step === 2 && (
              <View style={styles.field}>
                <Text style={styles.label}>OTP Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  placeholderTextColor={theme.COLORS.text4}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity onPress={handleSendOtp} style={{ marginTop: 8 }}>
                   <Text style={{ color: theme.COLORS.primary, fontWeight: "700", fontSize: 13 }}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    placeholderTextColor={theme.COLORS.text4}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat new password"
                    placeholderTextColor={theme.COLORS.text4}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
              onPress={() => {
                if (step === 1) void handleSendOtp();
                else if (step === 2) void handleVerifyOtp();
                else void handleResetPassword();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 1 ? "Send Code" : step === 2 ? "Verify Code" : "Reset Password"}
                </Text>
              )}
            </TouchableOpacity>
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
    ...theme.COMPONENT_STYLES.input,
    backgroundColor: theme.COLORS.surface2,
    fontSize: theme.FONTS.size["2xl"],
    fontWeight: theme.FONTS.weight.medium,
  },
  primaryButton: {
    ...theme.COMPONENT_STYLES.button,
    marginTop: theme.SPACING.base,
  },
  primaryButtonText: theme.TYPOGRAPHY.button,
});
