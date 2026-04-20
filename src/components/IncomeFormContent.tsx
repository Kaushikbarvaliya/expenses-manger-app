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
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addTransaction, updateTransaction, selectActiveTransactions } from "../store/slices/transactionSlice";
import type { Income } from "../types";
import { INCOME_SOURCES, DESIGN_COLORS, PAYMENT_METHODS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
import { generateUUID } from "../utils/uuid";
import { AppDatePicker } from "./AppDatePicker";

export function IncomeFormContent({ navigation }: any) {
  const { currencySymbol } = useCurrency();
  const dispatch = useAppDispatch();
  const mode = "add";

  const { incomes } = useAppSelector(selectActiveTransactions);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("salary");
  const [customSourceName, setCustomSourceName] = useState("");
  const [date, setDate] = useState<string | null>(new Date().toISOString());
  const [dateError, setDateError] = useState("");
  const [method, setMethod] = useState("salary");
  const [note, setNote] = useState("");
  const [member, setMember] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

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

        if (combinedMembers.length > 0) {
          setMember(combinedMembers[0]._id);
        }
      } catch (e: unknown) {
        // silently catch offline
      } finally {
        setLoading(false);
      }
    };
    void fetchMeta();
  }, []);

  const selectedSource = INCOME_SOURCES.find((s) => s.id === source);
  const finalSource = source === "other" && customSourceName.trim() ? customSourceName.trim() : source;

  // Parity isValid
  const numAmount = parseFloat(amount);
  const isValid = amount !== "" && !isNaN(numAmount) && numAmount > 0 && Boolean(date) && Boolean(member) && (source !== "other" || customSourceName.trim().length > 0) && (!recurring || Boolean(frequency));

  const handleDateChange = (iso: string) => {
    setDate(iso);
    if (iso) setDateError("");
  };

  const handleSave = async () => {
    if (!date) {
      setDateError("Please select a date.");
      return;
    }
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const selectedMemberName = familyMembers.find(m => m._id === member)?.name || "Me";

      const payload: Income = {
        _id: generateUUID(),
        name: name.trim() || (source === "other" ? customSourceName.trim() : selectedSource?.label) || "Income",
        amount: numAmount,
        source: finalSource,
        date: (date ?? new Date().toISOString()).split("T")[0],
        method,
        familyMemberName: selectedMemberName,
        type: 'income'
      };

      dispatch(addTransaction(payload));

      // Try sending to server if online (including guest mode)
      try {
        const u = await getStoredUser();
        const sid = await getActiveSheetId();

        const body = {
          name: payload.name,
          amount: payload.amount,
          source: payload.source,
          date: payload.date,
          method: payload.method,
          memberId: member,
          note: note.trim() || undefined,
          recurring,
          frequency: recurring ? frequency : undefined,
        };

        // If guest, apiFetch will automatically attach x-guest-id
        await apiFetch(`/incomes`, {
          method: "POST",
          token: u?.token, // Might be undefined for guest
          sheetId: sid || undefined,
          body: JSON.stringify(body),
        });
      } catch (e) {
        // Silently fail API
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
        <ActivityIndicator size="large" color={DESIGN_COLORS.green} />
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
            <Text style={[styles.currencyPrefix, { color: isValid ? DESIGN_COLORS.green : DESIGN_COLORS.text3 }]}>{currencySymbol}</Text>
            <TextInput
              style={[styles.amountInput, { color: isValid ? DESIGN_COLORS.text : DESIGN_COLORS.text3 }]}
              placeholder="0"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={DESIGN_COLORS.text3}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAmounts}>
            {[1000, 2000, 5000, 10000, 20000, 50000].map(val => (
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
            placeholder='e.g. "Salary", "Freelance Upwork"...'
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Source</Text>
          <View style={styles.grid4}>
            {INCOME_SOURCES.map((src) => {
              const isSel = source === src.id;
              return (
                <TouchableOpacity
                  key={src.id}
                  style={[styles.pill, isSel && { borderColor: src.color, backgroundColor: src.color + "18" }]}
                  onPress={() => setSource(src.id)}
                >
                  <Text style={styles.pillIcon}>{src.icon}</Text>
                  <Text style={[styles.pillLabel, isSel && { color: src.color }]}>
                    {src.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {source === "other" && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Custom Source Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Side Project, Gifts..."
              value={customSourceName}
              onChangeText={setCustomSourceName}
            />
          </View>
        )}

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <AppDatePicker
              label="Date"
              value={date}
              onChange={handleDateChange}
              allowModeSwitch={false}
              error={dateError}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Member</Text>
          {familyMembers.length === 0 ? (
            <Text style={{ fontSize: 13, color: DESIGN_COLORS.amber, marginTop: 4 }}>Add a family member first from the Members tab.</Text>
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

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add details..."
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity
          style={[styles.formGroup, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: recurring ? 12 : 24 }]}
          onPress={() => setRecurring(!recurring)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[styles.checkbox, recurring && styles.checkboxChecked]}>
              {recurring && <Text style={{ color: "#fff", fontSize: 14 }}>✓</Text>}
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: DESIGN_COLORS.text }}>Recurring Income</Text>
              <Text style={{ fontSize: 12, color: DESIGN_COLORS.text3, marginTop: 2 }}>Automatically add this every {frequency}</Text>
            </View>
          </View>
        </TouchableOpacity>

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

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && { opacity: 0.5, backgroundColor: DESIGN_COLORS.surface3, shadowOpacity: 0 }]}
          onPress={() => void handleSave()}
          disabled={!isValid || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={[styles.submitText, !isValid && { color: DESIGN_COLORS.text2 }]}>
              {isValid ? (
                `${selectedSource?.icon || "×"} Add +${currencySymbol}${numAmount} · ${source === "other" ? (customSourceName.trim() || "Custom Source") : selectedSource?.label}`
              ) : "× Add Income"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DESIGN_COLORS.surface },
  flex: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  amountContainer: {
    backgroundColor: DESIGN_COLORS.surface2, borderWidth: 1, borderColor: DESIGN_COLORS.border,
    borderRadius: 16, padding: 16, marginBottom: 20
  },
  amountLabel: { fontSize: 11, fontWeight: "600", color: DESIGN_COLORS.text3, letterSpacing: 0.6, marginBottom: 8 },
  amountWrap: {
    flexDirection: "row", alignItems: "center",
  },
  currencyPrefix: { fontSize: 24, fontWeight: "800", color: DESIGN_COLORS.text2 },
  amountInput: {
    flex: 1, fontSize: 36, fontWeight: "800", color: DESIGN_COLORS.text, paddingVertical: 8, marginLeft: 6
  },
  quickAmounts: { marginTop: 10, gap: 6 },
  quickAmtBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: DESIGN_COLORS.surface, borderWidth: 1, borderColor: DESIGN_COLORS.border },
  quickAmtText: { fontSize: 13, fontWeight: "700", color: DESIGN_COLORS.text2 },
  formGroup: { marginBottom: 20 },
  formRow: { flexDirection: "row", gap: 12 },
  label: {
    fontSize: 12, fontWeight: "700", color: DESIGN_COLORS.text2,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8
  },
  input: {
    backgroundColor: DESIGN_COLORS.surface2, borderRadius: 14, borderWidth: 1, borderColor: DESIGN_COLORS.border,
    padding: 14, fontSize: 15, color: DESIGN_COLORS.text, fontWeight: "600"
  },
  grid4: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  pill: {
    width: "22%", alignItems: "center", paddingVertical: 12, marginHorizontal: "1.5%", marginBottom: 8,
    borderRadius: 14, borderWidth: 1, borderColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.surface
  },
  pillIcon: { fontSize: 22, marginBottom: 4 },
  pillLabel: { fontSize: 11, fontWeight: "700", color: DESIGN_COLORS.text2 },
  grid3: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  payPill: {
    width: "30%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, marginHorizontal: "1.5%", marginBottom: 8, borderRadius: 14,
    borderWidth: 1, borderColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.surface
  },
  payPillSelected: { borderColor: DESIGN_COLORS.green, backgroundColor: "rgba(5, 150, 105, 0.15)" },
  payIcon: { fontSize: 16, marginRight: 6 },
  payLabel: { fontSize: 12, fontWeight: "700", color: DESIGN_COLORS.text2 },
  payLabelSelected: { color: DESIGN_COLORS.green },
  memberChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: DESIGN_COLORS.surface2, borderWidth: 1, borderColor: DESIGN_COLORS.border },
  memberChipSelected: { backgroundColor: DESIGN_COLORS.green, borderColor: DESIGN_COLORS.green },
  memberChipText: { fontSize: 13, fontWeight: "700", color: DESIGN_COLORS.text2 },
  memberChipTextSelected: { color: "#fff" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.surface, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: DESIGN_COLORS.green, borderColor: DESIGN_COLORS.green },
  recurringBox: { padding: 12, backgroundColor: DESIGN_COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: DESIGN_COLORS.border, marginBottom: 20 },
  freqBtn: { flex: 1, minWidth: "45%", paddingVertical: 10, borderRadius: 10, backgroundColor: DESIGN_COLORS.surface, borderWidth: 1, borderColor: DESIGN_COLORS.border, alignItems: "center" },
  freqBtnSel: { borderColor: DESIGN_COLORS.green, backgroundColor: "rgba(5, 150, 105, 0.15)" },
  freqText: { fontSize: 13, fontWeight: "700", color: DESIGN_COLORS.text2 },
  freqTextSel: { color: DESIGN_COLORS.green },
  footer: {
    padding: 24, borderTopWidth: 1, borderTopColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.surface
  },
  submitBtn: {
    backgroundColor: DESIGN_COLORS.green, paddingVertical: 16, borderRadius: 16,
    alignItems: "center", marginBottom: 12,
    shadowColor: DESIGN_COLORS.green, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
});
