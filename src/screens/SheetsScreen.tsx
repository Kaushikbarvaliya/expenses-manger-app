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
  Clipboard,
  Share,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserPlus, Share2, Copy, X } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, SheetSummary } from "../navigation/types";
import { apiFetch } from "../api/client";
import { clearStoredUser, getStoredUser, setActiveSheetId } from "../storage/auth";
import { COLORS } from "../constants/design";
import { useAppDispatch } from "../store/hooks";
import { logout, setLoggedIn } from "../store/slices/transactionSlice";

type Props = NativeStackScreenProps<RootStackParamList, "Sheets">;

function formatRole(role: string) {
  const normalized = String(role || "member").trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function SheetsScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingSheetId, setOpeningSheetId] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [error, setError] = useState("");

  // Invite Form States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSheetId, setInviteSheetId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const acceptedInvite = !!route.params?.accepted;
  const autoAcceptedInvites = !!route.params?.autoAccepted;

  useEffect(() => {
    const loadUser = async () => {
      const user = await getStoredUser();
      if (!user?.token) {
        navigation.replace("Login");
        return;
      }
      setUserId(user._id);
      setToken(user.token);
      setEmail(user.email);
      dispatch(setLoggedIn(true));
    };
    void loadUser();
  }, [dispatch, navigation]);

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

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteSheetId || !token) return;
    setInviting(true);
    try {
      const res = await apiFetch<any>("/team/invite", {
        method: "POST",
        token,
        sheetId: inviteSheetId,
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      setInviteLink(res.inviteLink || "");
      Alert.alert("Success", "Invitation sent successfully!");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const copyToClipboard = (link: string) => {
    Clipboard.setString(link);
    Alert.alert("Copied", "Link copied to clipboard!");
  };

  const shareLink = async (link: string) => {
    try {
      await Share.share({ message: `Join my expense management sheet: ${link}`, url: link });
    } catch (e) {
      console.error(e);
    }
  };

  const openInvite = (sheet: SheetSummary) => {
    setInviteSheetId(String(sheet.sheetId));
    setInviteEmail("");
    setInviteLink("");
    setInviteRole("member");
    setShowInviteModal(true);
  };

  const handleLogout = async () => {
    dispatch(logout());
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
          <View style={styles.cardActions}>
            {(kind === "owned" || role === "Admin") && (
              <TouchableOpacity 
                style={styles.inviteBtn} 
                onPress={() => openInvite(sheet)}
                disabled={disabled}
              >
                <UserPlus size={16} color={COLORS.primary} strokeWidth={2.5} />
                <Text style={styles.inviteBtnText}>Invite</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => void openSheet(sheet)} disabled={disabled}>
              <Text style={styles.openLabel}>{disabled ? "Opening..." : "Open"}</Text>
            </TouchableOpacity>
          </View>
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
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={styles.headerInviteBtn} 
                    onPress={() => {
                      if (sheets.length > 0) {
                        setInviteSheetId(null); // Signal global invite (needs selection)
                        setInviteEmail("");
                        setInviteLink("");
                        setInviteRole("member");
                        setShowInviteModal(true);
                      } else {
                        Alert.alert("No Sheets", "Create a sheet first to invite members.");
                      }
                    }}
                  >
                    <UserPlus size={20} color="#fff" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => void handleLogout()}>
                    <Text style={styles.secondaryButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
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

        {/* Invite Modal (Bottom Sheet style) */}
        <Modal visible={showInviteModal} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={() => setShowInviteModal(false)}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalContent}
              >
                <TouchableWithoutFeedback>
                  <View style={styles.modalInner}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Invite Member</Text>
                      <TouchableOpacity onPress={() => setShowInviteModal(false)} style={styles.closeBtn}>
                        <X size={20} color={COLORS.text2} />
                      </TouchableOpacity>
                    </View>

                    {!inviteSheetId && (
                      <View style={{ marginBottom: 20 }}>
                        <Text style={styles.inputLabel}>Select Sheet</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetSelectorScroll}>
                          {sheets.filter(s => s.isOwner).map((s) => (
                            <TouchableOpacity 
                              key={s.sheetId} 
                              style={[styles.sheetSelectorChip, inviteSheetId === s.sheetId && styles.sheetSelectorChipActive]}
                              onPress={() => setInviteSheetId(s.sheetId)}
                            >
                              <Text style={[styles.sheetSelectorChipText, inviteSheetId === s.sheetId && styles.sheetSelectorChipTextActive]}>
                                {s.sheetName}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <Text style={styles.inputLabel}>Member Email</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />

                    <Text style={styles.inputLabel}>Assign Role</Text>
                    <View style={styles.roleGrid}>
                      <TouchableOpacity 
                        style={[styles.roleOption, inviteRole === "member" && styles.roleOptionActive]}
                        onPress={() => setInviteRole("member")}
                      >
                        <Text style={[styles.roleOptionText, inviteRole === "member" && styles.roleOptionTextActive]}>Member</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.roleOption, inviteRole === "admin" && styles.roleOptionActive]}
                        onPress={() => setInviteRole("admin")}
                      >
                        <Text style={[styles.roleOptionText, inviteRole === "admin" && styles.roleOptionTextActive]}>Admin</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      style={[styles.modalActionBtn, (!inviteEmail.trim() || inviting) && styles.modalActionBtnDisabled]}
                      onPress={() => void handleSendInvite()}
                      disabled={!inviteEmail.trim() || inviting}
                    >
                      {inviting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionBtnText}>Send Invitation</Text>}
                    </TouchableOpacity>

                    {inviteLink ? (
                      <View style={styles.linkShareSection}>
                        <Text style={styles.linkShareTitle}>Direct Invite Link</Text>
                        <View style={styles.linkDisplayBox}>
                          <Text style={styles.linkDisplayText} numberOfLines={1}>{inviteLink}</Text>
                          <TouchableOpacity onPress={() => copyToClipboard(inviteLink)}>
                            <Copy size={16} color={COLORS.primary} strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.shareRowBtn} onPress={() => void shareLink(inviteLink)}>
                          <Share2 size={16} color="#fff" strokeWidth={2.5} />
                          <Text style={styles.shareRowBtnText}>Share Link</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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

  // New Invite Styles
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerInviteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 15 
  },
  inviteBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6,
    backgroundColor: COLORS.primary + "15",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  inviteBtnText: { 
    fontSize: 12, 
    fontWeight: "800", 
    color: COLORS.primary 
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    width: "100%",
  },
  modalInner: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text3,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: "#F8F9FE",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 20,
  },
  roleGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 25,
  },
  roleOption: {
    flex: 1,
    backgroundColor: "#F8F9FE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  roleOptionActive: {
    backgroundColor: COLORS.primary + "10",
    borderColor: COLORS.primary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text2,
  },
  roleOptionTextActive: {
    color: COLORS.primary,
  },
  modalActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  modalActionBtnDisabled: {
    opacity: 0.5,
  },
  modalActionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  linkShareSection: {
    marginTop: 25,
    backgroundColor: COLORS.primary + "05",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.primary + "30",
  },
  linkShareTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  linkDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  linkDisplayText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text2,
    marginRight: 10,
  },
  shareRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  shareRowBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  
  // Sheet Selector Styles
  sheetSelectorScroll: {
    gap: 10,
    paddingVertical: 5,
  },
  sheetSelectorChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetSelectorChipActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  sheetSelectorChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text2,
  },
  sheetSelectorChipTextActive: {
    color: COLORS.primary,
  },
});
