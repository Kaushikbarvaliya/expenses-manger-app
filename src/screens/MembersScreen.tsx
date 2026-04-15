import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SheetSummary, StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";

type Member = {
  _id: string;
  name: string;
  relation: string;
  isSystemUser?: boolean;
  email?: string;
};

type Expense = {
  _id: string;
  familyMember?: string | { _id: string };
  assignedUser?: string | { _id: string };
  amount: number;
};

export function MembersScreen({ navigation }: any) {
  const { formatAmount } = useCurrency();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  
  // Add Member Form
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Invite Form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const activeSheet = useMemo(() => sheets.find(s => s.sheetId === sheetId) || null, [sheets, sheetId]);
  const canManage = activeSheet?.isOwner || activeSheet?.role === "admin";

  useEffect(() => {
    const bootstrap = async () => {
      const u = await getStoredUser();
      let sid = await getActiveSheetId();
      // Safeguard against string "null" from storage
      if (sid === "null" || sid === "undefined") {
        sid = null;
      }
      setUser(u);
      setSheetId(sid);
      setLoading(false);
    };
    void bootstrap();
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user?.token) return;
    if (isRefresh) setRefreshing(true);
    try {
      console.log("Loading members data for sheet:", sheetId);
      
      // Perform requests sequentially to identify failure point if needed,
      // or wrapped in individual catches if we want partial data.
      let membersRes: Member[] = [];
      let expRes: Expense[] = [];
      let sheetsRes: SheetSummary[] = [];

      try {
        membersRes = await apiFetch<Member[]>("/family-members", { token: user.token, sheetId: sheetId || undefined });
      } catch (e: any) {
        console.error("GET /family-members failed:", e);
        // If it's a 403/404, our sheetId might be stale/invalid
        if (e.message?.includes("access") || e.message?.includes("found")) {
          // Resetting sheetId to null to fallback to default sheet next time
          // (Not doing it immediately here to avoid infinite loops, but we log it)
        }
      }

      try {
        expRes = await apiFetch<Expense[]>("/expenses", { token: user.token, sheetId: sheetId || undefined });
      } catch (e) {
        console.error("GET /expenses failed:", e);
      }

      try {
        sheetsRes = await apiFetch<SheetSummary[]>("/team/sheets", { token: user.token });
      } catch (e) {
        console.error("GET /team/sheets failed:", e);
        Alert.alert("Error", "Failed to load your sheets. Please check your connection.");
      }
      
      setMembers(Array.isArray(membersRes) ? membersRes : []);
      setExpenses(Array.isArray(expRes) ? expRes : []);
      setSheets(Array.isArray(sheetsRes) ? sheetsRes : []);
      
      // If we provided a sheetId but it wasn't found in my-sheets, it's definitely stale
      if (sheetId && sheetsRes.length > 0 && !sheetsRes.some(s => s.sheetId === sheetId)) {
        console.log("Sheet ID is stale, clearing it.");
        setSheetId(null);
      }
    } catch (e: unknown) {
      console.log("Unexpected error in loadData:", e);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [sheetId, user?.token]);

  useEffect(() => {
    if (loading) return;
    void loadData(false);
  }, [loadData, loading]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (!loading) void loadData(false);
    });
    return unsubscribe;
  }, [loadData, navigation, loading]);

  const handleAddFamilyMember = async () => {
    if (!newName.trim() || !newRelation.trim() || !user?.token) return;
    setAddingMember(true);
    try {
      await apiFetch("/family-members", {
        method: "POST",
        token: user.token,
        sheetId: sheetId || undefined,
        body: JSON.stringify({ name: newName.trim(), relation: newRelation.trim() })
      });
      setNewName("");
      setNewRelation("");
      void loadData(false);
      Alert.alert("Success", "Family member added!");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAddingMember(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !user?.token) return;
    setInviting(true);
    try {
      const res = await apiFetch<any>("/team/invite", {
        method: "POST",
        token: user.token,
        sheetId: sheetId || undefined,
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      setInviteLink(res.inviteLink || "");
      setInviteEmail("");
      void loadData(false);
      Alert.alert("Invite Sent", res.message || "Invite sent successfully.");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const removeFamilyMember = async (id: string, name: string) => {
    if (!user?.token) return;
    Alert.alert("Remove Member?", `Are you sure you want to remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try {
            await apiFetch(`/family-members/${id}`, { method: "DELETE", token: user.token, sheetId: sheetId || undefined });
            setMembers(prev => prev.filter(m => m._id !== id));
          } catch(e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to remove");
          }
        }
      }
    ]);
  };


  const copyToClipboard = (link: string) => {
    Clipboard.setString(link);
    Alert.alert("Copied", "Invite link copied to clipboard!");
  };

  const shareLink = async (link: string) => {
    try {
      await Share.share({
        message: `Join my expense management sheet: ${link}`,
        url: link,
        title: "Join Sheet",
      });
    } catch (error) {
      console.log("Share error", error);
    }
  };

  const openInvite = () => {
    if (!canManage) {
      Alert.alert("Permission Denied", "Only sheet owners or admins can invite new members.");
      return;
    }
    setShowInvite(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Members</Text>
          <Text style={styles.subtitle}>{user?.token ? (activeSheet?.sheetName || "Sheet Members") : "Guest Mode"}</Text>
        </View>
        {user?.token && (
          <TouchableOpacity style={styles.inviteOpener} onPress={openInvite}>
            <Text style={styles.inviteOpenerText}>🤝 Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {!user?.token ? (
          <View style={styles.guestPlaceholder}>
            <Text style={styles.guestIcon}>👥</Text>
            <Text style={styles.guestTitle}>Seamless Collaboration</Text>
            <Text style={styles.guestText}>Sign in to create shared sheets, invite family members to track together, and sync data in real-time across all devices.</Text>
            <TouchableOpacity style={styles.signinBtn} onPress={() => navigation.navigate("Settings")}>
              <Text style={styles.signinBtnText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active Sheet Card */}
            <View style={styles.card}>
               <Text style={styles.sectionTitle}>Shared Sheet</Text>
               <View style={styles.sheetInfo}>
                 <View style={styles.sheetRow}>
                    <Text style={styles.sheetLabel}>Active Sheet:</Text>
                    <Text style={styles.sheetValue}>{activeSheet?.sheetName || "My Sheet"}</Text>
                 </View>
                 <View style={styles.sheetRow}>
                    <Text style={styles.sheetLabel}>Your Role:</Text>
                    <View style={styles.roleBadge}>
                       <Text style={styles.roleBadgeText}>{activeSheet?.role || "Owner"}</Text>
                    </View>
                 </View>
               </View>
            </View>

            {/* Add Family Member Form */}
            {canManage && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Add Family Member</Text>
                <View style={styles.formRow}>
                   <TextInput
                     style={[styles.input, { flex: 1.2 }]}
                     placeholder="Name"
                     value={newName}
                     onChangeText={setNewName}
                     placeholderTextColor={COLORS.text3}
                   />
                   <TextInput
                     style={[styles.input, { flex: 1 }]}
                     placeholder="Relation"
                     value={newRelation}
                     onChangeText={setNewRelation}
                     placeholderTextColor={COLORS.text3}
                   />
                   <TouchableOpacity style={styles.addButton} onPress={() => void handleAddFamilyMember()} disabled={addingMember}>
                     {addingMember ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addButtonText}>Add</Text>}
                   </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Members List */}
            <View style={styles.card}>
               <View style={styles.sectionHeader}>
                 <Text style={styles.sectionTitle}>Sheet Members</Text>
                 <Text style={styles.countText}>{members.length} total</Text>
               </View>
               
               {members.length === 0 ? (
                 <View style={styles.empty}>
                   <Text style={styles.emptyText}>No members yet.</Text>
                 </View>
               ) : (
                 members.map((m) => {
                   const memberId = m._id;
                   const spent = expenses.filter(e => {
                      const mid = typeof e.familyMember === "object" ? e.familyMember?._id : e.familyMember;
                      const uid = typeof e.assignedUser === "object" ? e.assignedUser?._id : e.assignedUser;
                      return mid === memberId || uid === memberId;
                   }).reduce((s, e) => s + (Number(e.amount) || 0), 0);

                   return (
                     <View key={m._id} style={styles.memberItem}>
                        <View style={{ flex: 1 }}>
                           <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Text style={styles.memberName}>{m.name}</Text>
                              {m.isSystemUser && (
                                <View style={styles.systemBadge}>
                                   <Text style={styles.systemBadgeText}>System</Text>
                                </View>
                              )}
                           </View>
                           <Text style={styles.memberRelation}>{m.relation}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", marginRight: 12 }}>
                           <Text style={styles.spentLabel}>Spent</Text>
                           <Text style={styles.spentValue}>{formatAmount(spent)}</Text>
                        </View>
                        {canManage && !m.isSystemUser && (
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => void removeFamilyMember(m._id, m.name)}>
                             <Text style={styles.deleteBtnText}>Del</Text>
                          </TouchableOpacity>
                        )}
                     </View>
                   );
                 })
               )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

       {/* Invite Modal */}
       <Modal visible={showInvite} animationType="slide" transparent statusBarTranslucent>
         <TouchableWithoutFeedback onPress={() => setShowInvite(false)}>
           <View style={styles.modalOverlay}>
             <KeyboardAvoidingView 
               behavior={Platform.OS === "ios" ? "padding" : "height"}
               style={{ width: "100%", flex: 1, justifyContent: "flex-end" }}
               keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
             >
               <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                 <View style={styles.modal}>
                   <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Invite Collaborator</Text>
                      <TouchableOpacity onPress={() => { setShowInvite(false); setInviteLink(""); }}>
                         <Text style={styles.closeText}>Close</Text>
                      </TouchableOpacity>
                   </View>

                   <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" bounces={false}>
                      <Text style={styles.modalLabel}>Collaborator Email</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={COLORS.text3}
                      />

                      <Text style={styles.modalLabel}>Role</Text>
                      <View style={styles.roleRow}>
                         <TouchableOpacity 
                            style={[styles.roleBtn, inviteRole === "admin" && styles.roleBtnActive]} 
                            onPress={() => setInviteRole("admin")}
                         >
                            <Text style={[styles.roleBtnText, inviteRole === "admin" && styles.roleBtnTextActive]}>Admin</Text>
                         </TouchableOpacity>
                         <TouchableOpacity 
                            style={[styles.roleBtn, inviteRole === "member" && styles.roleBtnActive]} 
                            onPress={() => setInviteRole("member")}
                         >
                            <Text style={[styles.roleBtnText, inviteRole === "member" && styles.roleBtnTextActive]}>Member</Text>
                         </TouchableOpacity>
                      </View>

                      <TouchableOpacity style={styles.sendBtn} onPress={() => void handleSendInvite()} disabled={inviting}>
                         {inviting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Send Invite</Text>}
                      </TouchableOpacity>

                      {inviteLink ? (
                        <View style={styles.linkBox}>
                           <Text style={styles.linkTitle}>Invite Link Generated:</Text>
                           <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
                           <View style={{ flexDirection: "row", gap: 10 }}>
                             <TouchableOpacity style={[styles.copyBtn, { flex: 1 }]} onPress={() => shareLink(inviteLink)}>
                                <Text style={styles.copyBtnText}>📤 Share Link</Text>
                             </TouchableOpacity>
                             <TouchableOpacity style={[styles.copyBtn, { flex: 1, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.accent }]} onPress={() => copyToClipboard(inviteLink)}>
                                <Text style={[styles.copyBtnText, { color: COLORS.accent }]}>🔗 Copy</Text>
                             </TouchableOpacity>
                           </View>
                        </View>
                      ) : null}
                      {/* Extra space for keyboard on smaller screens */}
                      <View style={{ height: 40 }} />
                   </ScrollView>
                 </View>
               </TouchableWithoutFeedback>
             </KeyboardAvoidingView>
           </View>
         </TouchableWithoutFeedback>
       </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.text },
  subtitle: { fontSize: 13, fontWeight: "800", color: COLORS.text3, marginTop: 4 },
  inviteOpener: { backgroundColor: "rgba(124,106,255,0.12)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(124,106,255,0.2)" },
  inviteOpenerText: { fontSize: 13, fontWeight: "900", color: COLORS.accent },
  disabledText: { opacity: 0.5 },
  scroll: { padding: 16, gap: 16 },

  card: { borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  countText: { fontSize: 12, fontWeight: "700", color: COLORS.text3 },

  sheetInfo: { gap: 8 },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text2 },
  sheetValue: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  roleBadge: { backgroundColor: COLORS.accentGlow, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: "900", color: COLORS.accent2, textTransform: "uppercase" },

  formRow: { flexDirection: "row", gap: 8 },
  input: { backgroundColor: COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: "700", color: COLORS.text },
  addButton: { backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center", alignItems: "center" },
  addButtonText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  memberItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberName: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  memberRelation: { fontSize: 12, color: COLORS.text3, fontWeight: "600", marginTop: 2 },
  systemBadge: { backgroundColor: "rgba(0,0,0,0.05)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  systemBadgeText: { fontSize: 9, fontWeight: "800", color: COLORS.text3, textTransform: "uppercase" },
  spentLabel: { fontSize: 10, fontWeight: "700", color: COLORS.text3, textTransform: "uppercase", marginBottom: 2 },
  spentValue: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  deleteBtn: { padding: 8, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 8 },
  deleteBtnText: { color: COLORS.red, fontSize: 11, fontWeight: "800" },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { color: COLORS.text3, fontSize: 14, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  closeText: { fontSize: 15, color: COLORS.accent, fontWeight: "700" },
  modalBody: { gap: 12 },
  modalLabel: { fontSize: 12, fontWeight: "800", color: COLORS.text2, textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 },
  modalInput: { backgroundColor: COLORS.surface2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, fontSize: 15, color: COLORS.text, fontWeight: "600", marginBottom: 16 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", backgroundColor: COLORS.surface2 },
  roleBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  roleBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.text2 },
  roleBtnTextActive: { color: COLORS.accent },
  sendBtn: { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  sendBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  linkBox: { marginTop: 24, padding: 16, backgroundColor: COLORS.surface2, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: COLORS.accent },
  linkTitle: { fontSize: 12, fontWeight: "800", color: COLORS.accent, marginBottom: 8 },
  linkText: { fontSize: 13, color: COLORS.text2, backgroundColor: "#fff", padding: 10, borderRadius: 8, marginBottom: 12 },
  copyBtn: { backgroundColor: COLORS.accent, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  copyBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  
  // Guest styles
  guestPlaceholder: {
    padding: 30,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    gap: 12,
  },
  guestIcon: { fontSize: 48, marginBottom: 4 },
  guestTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text, textAlign: "center" },
  guestText: { fontSize: 14, fontWeight: "600", color: COLORS.text2, textAlign: "center", lineHeight: 22 },
  signinBtn: {
    marginTop: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  signinBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
