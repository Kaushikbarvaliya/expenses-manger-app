import React, { useEffect, useState } from "react";
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
import { getStoredUser } from "../storage/auth";
import type { StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { COLORS } from "../constants/design";

export function ChangePasswordScreen({ navigation, route }: any) {
  const { step: initialStep = 1 } = route.params || {};
  const [user, setUser] = useState<StoredUser | null>(null);
  const [step, setStep] = useState<1 | 2>(initialStep);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getStoredUser().then((u) => setUser(u));
  }, []);

  const handleSendOtp = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      await apiFetch<{ message: string }>("/auth/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: user.email.toLowerCase() }),
      });
      Alert.alert("OTP Sent", "A verification code has been sent to your registered email.");
      setStep(2);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!otp.trim() || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch<{ message: string }>("/auth/forgot-password/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: user?.email?.toLowerCase(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      Alert.alert("Success", "Your password has been updated successfully.");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
         <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
             <Text style={styles.backLinkText}>← Back to Settings</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              {step === 1 
                ? "We will send a one-time password (OTP) to your registered email to verify your identity."
                : "Enter the 6-digit code sent to your email and choose a new password."}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Registered Email</Text>
              <TextInput
                style={[styles.input, { opacity: 0.6 }]}
                value={user.email}
                editable={false}
              />
            </View>

            {step === 2 && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Verification Code (OTP)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor={COLORS.text3}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.text3}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
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
              onPress={step === 1 ? handleSendOtp : handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 1 ? "Send Verification OTP" : "Update Password"}
                </Text>
              )}
            </TouchableOpacity>

            {step === 2 && (
               <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                  <Text style={styles.resendBtnText}>Resend OTP</Text>
               </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  backLink: { marginBottom: 20 },
  backLinkText: { color: COLORS.text2, fontWeight: "700", fontSize: 14 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.text2, fontWeight: "600", marginBottom: 8, lineHeight: 20 },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: "900", color: COLORS.text3, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  resendBtn: { marginTop: 8, alignItems: "center" },
  resendBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 13 },
});
