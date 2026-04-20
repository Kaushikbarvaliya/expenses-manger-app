import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearStoredUser, getStoredUser } from "../storage/auth";
import type { StoredUser } from "../navigation/types";
import { DESIGN_COLORS } from "../constants/design";
import { apiFetch } from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import { useAppDispatch } from "../store/hooks";
import { logout } from "../store/slices/transactionSlice";

export function SettingsScreen({ navigation }: any) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const { currency, setCurrency } = useCurrency();
  const dispatch = useAppDispatch();

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

  const logoutAction = async () => {
    dispatch(logout());
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

  if (!user) return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>👤 Profile</Text>
          </View>
          <View style={styles.guestBanner}>
            <Text style={styles.guestIcon}>🔓</Text>
            <Text style={styles.guestTitle}>You're browsing as a Guest</Text>
            <Text style={styles.guestSubtitle}>Sign in to save your transactions to the cloud, access them on multiple devices, and unlock all premium features.</Text>
            <TouchableOpacity style={styles.signinBtn} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.signinBtnText}>Sign In or Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const isGuest = !user.token;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>👤 Profile</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => void logoutAction()}>
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          {isGuest ? (
            <View style={styles.guestBanner}>
              <Text style={styles.guestIcon}>🔓</Text>
              <Text style={styles.guestTitle}>You're browsing as a Guest</Text>
              <Text style={styles.guestSubtitle}>Sign in to save your transactions to the cloud, access them on multiple devices, and unlock all premium features.</Text>
              <TouchableOpacity style={styles.signinBtn} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.signinBtnText}>Sign In or Create Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
                <View style={styles.currencyToggleRow}>
                  <TouchableOpacity
                    style={[styles.currencyBtn, currency === "INR" && styles.currencyBtnActive]}
                    onPress={() => setCurrency("INR")}
                  >
                    <Text style={[styles.currencyBtnText, currency === "INR" && styles.currencyBtnTextActive]}>₹ INR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.currencyBtn, currency === "USD" && styles.currencyBtnActive]}
                    onPress={() => setCurrency("USD")}
                  >
                    <Text style={[styles.currencyBtnText, currency === "USD" && styles.currencyBtnTextActive]}>$ USD</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Automation Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>⚙️ Automation</Text>
          </View>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("RecurringList")}
          >
            <Text style={styles.secondaryBtnText}>Manage Recurring Transactions</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          </View>

          {[
            { key: "budget", label: "Budget alerts" },
            { key: "weekly", label: "Weekly summary email" },
            { key: "monthly", label: "Monthly report" },
            { key: "recurring", label: "Recurring reminders" }
          ].map((item) => (
            <View key={item.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Security Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>🔐 Security</Text>
          </View>
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
  safe: { flex: 1, backgroundColor: DESIGN_COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  pageTitle: { fontSize: 28, fontWeight: "900", color: DESIGN_COLORS.text },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    backgroundColor: DESIGN_COLORS.surface,
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: DESIGN_COLORS.text },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: DESIGN_COLORS.accent,
    justifyContent: "center", alignItems: "center"
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#ffffff" },
  userName: { fontWeight: "800", fontSize: 16, color: DESIGN_COLORS.text, marginBottom: 2 },
  userEmail: { fontSize: 13, color: DESIGN_COLORS.text3, fontWeight: "500", marginBottom: 6 },
  badge: {
    alignSelf: "flex-start", backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 12,
    paddingVertical: 4, paddingHorizontal: 8
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: DESIGN_COLORS.green },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: DESIGN_COLORS.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: DESIGN_COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: DESIGN_COLORS.border,
    padding: 14, fontSize: 15, color: DESIGN_COLORS.text, fontWeight: "600", opacity: 0.7
  },
  inputReadOnlyBox: {
    backgroundColor: DESIGN_COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: DESIGN_COLORS.border,
    padding: 14, opacity: 0.8
  },

  logoutBtn: {
    backgroundColor: DESIGN_COLORS.red, paddingVertical: 8, borderRadius: 10,
    alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 16
  },
  logoutBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  secondaryBtn: {
    backgroundColor: DESIGN_COLORS.surface2, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: DESIGN_COLORS.border, alignItems: "center", alignSelf: "stretch"
  },
  secondaryBtnText: { color: DESIGN_COLORS.text, fontSize: 14, fontWeight: "800" },

  toggleRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DESIGN_COLORS.border
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: DESIGN_COLORS.text },

  // Currency Toggle Styles
  currencyToggleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  currencyBtn: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  currencyBtnActive: {
    backgroundColor: DESIGN_COLORS.accent + "15",
    borderColor: DESIGN_COLORS.accent,
  },
  currencyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
  },
  currencyBtnTextActive: {
    color: DESIGN_COLORS.accent,
  },

  // Guest mode styles
  guestBanner: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  guestIcon: { fontSize: 40 },
  guestTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: DESIGN_COLORS.text,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: DESIGN_COLORS.text2,
    textAlign: "center",
    lineHeight: 20,
  },
  signinBtn: {
    marginTop: 8,
    backgroundColor: DESIGN_COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    alignSelf: "stretch",
  },
  signinBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
