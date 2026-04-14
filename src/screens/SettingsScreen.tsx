import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearStoredUser, getStoredUser } from "../storage/auth";
import type { StoredUser } from "../navigation/types";
import { COLORS } from "../constants/design";
import { apiFetch } from "../api/client";

export function SettingsScreen({ navigation }: any) {
  const [user, setUser] = useState<StoredUser | null>(null);
  
  // Dummy toggle states for parity
  const [notifications, setNotifications] = useState({
    budget: true,
    weekly: false,
    monthly: true,
    recurring: true
  });

  useEffect(() => {
    void getStoredUser().then((u) => setUser(u));
  }, []);

  const logout = async () => {
    await clearStoredUser();
    navigation.replace("Login");
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    try {
      await apiFetch<{ message: string }>("/auth/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: user.email.toLowerCase() }),
      });
      navigation.navigate("ChangePassword", { step: 2 });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send verification OTP");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  };

  if (!user) return <View style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>👤 Profile</Text>
          
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.name || "User"}</Text>
              <Text style={styles.userEmail}>{user.email || "No email available"}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Logged In</Text>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={user.name || ""} editable={false} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={user.email || ""} editable={false} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Account Status</Text>
            <TextInput style={styles.input} value={"Authenticated"} editable={false} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.inputReadOnlyBox}>
                <Text style={{ color: COLORS.text, fontWeight: "600", fontSize: 15 }}>₹ INR - Indian Rupee</Text>
            </View>
          </View>

           <TouchableOpacity style={styles.logoutBtn} onPress={() => void logout()}>
             <Text style={styles.logoutBtnText}>Sign Out</Text>
           </TouchableOpacity>
        </View>

        {/* Notifications Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          
          {[
            { key: "budget", label: "Budget alerts" },
            { key: "weekly", label: "Weekly summary email" },
            { key: "monthly", label: "Monthly report" },
            { key: "recurring", label: "Recurring reminders" }
          ].map((item) => (
            <View key={item.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Switch
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={"#fff"}
                onValueChange={(val) => setNotifications(prev => ({ ...prev, [item.key]: val }))}
                value={(notifications as any)[item.key]}
              />
            </View>
          ))}
        </View>

        {/* Security Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🔐 Security</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleChangePassword}>
             <Text style={styles.secondaryBtnText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logoutBtn, { width: "100%", marginTop: 8 }]} onPress={() => Alert.alert("Delete Account", "Contact support to delete account from mobile app.")}>
             <Text style={styles.logoutBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  pageTitle: { fontSize: 28, fontWeight: "900", color: COLORS.text },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 20 },
  
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accent,
    justifyContent: "center", alignItems: "center"
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#ffffff" },
  userName: { fontWeight: "800", fontSize: 16, color: COLORS.text, marginBottom: 2 },
  userEmail: { fontSize: 13, color: COLORS.text3, fontWeight: "500", marginBottom: 6 },
  badge: {
    alignSelf: "flex-start", backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 12,
    paddingVertical: 4, paddingHorizontal: 8
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: COLORS.green },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, fontSize: 15, color: COLORS.text, fontWeight: "600", opacity: 0.7
  },
  inputReadOnlyBox: {
    backgroundColor: COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, opacity: 0.8
  },

  logoutBtn: {
    backgroundColor: COLORS.red, paddingVertical: 14, borderRadius: 12,
    alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 24
  },
  logoutBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  secondaryBtn: {
    backgroundColor: COLORS.surface2, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, alignItems: "center", alignSelf: "stretch"
  },
  secondaryBtnText: { color: COLORS.text, fontSize: 14, fontWeight: "800" },

  toggleRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: COLORS.text },
});
