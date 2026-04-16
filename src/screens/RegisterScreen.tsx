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
import { getStoredUser, setStoredUser } from "../storage/auth";
import theme from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const user = await getStoredUser();
      if (user?.token) navigation.replace("Sheets");
    };
    void redirectIfLoggedIn();
  }, [navigation]);

  const handleRegister = async () => {
    const n = name.trim();
    const e = email.trim().toLowerCase();

    if (!n) return Alert.alert("Missing details", "Please enter your name.");
    if (!e) return Alert.alert("Missing details", "Please enter your email.");
    if (!password) return Alert.alert("Missing details", "Please enter a password.");
    if (password.length < 6) return Alert.alert("Weak password", "Password must be at least 6 characters.");
    if (password !== confirmPassword) return Alert.alert("Passwords mismatch", "Passwords do not match.");

    setLoading(true);
    try {
      const response = await apiFetch<{ message: string; email: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: n, email: e, password }),
      });
      
      Alert.alert("Success", response.message);
      navigation.navigate("VerifyEmail", { email: e });
    } catch (err: unknown) {
      Alert.alert("Registration failed", err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: "padding", android: undefined })}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Free forever — no credit card needed</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={() => void handleRegister()}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={() => void handleRegister()}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{loading ? "Creating account..." : "Create Account"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.replace("Login")} activeOpacity={0.8}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: theme.SPACING.lg, 
    alignItems: "center" 
  },
  linkText: { 
    ...theme.TYPOGRAPHY.link,
    fontSize: theme.FONTS.size.sm 
  },
});

