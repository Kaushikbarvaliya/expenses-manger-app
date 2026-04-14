import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import type { RootStackParamList, SheetSummary } from "../navigation/types";
import { apiFetch } from "../api/client";
import { clearStoredUser, getStoredUser, setActiveSheetId } from "../storage/auth";

type Props = NativeStackScreenProps<RootStackParamList, "Sheets">;

function formatRole(role: string) {
  const normalized = String(role || "member").trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function SheetsScreen({ navigation, route }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingSheetId, setOpeningSheetId] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [error, setError] = useState("");

  const acceptedInvite = !!route.params?.accepted;
  const autoAcceptedInvites = !!route.params?.autoAccepted;

  useEffect(() => {
    const loadUser = async () => {
      const user = await getStoredUser();
      if (!user?.token) {
        navigation.replace("Login");
        return;
      }
      setToken(user.token);
      setEmail(user.email);
    };
    void loadUser();
  }, [navigation]);

  useEffect(() => {
    if (!token) return;
    const loadSheets = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch<SheetSummary[]>("/team/sheets", { token });
        setSheets(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load sheets");
      } finally {
        setLoading(false);
      }
    };
    void loadSheets();
  }, [token]);

  const groupedSheets = useMemo(() => {
    const owned = sheets.filter((s) => s.isOwner);
    const shared = sheets.filter((s) => !s.isOwner);
    return { owned, shared };
  }, [sheets]);

  const openSheet = async (sheet: SheetSummary) => {
    setOpeningSheetId(sheet.sheetId);
    await setActiveSheetId(String(sheet.sheetId));
    navigation.navigate("App");
  };

  const handleCreateSheet = async () => {
    const name = newSheetName.trim();
    if (!name || !token) return;

    setCreatingSheet(true);
    setError("");
    try {
      const created = await apiFetch<SheetSummary>("/team/sheets", {
        method: "POST",
        token,
        body: JSON.stringify({ name }),
      });
      setSheets((prev) => [created, ...prev]);
      setNewSheetName("");
      await openSheet(created);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create sheet");
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleLogout = async () => {
    await clearStoredUser();
    navigation.replace("Login");
  };

  const renderSheetCard = (sheet: SheetSummary, kind: "owned" | "shared") => {
    const role = kind === "owned" ? (sheet.isDefault ? "Default" : "Owner") : formatRole(sheet.role);
    const subtitle =
      kind === "owned"
        ? sheet.ownerName
          ? `${sheet.ownerName} (Me)`
          : sheet.ownerEmail || email || "Owner sheet"
        : sheet.ownerName
          ? `${sheet.ownerName} (${sheet.ownerEmail || sheet.ownerId})`
          : sheet.ownerEmail || "Shared sheet";

    const hint =
      kind === "owned"
        ? "Full access to expenses, budgets, family members, and invites."
        : role === "Admin"
          ? "Can manage expenses, budgets, family members, and invites."
          : role === "Member"
            ? "Can add expenses in this shared sheet."
            : "Read-only access.";

    const disabled = openingSheetId === sheet.sheetId;

    return (
      <TouchableOpacity
        key={sheet.sheetId}
        style={[styles.sheetCard, disabled && styles.sheetCardDisabled]}
        disabled={disabled}
        onPress={() => void openSheet(sheet)}
        activeOpacity={0.85}
      >
        <View style={styles.sheetCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>{sheet.sheetName}</Text>
            <Text style={styles.sheetMeta}>{subtitle}</Text>
          </View>
          <View style={[styles.roleBadge, kind === "owned" && styles.ownerBadge]}>
            <Text style={[styles.roleBadgeText, kind === "owned" && styles.ownerBadgeText]}>{role}</Text>
          </View>
        </View>
        <View style={styles.sheetCardBottom}>
          <Text style={styles.sheetHint}>{hint}</Text>
          <Text style={styles.openLabel}>{disabled ? "Opening..." : "Open"}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const sections = [
    { key: "owned", title: "Owned Sheets", data: groupedSheets.owned as SheetSummary[] },
    { key: "shared", title: "Shared With You", data: groupedSheets.shared as SheetSummary[] },
  ] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <FlatList
          contentContainerStyle={styles.page}
          ListHeaderComponent={
            <View>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.eyebrowPill}>
                    <Text style={styles.eyebrowText}>Sheet Access</Text>
                  </View>
                  <Text style={styles.title}>Choose a sheet</Text>
                  <Text style={styles.subtitle}>
                    Create multiple sheets you own, or open a shared sheet where you participate with a role.
                  </Text>
                </View>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => void handleLogout()}>
                  <Text style={styles.secondaryButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.createCard}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={styles.createTitle}>Create a new owned sheet</Text>
                  <Text style={styles.createSubtitle}>
                    Separate personal budgets, projects, or family groups into distinct sheets.
                  </Text>
                </View>
                <View style={styles.createActions}>
                  <TextInput
                    value={newSheetName}
                    onChangeText={setNewSheetName}
                    placeholder="e.g. Home Budget, Goa Trip, Startup Ops"
                    placeholderTextColor="#9ca3af"
                    style={styles.createInput}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (!creatingSheet && newSheetName.trim()) void handleCreateSheet();
                    }}
                  />
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      (creatingSheet || !newSheetName.trim()) && styles.createButtonDisabled,
                    ]}
                    disabled={creatingSheet || !newSheetName.trim()}
                    onPress={() => void handleCreateSheet()}
                  >
                    <Text style={styles.createButtonText}>{creatingSheet ? "Creating..." : "Create Sheet"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {acceptedInvite && (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>Invite accepted. Your new shared sheet is now available below.</Text>
                </View>
              )}
              {autoAcceptedInvites && (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>
                    Pending invite(s) were automatically accepted. Shared sheet(s) are now available below.
                  </Text>
                </View>
              )}

              {!!error && (
                <TouchableOpacity
                  style={styles.errorBanner}
                  onPress={() => Alert.alert("Error", error)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.errorBannerText}>{error}</Text>
                </TouchableOpacity>
              )}

              {loading && (
                <View style={styles.loadingCard}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Loading sheets...</Text>
                </View>
              )}
            </View>
          }
          data={loading ? [] : sections}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                <View style={styles.sectionMetaPill}>
                  <Text style={styles.sectionMetaText}>{item.data.length}</Text>
                </View>
              </View>

              {item.data.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {item.key === "owned"
                      ? "You do not own any sheets yet."
                      : "No shared sheets yet. Accept an invite to collaborate."}
                  </Text>
                </View>
              ) : (
                item.data.map((sheet) => renderSheetCard(sheet, item.key))
              )}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f4f8" },
  page: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  eyebrowPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(124,106,255,0.12)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  eyebrowText: {
    color: "#6655ee",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  title: { fontSize: 32, fontWeight: "900", color: "#111827", letterSpacing: -0.6 },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#4b5563", maxWidth: 520 },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "700", color: "#111827" },

  successBanner: {
    borderRadius: 14,
    backgroundColor: "rgba(5,150,105,0.08)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.18)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  successBannerText: { fontSize: 13, fontWeight: "700", color: "#047857", lineHeight: 18 },
  errorBanner: {
    borderRadius: 14,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  errorBannerText: { fontSize: 13, fontWeight: "700", color: "#b91c1c", lineHeight: 18 },

  createCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 22,
    padding: 16,
    gap: 14,
  },
  createTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  createSubtitle: { marginTop: 6, fontSize: 13, color: "#6b7280", lineHeight: 18 },
  createActions: { gap: 10 },
  createInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
  createButton: {
    borderRadius: 12,
    backgroundColor: "#7c6aff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  createButtonDisabled: { opacity: 0.55 },
  createButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },

  loadingCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  loadingText: { fontSize: 14, color: "#4b5563", fontWeight: "700" },

  section: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  sectionMetaPill: {
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  sectionMetaText: { fontSize: 12, fontWeight: "900", color: "#6b7280" },

  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#fafafa",
    padding: 16,
  },
  emptyStateText: { fontSize: 13, color: "#6b7280", lineHeight: 18, fontWeight: "700" },

  sheetCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fbfbff",
    padding: 16,
    gap: 12,
  },
  sheetCardDisabled: { opacity: 0.7 },
  sheetCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  sheetMeta: { marginTop: 4, fontSize: 13, color: "#6b7280", fontWeight: "600" },
  roleBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(124,106,255,0.12)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  roleBadgeText: { fontSize: 12, fontWeight: "900", color: "#6655ee" },
  ownerBadge: { backgroundColor: "rgba(5,150,105,0.12)" },
  ownerBadgeText: { color: "#047857" },
  sheetCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 10 },
  sheetHint: { flex: 1, fontSize: 13, lineHeight: 18, color: "#4b5563", fontWeight: "600" },
  openLabel: { fontSize: 13, fontWeight: "900", color: "#111827" },
});

