import React, { useEffect, useState, useRef } from "react";
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
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addTransaction, updateTransaction, selectActiveTransactions } from "../store/slices/transactionSlice";
import type { Expense } from "../types";
import { CATEGORIES, COLORS, PAYMENT_METHODS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
import { generateUUID } from "../utils/uuid";

export function ExpenseFormContent({ navigation, mode = "add", id }: any) {
  const { currencySymbol } = useCurrency();
  const dispatch = useAppDispatch();
  const isEdit = mode === "edit";

  const { expenses } = useAppSelector(selectActiveTransactions);
  const existingExpense = isEdit && id ? expenses.find(e => e._id === id) : null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(existingExpense?.name || "");
  const [amount, setAmount] = useState(existingExpense?.amount ? String(existingExpense.amount) : "");
  const [category, setCategory] = useState(existingExpense?.category || "food");
  const [customCatName, setCustomCatName] = useState(existingExpense?.category === "other" ? existingExpense.name : "");
  const [date, setDate] = useState(existingExpense?.date ? new Date(existingExpense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState(existingExpense?.method || "upi");
  const [note, setNote] = useState("");
  const [member, setMember] = useState(existingExpense?.familyMemberName || "");
  const [recurring, setRecurring] = useState(existingExpense?.recurring || false);
  const [frequency, setFrequency] = useState("monthly");
  
  const [familyMembers, setFamilyMembers] = useState<any[]>([{ _id: "self", name: "Me" }]);

  // Set default member immediately so form is valid for guests
  useEffect(() => {
    if (!member) setMember("self");
  }, []);

  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      try {
        const u = await getStoredUser();
        const sid = await getActiveSheetId();
        
        let apiMembers: any[] = [];
        if (u?.token) {
           const famRes = await apiFetch<any[]>("/family-members", { token: u.token, sheetId: sid || undefined }).catch(() => []);
           apiMembers = Array.isArray(famRes) ? famRes : [];
        }
        
        const combinedMembers = [{ _id: "self", name: u?.name || "Me" }, ...apiMembers.filter(m => m._id !== u?._id)];
        setFamilyMembers(combinedMembers);
        
        if (combinedMembers.length > 0 && !isEdit) {
            setMember(combinedMembers[0]._id);
        }

        if (isEdit && existingExpense) {
            const exp = existingExpense;
            setName(exp.name || "");
            setAmount(String(exp.amount || ""));
            setCategory(exp.category || "food");
            if (exp.category === "other" && exp.name) setCustomCatName(exp.name);
            setDate(exp.date ? new Date(exp.date).toISOString().split("T")[0] : "");
            setMethod(exp.method || "upi");
            
            // Assume member assignment using familyMemberName in standard struct
            setMember(exp.familyMemberName === (u?.name || "Me") ? "self" : exp.familyMemberName || "self");
            
            setRecurring(exp.recurring || false);
        }
      } catch (e: unknown) {
        // Silent catch for offline mode
      } finally {
        setLoading(false);
      }
    };
    void fetchMeta();
  }, []);

  const selectedCat = CATEGORIES.find((c) => c.id === category);
  const finalCat = category === "other" && customCatName.trim() ? customCatName.trim() : category;
  
  // Parity isValid
  const numAmount = parseFloat(amount);
  const isValid = amount !== "" && !isNaN(numAmount) && numAmount > 0 && Boolean(member) && (category !== "other" || customCatName.trim().length > 0) && (!recurring || Boolean(frequency));

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const selectedMemberName = familyMembers.find(m => m._id === member)?.name || "Me";
      
      const payload: Expense = {
        _id: isEdit && id ? id : generateUUID(),
        name: name.trim() || (category === "other" ? customCatName.trim() : selectedCat?.label) || "Expense",
        amount: numAmount,
        category: finalCat,
        date,
        method,
        familyMemberName: selectedMemberName,
        recurring,
        type: 'expense'
      };

      if (isEdit) {
        dispatch(updateTransaction(payload));
      } else {
        dispatch(addTransaction(payload));
      }

      // Try sending to server if online (including guest mode)
      try {
        const u = await getStoredUser();
        const sid = await getActiveSheetId();
        
        const body: any = {
          name: payload.name, 
          amount: payload.amount, 
          category: payload.category, 
          date: payload.date,
          method: payload.method, 
          memberId: member, 
          note: note.trim() || undefined,
          recurring, 
          frequency: recurring ? frequency : undefined,
        };

        // If guest, apiFetch will automatically attach x-guest-id
        await apiFetch(isEdit ? `/expenses/${id}` : `/expenses`, {
          method: isEdit ? "PUT" : "POST",
          token: u?.token, // Might be undefined for guest
          sheetId: sid || undefined,
          body: JSON.stringify(body),
        });
      } catch (e) {
         // Silently fail API, we rely on local Redux state for offline support
      }
      
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Amount Box */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>AMOUNT</Text>
          <View style={styles.amountWrap}>
            <Text style={[styles.currencyPrefix, { color: isValid ? COLORS.accent2 : COLORS.text3 }]}>{currencySymbol}</Text>
            <TextInput
              style={[styles.amountInput, { color: isValid ? COLORS.text : COLORS.text3 }]}
              placeholder="0"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={COLORS.text3}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAmounts}>
            {[100, 200, 500, 1000, 2000, 5000].map(val => (
              <TouchableOpacity key={val} style={styles.quickAmtBtn} onPress={() => setAmount(String(val))}>
                <Text style={styles.quickAmtText}>{currencySymbol}{val}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder='e.g. "Swiggy dinner", "Amazon order"...'
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.grid4}>
            {CATEGORIES.map((cat) => {
              const isSel = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pill, isSel && { borderColor: cat.color, backgroundColor: cat.color + "18" }]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.pillIcon}>{cat.icon}</Text>
                  <Text style={[styles.pillLabel, isSel && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {category === "other" && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Custom Category Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Gifts, Repairs, Party..."
              value={customCatName}
              onChangeText={setCustomCatName}
            />
          </View>
        )}

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Member</Text>
          {familyMembers.length === 0 ? (
              <Text style={{ fontSize: 13, color: COLORS.amber, marginTop: 4 }}>Add a family member first from the Members tab.</Text>
          ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {familyMembers.map((m) => {
                      const isSel = member === m._id;
                      return (
                          <TouchableOpacity key={m._id} style={[styles.memberChip, isSel && styles.memberChipSelected]} onPress={() => setMember(m._id)}>
                              <Text style={[styles.memberChipText, isSel && styles.memberChipTextSelected]}>{m.name}</Text>
                          </TouchableOpacity>
                      );
                  })}
              </ScrollView>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.grid3}>
            {PAYMENT_METHODS.map((pm) => {
              const isSel = method === pm.id;
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.payPill, isSel && styles.payPillSelected]}
                  onPress={() => setMethod(pm.id)}
                >
                  <Text style={styles.payIcon}>{pm.icon}</Text>
                  <Text style={[styles.payLabel, isSel && styles.payLabelSelected]}>
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.formGroup, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
            <TouchableOpacity 
              style={[styles.checkbox, recurring && styles.checkboxChecked]} 
              onPress={() => setRecurring(!recurring)}
            >
                {recurring && <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>×</Text>}
            </TouchableOpacity>
            <Text style={[styles.label, { marginBottom: 0 }]}>Make recurring</Text>
        </View>

        {recurring && (
            <View style={styles.recurringBox}>
                <Text style={styles.label}>Frequency</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <TouchableOpacity style={[styles.freqBtn, frequency === "daily" && styles.freqBtnSel]} onPress={() => setFrequency("daily")}>
                        <Text style={[styles.freqText, frequency === "daily" && styles.freqTextSel]}>Daily</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.freqBtn, frequency === "weekly" && styles.freqBtnSel]} onPress={() => setFrequency("weekly")}>
                        <Text style={[styles.freqText, frequency === "weekly" && styles.freqTextSel]}>Weekly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.freqBtn, frequency === "monthly" && styles.freqBtnSel]} onPress={() => setFrequency("monthly")}>
                        <Text style={[styles.freqText, frequency === "monthly" && styles.freqTextSel]}>Monthly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.freqBtn, frequency === "yearly" && styles.freqBtnSel]} onPress={() => setFrequency("yearly")}>
                        <Text style={[styles.freqText, frequency === "yearly" && styles.freqTextSel]}>Yearly</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add details..."
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && { opacity: 0.5, backgroundColor: COLORS.surface3, shadowOpacity: 0 }]}
          onPress={() => void handleSave()}
          disabled={!isValid || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={[styles.submitText, !isValid && { color: COLORS.text2 }]}>
                  {isValid ? (
                      `${selectedCat?.icon || "×"} ${isEdit ? "Update" : (recurring ? "Add Recurring" : "Add")} ${currencySymbol}${numAmount} · ${category === "other" ? (customCatName.trim() || "Custom") : selectedCat?.label} ${recurring ? `(${frequency})` : ""}`
                  ) : `× ${isEdit ? "Update" : "Add"} Expense`}
              </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  amountContainer: {
     backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
     borderRadius: 16, padding: 16, marginBottom: 20
  },
  amountLabel: { fontSize: 11, fontWeight: "600", color: COLORS.text3, letterSpacing: 0.6, marginBottom: 8 },
  amountWrap: {
    flexDirection: "row", alignItems: "center",
  },
  currencyPrefix: { fontSize: 24, fontWeight: "800", color: COLORS.text2 },
  amountInput: {
    flex: 1, fontSize: 36, fontWeight: "800", color: COLORS.text, paddingVertical: 8, marginLeft: 6
  },
  quickAmounts: { marginTop: 10, gap: 6 },
  quickAmtBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  quickAmtText: { fontSize: 13, fontWeight: "700", color: COLORS.text2 },
  formGroup: { marginBottom: 20 },
  formRow: { flexDirection: "row", gap: 12 },
  label: {
    fontSize: 12, fontWeight: "700", color: COLORS.text2,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8
  },
  input: {
    backgroundColor: COLORS.surface2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, fontSize: 15, color: COLORS.text, fontWeight: "600"
  },
  grid4: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  pill: {
    width: "22%", alignItems: "center", paddingVertical: 12, marginHorizontal: "1.5%", marginBottom: 8,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface
  },
  pillIcon: { fontSize: 22, marginBottom: 4 },
  pillLabel: { fontSize: 11, fontWeight: "700", color: COLORS.text2 },
  grid3: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  payPill: {
    width: "30%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, marginHorizontal: "1.5%", marginBottom: 8, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface
  },
  payPillSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  payIcon: { fontSize: 16, marginRight: 6 },
  payLabel: { fontSize: 12, fontWeight: "700", color: COLORS.text2 },
  payLabelSelected: { color: COLORS.accent2 },
  memberChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  memberChipSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  memberChipText: { fontSize: 13, fontWeight: "700", color: COLORS.text2 },
  memberChipTextSelected: { color: "#fff" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border2, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  recurringBox: { padding: 12, backgroundColor: COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  freqBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  freqBtnSel: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  freqText: { fontSize: 13, fontWeight: "700", color: COLORS.text2 },
  freqTextSel: { color: COLORS.accent2 },
  footer: {
    padding: 24, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface
  },
  submitBtn: {
    backgroundColor: COLORS.accent, paddingVertical: 16, borderRadius: 16,
    alignItems: "center", marginBottom: 12,
    shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
});
