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

type Props = NativeStackScreenProps<RootStackParamList, "VerifyEmail">;

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
      // Navigate immediately for better UX
      navigation.reset({
        index: 0,
        routes: [{ name: "Sheets", params: { autoAccepted: data.pendingInvitesAccepted > 0 } }],
      });
      console.log("Navigation reset called.");
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
              <Text style={{ color: COLORS.text, fontWeight: "700" }}> {email}</Text>.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={COLORS.text3}
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
    fontSize: 24,
    color: COLORS.text,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 8,
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  footerText: { fontSize: 13, color: COLORS.text2, fontWeight: "600" },
  footerLink: { fontSize: 13, color: COLORS.primary, fontWeight: "800" },
});
