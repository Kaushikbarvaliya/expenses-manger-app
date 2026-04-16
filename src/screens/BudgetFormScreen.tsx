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
import { getStoredUser, getActiveSheetId } from "../storage/auth";
import { apiFetch } from "../api/client";
import { CATEGORIES, COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
import type { StoredUser } from "../navigation/types";

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function BudgetFormScreen({ navigation, route }: any) {
  const { mode, budgetId } = route.params || { mode: "add", budgetId: null };
  const isEdit = mode === "edit";

  const { currencySymbol } = useCurrency();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const now = new Date();
  const [periodType, setPeriodType] = useState<"monthly" | "yearly">("monthly");
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [totalBudget, setTotalBudget] = useState<string>("");
  const [categoryAmounts, setCategoryAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      try {
        const u = await getStoredUser();
        const sid = await getActiveSheetId();
        if (!u?.token) return;

        const res = await apiFetch<any[]>("/budgets", { token: u.token, sheetId: sid || undefined });
        const data = Array.isArray(res) ? res : [];
        const bud = data.find((x) => x._id === budgetId);
        
        if (bud) {
          setPeriodType(bud.periodType || "monthly");
          setMonth(bud.month || now.getMonth() + 1);
          setYear(bud.year || now.getFullYear());
          setTotalBudget(String(bud.totalBudget || ""));
          
          const map: Record<string, string> = {};
          if (bud.categories && Array.isArray(bud.categories)) {
            for (const c of bud.categories) {
               map[c.category] = String(c.amount || "");
            }
          }
          setCategoryAmounts(map);
        }
      } catch (e: unknown) {
        Alert.alert("Error", "Could not load budget data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isEdit, budgetId]);

  const handleCategoryChange = (categoryId: string, amount: string) => {
    setCategoryAmounts(prev => ({ ...prev, [categoryId]: amount }));
  };

  const totalAllocated = Object.values(categoryAmounts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const totalNum = Number(totalBudget);
  const overAllocated = totalAllocated > totalNum;

  const canSubmit = totalNum > 0 && year >= 1970 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    
    try {
      const u = await getStoredUser();
      const sid = await getActiveSheetId();
      if (!u?.token) throw new Error("Not logged in");

      const payload = {
        periodType,
        month: periodType === "yearly" ? 1 : month,
        year,
        totalBudget: totalNum,
        categories: CATEGORIES.map((cat) => ({
          category: cat.id,
          amount: Number(categoryAmounts[cat.id] || 0)
        }))
      };

      // Backend uses POST /api/budgets for both create and update (upsert)
      await apiFetch("/budgets", {
        method: "POST",
        token: u.token,
        sheetId: sid || undefined,
        body: JSON.stringify(payload),
      });
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert(isEdit ? "Update failed" : "Save failed", e instanceof Error ? e.message : "Error");
      setSaving(false);
    }
  };

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  if (loading) {
     return <SafeAreaView style={styles.safe}></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Edit Budget" : "New Budget"}</Text>
        <TouchableOpacity onPress={() => void handleSubmit()} disabled={!canSubmit || saving}>
          <Text style={[styles.saveText, (!canSubmit || saving) && styles.disabledText]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Period Selector */}
        <Text style={styles.sectionTitle}>Budget Period</Text>
        <View style={styles.periodRow}>
          <TouchableOpacity 
             style={[styles.periodBtn, periodType === "monthly" && styles.periodBtnActive]}
             onPress={() => setPeriodType("monthly")}
          >
            <Text style={[styles.periodBtnTitle, periodType === "monthly" && styles.periodBtnTitleActive]}>📅 Monthly</Text>
            <Text style={styles.periodBtnDesc}>Track per month</Text>
          </TouchableOpacity>
          <TouchableOpacity 
             style={[styles.periodBtn, periodType === "yearly" && styles.periodBtnActive]}
             onPress={() => setPeriodType("yearly")}
          >
            <Text style={[styles.periodBtnTitle, periodType === "yearly" && styles.periodBtnTitleActive]}>📆 Yearly</Text>
            <Text style={styles.periodBtnDesc}>Track full year</Text>
          </TouchableOpacity>
        </View>

        {/* Date Row (Mock Picker using ScrollView horizontal chips for now to maintain RN parity) */}
        <View style={styles.dateRow}>
          {periodType === "monthly" && (
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                 {MONTH_FULL.map((mName, i) => {
                    const mNum = i + 1;
                    const active = month === mNum;
                    return (
                      <TouchableOpacity key={mNum} style={[styles.dateChip, active && styles.dateChipActive]} onPress={() => setMonth(mNum)}>
                        <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{mName.substring(0,3)}</Text>
                      </TouchableOpacity>
                    );
                 })}
              </ScrollView>
            </View>
          )}
          
          <View style={{ flex: 1 }}>
              <Text style={styles.label}>Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                 {yearOptions.map(y => {
                    const active = year === y;
                    return (
                      <TouchableOpacity key={y} style={[styles.dateChip, active && styles.dateChipActive]} onPress={() => setYear(y)}>
                        <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    );
                 })}
              </ScrollView>
          </View>
        </View>

        {/* Total Budget */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Total Budget ({currencySymbol})</Text>
          <TextInput
            style={styles.hugeInput}
            value={totalBudget}
            onChangeText={setTotalBudget}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={COLORS.text3}
          />
        </View>

        {/* Categories Split */}
        <View style={styles.categoryHeader}>
          <Text style={styles.sectionTitle}>Category Limits <Text style={styles.optionalText}>(optional)</Text></Text>
          <Text style={[styles.allocatedText, overAllocated && { color: COLORS.red }]}>
            Allocated: ₹{totalAllocated} {totalNum > 0 ? `/ ₹${totalNum}` : ""}
          </Text>
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map(cat => (
             <View key={cat.id} style={styles.gridItem}>
                <Text style={styles.gridLabel}>{cat.icon} {cat.label}</Text>
                <TextInput
                   style={styles.gridInput}
                   placeholder="0"
                   placeholderTextColor={COLORS.text3}
                   keyboardType="numeric"
                   value={categoryAmounts[cat.id] || ""}
                   onChangeText={(val) => handleCategoryChange(cat.id, val)}
                />
             </View>
          ))}
        </View>

        <View style={{ height: 40 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancelText: { fontSize: 16, fontWeight: "600", color: COLORS.text2 },
  headerTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  saveText: { fontSize: 16, fontWeight: "800", color: COLORS.accent },
  disabledText: { opacity: 0.5 },
  scroll: { padding: 16 },

  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  
  periodRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  periodBtn: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface2 },
  periodBtnActive: { borderColor: COLORS.accent, backgroundColor: "rgba(124,106,255,0.08)" },
  periodBtnTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginBottom: 2 },
  periodBtnTitleActive: { color: COLORS.accent2 },
  periodBtnDesc: { fontSize: 12, color: COLORS.text3, fontWeight: "600" },

  dateRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: "800", color: COLORS.text2, textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 },
  chipScroll: { flexDirection: "row" },
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  dateChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dateChipText: { fontSize: 13, fontWeight: "800", color: COLORS.text2 },
  dateChipTextActive: { color: "#fff" },

  formGroup: { marginBottom: 28 },
  hugeInput: { fontSize: 32, fontWeight: "900", color: COLORS.text, backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },

  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 },
  optionalText: { fontSize: 12, fontWeight: "600", color: COLORS.text3 },
  allocatedText: { fontSize: 12, fontWeight: "700", color: COLORS.text3 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  gridItem: { width: "48%", backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  gridLabel: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  gridInput: { fontSize: 16, fontWeight: "800", color: COLORS.text, backgroundColor: COLORS.surface2, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});
