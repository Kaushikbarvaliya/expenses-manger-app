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

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

const COLORS = {
  primary: "#7c6aff",
  surface: "#ffffff",
  background: "#f4f4f8",
  text: "#111827",
  text2: "#4b5563",
  text3: "#9ca3af",
  border: "rgba(0,0,0,0.08)",
  accent: "#7c6aff",
};

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
                  placeholderTextColor={COLORS.text3}
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
                  placeholderTextColor={COLORS.text3}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity onPress={handleSendOtp} style={{ marginTop: 8 }}>
                   <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>Resend OTP</Text>
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
                    placeholderTextColor={COLORS.text3}
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
                    placeholderTextColor={COLORS.text3}
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: COLORS.text2, fontWeight: "700", fontSize: 14 },
  title: { fontSize: 26, fontWeight: "900", color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.text2, fontWeight: "600", marginBottom: 8, lineHeight: 20 },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: "900", color: COLORS.text3, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#fafafb",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
