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
import { useAppDispatch } from "../store/hooks";
import theme from "../theme/theme";
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
                <UserPlus size={16} color={theme.COLORS.primary} strokeWidth={2.5} />
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
                        <X size={20} color={theme.COLORS.text2} />
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
                            <Copy size={16} color={theme.COLORS.primary} strokeWidth={2.5} />
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
  safe: theme.COMPONENT_STYLES.safeArea,
  page: {
    ...theme.COMPONENT_STYLES.screen,
    paddingTop: theme.SPACING["4xl"],
    paddingBottom: theme.SPACING["5xl"],
    gap: theme.SPACING["4xl"],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.SPACING.lg,
    flexWrap: "wrap",
    marginBottom: theme.SPACING["4xl"],
  },
  eyebrowPill: {
    alignSelf: "flex-start",
    backgroundColor: theme.COLORS.primaryBackground,
    borderRadius: theme.BORDER_RADIUS.full,
    paddingVertical: theme.SPACING.base,
    paddingHorizontal: theme.SPACING.xl,
    marginBottom: theme.SPACING.lg,
  },
  eyebrowText: {
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.primary,
    fontWeight: theme.FONTS.weight.black,
    letterSpacing: 0.7,
  },
  title: { 
    ...theme.TYPOGRAPHY.h1,
    letterSpacing: -0.6 
  },
  subtitle: { 
    ...theme.TYPOGRAPHY.body,
    marginTop: theme.SPACING.base, 
    maxWidth: 520 
  },
  secondaryButton: {
    ...theme.COMPONENT_STYLES.buttonGhost,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    backgroundColor: theme.COLORS.surface,
    paddingVertical: theme.SPACING.lg,
    paddingHorizontal: theme.SPACING.xl,
  },
  secondaryButtonText: { 
    ...theme.TYPOGRAPHY.buttonText,
    color: theme.COLORS.text 
  },

  successBanner: {
    ...theme.COMPONENT_STYLES.card,
    backgroundColor: `${theme.COLORS.success}15`,
    borderWidth: 1,
    borderColor: `${theme.COLORS.success}30`,
    marginBottom: theme.SPACING.xl,
  },
  successBannerText: { 
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.success,
    fontWeight: theme.FONTS.weight.black,
    lineHeight: 18 
  },
  errorBanner: {
    ...theme.COMPONENT_STYLES.card,
    backgroundColor: `${theme.COLORS.error}15`,
    borderWidth: 1,
    borderColor: `${theme.COLORS.error}30`,
    marginBottom: theme.SPACING.xl,
  },
  errorBannerText: { 
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.error,
    fontWeight: theme.FONTS.weight.black,
    lineHeight: 18 
  },

  createCard: {
    ...theme.COMPONENT_STYLES.card,
    borderRadius: theme.BORDER_RADIUS["5xl"],
    gap: theme.SPACING.xl,
  },
  createTitle: { ...theme.TYPOGRAPHY.cardTitle },
  createSubtitle: { 
    ...theme.TYPOGRAPHY.cardSubtitle,
    marginTop: theme.SPACING.base,
    lineHeight: 18 
  },
  createActions: { gap: theme.SPACING.lg },
  createInput: {
    ...theme.COMPONENT_STYLES.input,
    fontSize: theme.FONTS.size.base,
  },
  createButton: {
    ...theme.COMPONENT_STYLES.button,
    paddingVertical: theme.SPACING["3xl"],
    paddingHorizontal: theme.SPACING["3xl"],
  },
  createButtonDisabled: { opacity: 0.55 },
  createButtonText: theme.TYPOGRAPHY.buttonText,

  loadingCard: {
    ...theme.COMPONENT_STYLES.card,
    borderRadius: theme.BORDER_RADIUS["5xl"],
    paddingVertical: theme.SPACING["4xl"],
    paddingHorizontal: theme.SPACING["3xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.SPACING.xl,
  },
  loadingText: { 
    ...theme.TYPOGRAPHY.body,
    fontWeight: theme.FONTS.weight.medium 
  },

  list: { gap: theme.SPACING.xl },
  sheetCard: {
    ...theme.COMPONENT_STYLES.card,
    borderRadius: theme.BORDER_RADIUS["5xl"],
    gap: theme.SPACING["3xl"],
  },
  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    gap: theme.SPACING.base 
  },
  sectionTitle: { 
    ...theme.TYPOGRAPHY.h3,
    color: theme.COLORS.text 
  },
  sectionMetaPill: {
    backgroundColor: theme.COLORS.surface2,
    borderRadius: theme.BORDER_RADIUS.full,
    paddingVertical: theme.SPACING.xs,
    paddingHorizontal: theme.SPACING.sm,
  },
  sectionMetaText: { 
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.text2 
  },

  emptyState: {
    ...theme.COMPONENT_STYLES.card,
    borderStyle: "dashed",
    backgroundColor: theme.COLORS.background,
    padding: theme.SPACING.lg,
  },
  emptyStateText: { 
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.text2,
    lineHeight: 18 
  },
  sheetCardDisabled: { opacity: 0.7 },
  sheetCardTop: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    gap: theme.SPACING.lg 
  },
  sheetTitle: { 
    ...theme.TYPOGRAPHY.cardTitle,
    fontSize: theme.FONTS.size.lg 
  },
  sheetMeta: { 
    marginTop: theme.SPACING.xs, 
    ...theme.TYPOGRAPHY.caption,
    fontWeight: theme.FONTS.weight.semibold 
  },
  roleBadge: {
    borderRadius: theme.BORDER_RADIUS.full,
    backgroundColor: theme.COLORS.primaryBackground,
    paddingVertical: theme.SPACING.xs,
    paddingHorizontal: theme.SPACING.sm,
    alignSelf: "flex-start",
  },
  roleBadgeText: { 
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.primary,
    fontWeight: theme.FONTS.weight.black 
  },
  ownerBadge: { backgroundColor: `${theme.COLORS.success}15` },
  ownerBadgeText: { color: theme.COLORS.success },
  sheetCardBottom: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-end", 
    gap: theme.SPACING.sm 
  },
  sheetHint: { 
    flex: 1, 
    ...theme.TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: theme.FONTS.weight.semibold 
  },
  openLabel: { 
    ...theme.TYPOGRAPHY.caption,
    fontWeight: theme.FONTS.weight.black 
  },

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
    backgroundColor: theme.COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.COLORS.primary,
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
    backgroundColor: theme.COLORS.primary + "15",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.COLORS.primary + "30",
  },
  inviteBtnText: { 
    fontSize: 12, 
    fontWeight: "800", 
    color: theme.COLORS.primary 
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
    backgroundColor: theme.COLORS.surface,
    borderTopLeftRadius: theme.BORDER_RADIUS["3xl"],
    borderTopRightRadius: theme.BORDER_RADIUS["3xl"],
    padding: theme.SPACING.xl,
    paddingBottom: Platform.OS === "ios" ? theme.SPACING["3xl"] : theme.SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.COLORS.border,
    borderRadius: theme.BORDER_RADIUS.xs,
    alignSelf: "center",
    marginBottom: theme.SPACING.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.SPACING.xl,
  },
  modalTitle: {
    ...theme.TYPOGRAPHY.h2,
    color: theme.COLORS.text,
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: theme.SPACING.xs,
  },
  inputLabel: {
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.text3,
    textTransform: "uppercase",
    marginBottom: theme.SPACING.sm,
    letterSpacing: 0.5,
  },
  modalInput: {
    ...theme.COMPONENT_STYLES.input,
    backgroundColor: theme.COLORS.background,
    fontSize: theme.FONTS.size.base,
    color: theme.COLORS.text,
    fontWeight: theme.FONTS.weight.semibold,
    marginBottom: theme.SPACING.xl,
  },
  roleGrid: {
    flexDirection: "row",
    gap: theme.SPACING.lg,
    marginBottom: theme.SPACING.xl,
  },
  roleOption: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
    borderRadius: theme.BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    paddingVertical: theme.SPACING.lg,
    alignItems: "center",
  },
  roleOptionActive: {
    backgroundColor: theme.COLORS.primary + "10",
    borderColor: theme.COLORS.primary,
  },
  roleOptionText: {
    ...theme.TYPOGRAPHY.caption,
    fontWeight: theme.FONTS.weight.bold,
    color: theme.COLORS.text2,
  },
  roleOptionTextActive: {
    color: theme.COLORS.primary,
  },
  modalActionBtn: {
    ...theme.COMPONENT_STYLES.button,
    paddingVertical: theme.SPACING.xl,
    ...theme.SHADOWS.md,
  },
  modalActionBtnDisabled: {
    opacity: 0.5,
  },
  modalActionBtnText: {
    ...theme.TYPOGRAPHY.buttonText,
  },
  linkShareSection: {
    marginTop: theme.SPACING.xl,
    backgroundColor: theme.COLORS.primary + "05",
    borderRadius: theme.BORDER_RADIUS["2xl"],
    padding: theme.SPACING.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.COLORS.primary + "30",
  },
  linkShareTitle: {
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.primary,
    textTransform: "uppercase",
    fontWeight: theme.FONTS.weight.black,
    marginBottom: theme.SPACING.sm,
  },
  linkDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.COLORS.surface,
    borderRadius: theme.BORDER_RADIUS.lg,
    padding: theme.SPACING.lg,
    marginBottom: theme.SPACING.lg,
  },
  linkDisplayText: {
    flex: 1,
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.text2,
    marginRight: theme.SPACING.sm,
  },
  shareRowBtn: {
    ...theme.COMPONENT_STYLES.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.SPACING.sm,
    paddingVertical: theme.SPACING.sm,
    paddingHorizontal: theme.SPACING.lg,
  },
  shareRowBtnText: {
    ...theme.TYPOGRAPHY.buttonText,
    fontSize: theme.FONTS.size.sm,
  },
  
  // Sheet Selector Styles
  sheetSelectorScroll: {
    gap: theme.SPACING.sm,
    paddingVertical: theme.SPACING.xs,
  },
  sheetSelectorChip: {
    paddingVertical: theme.SPACING.sm,
    paddingHorizontal: theme.SPACING.lg,
    borderRadius: theme.BORDER_RADIUS.lg,
    backgroundColor: theme.COLORS.surface2,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  sheetSelectorChipActive: {
    backgroundColor: theme.COLORS.primary + "15",
    borderColor: theme.COLORS.primary,
  },
  sheetSelectorChipText: {
    ...theme.TYPOGRAPHY.caption,
    fontWeight: theme.FONTS.weight.bold,
    color: theme.COLORS.text2,
  },
  sheetSelectorChipTextActive: {
    color: theme.COLORS.primary,
  },
});
