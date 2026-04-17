import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Calendar, Target, ChevronRight, Info } from "lucide-react-native";
import { getStoredUser, getActiveSheetId } from "../storage/auth";
import { apiFetch } from "../api/client";
import { CATEGORIES, COLORS as DESIGN_COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";

const { width } = Dimensions.get("window");

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function BudgetFormScreen({ navigation, route }: any) {
  const { mode, budgetId } = route.params || { mode: "add", budgetId: null };
  const isEdit = mode === "edit";

  const { currencySymbol, formatAmount } = useCurrency();
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
  const isValid = totalNum > 0 && year >= 1970;

  const handleSubmit = async () => {
    if (!isValid || saving) return;
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN_COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <X size={24} color={DESIGN_COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Edit Plan" : "Set New Goal"}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount Box */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>TOTAL BUDGET GOAL</Text>
            <View style={styles.amountWrap}>
              <Text style={[styles.currencyPrefix, { color: isValid ? DESIGN_COLORS.primary : DESIGN_COLORS.text3 }]}>
                {currencySymbol}
              </Text>
              <TextInput
                style={[styles.amountInput, { color: isValid ? DESIGN_COLORS.text : DESIGN_COLORS.text3 }]}
                placeholder="0"
                keyboardType="numeric"
                value={totalBudget}
                onChangeText={setTotalBudget}
                placeholderTextColor={DESIGN_COLORS.text3}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAmounts}>
              {[5000, 10000, 25000, 50000, 100000].map(val => (
                <TouchableOpacity 
                  key={val} 
                  style={styles.quickAmtBtn} 
                  onPress={() => setTotalBudget(String(val))}
                >
                  <Text style={styles.quickAmtText}>{currencySymbol}{val.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Period Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Budget Period</Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, periodType === "monthly" && styles.activeTab]}
                onPress={() => setPeriodType("monthly")}
              >
                <Text style={[styles.tabText, periodType === "monthly" && styles.activeTabText]}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, periodType === "yearly" && styles.activeTab]}
                onPress={() => setPeriodType("yearly")}
              >
                <Text style={[styles.tabText, periodType === "yearly" && styles.activeTabText]}>Yearly</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Range Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Select {periodType === "monthly" ? "Month & Year" : "Year"}</Text>
            
            <View style={styles.dateSelectorRow}>
              {periodType === "monthly" && (
                <View style={styles.dateColumn}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {MONTH_FULL.map((mName, i) => {
                      const mNum = i + 1;
                      const active = month === mNum;
                      return (
                        <TouchableOpacity 
                          key={mNum} 
                          style={[styles.dateChip, active && styles.dateChipActive]} 
                          onPress={() => setMonth(mNum)}
                        >
                          <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{mName.substring(0,3)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              
              <View style={[styles.dateColumn, periodType === "yearly" && { flex: 1 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {yearOptions.map(y => {
                    const active = year === y;
                    return (
                      <TouchableOpacity 
                        key={y} 
                        style={[styles.dateChip, active && styles.dateChipActive]} 
                        onPress={() => setYear(y)}
                      >
                        <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Categories Breakdown */}
          <View style={styles.fieldGroup}>
            <View style={styles.categoryHeader}>
              <Text style={styles.label}>Category Limits (Optional)</Text>
              <View style={[styles.allocatedBadge, overAllocated && { backgroundColor: DESIGN_COLORS.red + "15" }]}>
                <Text style={[styles.allocatedText, overAllocated && { color: DESIGN_COLORS.red }]}>
                  {formatAmount(totalAllocated)} Allocated
                </Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Info size={14} color={DESIGN_COLORS.text3} />
              <Text style={styles.infoText}>Defining category limits helps you drill down into your spending habits.</Text>
            </View>

            <View style={styles.grid}>
              {CATEGORIES.map(cat => (
                <View key={cat.id} style={styles.gridItem}>
                  <View style={styles.gridHeader}>
                    <Text style={styles.catIcon}>{cat.icon}</Text>
                    <Text style={styles.catLabel}>{cat.label}</Text>
                  </View>
                  <View style={styles.gridInputWrap}>
                    <Text style={styles.inputPrefix}>{currencySymbol}</Text>
                    <TextInput
                      style={styles.gridInput}
                      placeholder="0"
                      placeholderTextColor={DESIGN_COLORS.text3}
                      keyboardType="numeric"
                      value={categoryAmounts[cat.id] || ""}
                      onChangeText={(val) => handleCategoryChange(cat.id, val)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={saving || !isValid}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isValid 
                ? `🎯 ${isEdit ? "Update" : "Save"} ${formatAmount(totalNum)} Budget`
                : "Enter Budget Group Limit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_COLORS.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  amountContainer: {
    backgroundColor: DESIGN_COLORS.surface2,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 25,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: "800",
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: "800",
    paddingVertical: 8,
    marginLeft: 8,
  },
  quickAmounts: {
    marginTop: 12,
    gap: 8,
  },
  quickAmtBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
  },
  quickAmtText: {
    fontSize: 13,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
  },
  fieldGroup: {
    marginBottom: 30,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_COLORS.text3,
  },
  activeTabText: {
    color: DESIGN_COLORS.text,
  },
  dateSelectorRow: {
    gap: 12,
  },
  dateColumn: {
  },
  chipScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: DESIGN_COLORS.surface2,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
  },
  dateChipActive: {
    backgroundColor: DESIGN_COLORS.primary,
    borderColor: DESIGN_COLORS.primary,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
  },
  dateChipTextActive: {
    color: "#fff",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  allocatedBadge: {
    backgroundColor: DESIGN_COLORS.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  allocatedText: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_COLORS.surface2,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: DESIGN_COLORS.text3,
    fontWeight: "500",
    lineHeight: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  gridItem: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  catIcon: {
    fontSize: 18,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  gridInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  inputPrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN_COLORS.text3,
  },
  gridInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 4,
    fontSize: 15,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: DESIGN_COLORS.border,
    backgroundColor: "#fff",
  },
  saveButton: {
    backgroundColor: DESIGN_COLORS.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: DESIGN_COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: DESIGN_COLORS.surface3,
    shadowOpacity: 0,
    elevation: 0,
  },
});
