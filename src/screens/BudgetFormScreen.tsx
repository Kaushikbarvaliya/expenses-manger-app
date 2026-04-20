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
import { X, Target, Info } from "lucide-react-native";
import { AppDatePicker } from "../components/AppDatePicker";
import { getStoredUser, getActiveSheetId } from "../storage/auth";
import { apiFetch } from "../api/client";
import { CATEGORIES, DESIGN_COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
// BudgetFormScreen only uses 'month' and 'year' — 'day' is not a valid budget period
type BudgetPeriodType = 'month' | 'year';

// Maps frontend FilterType ('month'/'year') to backend periodType ('monthly'/'yearly')
function toBackendPeriodType(pt: BudgetPeriodType): 'monthly' | 'yearly' {
  return pt === 'year' ? 'yearly' : 'monthly';
}

const { width } = Dimensions.get("window");

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function BudgetFormScreen({ navigation, route }: any) {
  const { mode, budgetId } = route.params || { mode: "add", budgetId: null };
  const isEdit = mode === "edit";

  const { currencySymbol, formatAmount } = useCurrency();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const now = new Date();
  const [periodType, setPeriodType] = useState<BudgetPeriodType>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
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
          const type = bud.periodType === 'yearly' ? 'year' : 'month';
          setPeriodType(type as BudgetPeriodType);
          
          if (type === 'month') {
            setSelectedDate(new Date(bud.year || now.getFullYear(), (bud.month || 1) - 1, 1));
          } else {
            setSelectedDate(new Date(bud.year || now.getFullYear(), 0, 1));
          }
          
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
  const year = selectedDate.getFullYear();
  // 'day' is not a valid budget period — budgets are monthly or yearly only
  const isValid = totalNum > 0 && year >= 1970 && (periodType === 'month' || periodType === 'year');

  const handleSubmit = async () => {
    if (saving) return;

    // Frontend validation before hitting API
    if (periodType !== 'month' && periodType !== 'year') {
      Alert.alert("Invalid Period", "periodType must be either 'monthly' or 'yearly'.");
      return;
    }
    if (!isValid) return;

    setSaving(true);
    try {
      const u = await getStoredUser();
      const sid = await getActiveSheetId();
      if (!u?.token) throw new Error("Not logged in");

      // Map frontend type to backend-accepted values
      const backendPeriodType = toBackendPeriodType(periodType);

      // Only send fields the backend accepts — no 'amount', 'periodValue', 'day' related fields
      const payload = {
        periodType: backendPeriodType,          // 'monthly' | 'yearly' only
        month: selectedDate.getMonth() + 1,     // 1-12 (required for monthly)
        year: selectedDate.getFullYear(),        // e.g. 2026
        totalBudget: totalNum,                  // the actual budget limit
        categories: CATEGORIES.map((cat) => ({
          category: cat.id,
          amount: Number(categoryAmounts[cat.id] || 0)
        })).filter(c => c.amount > 0),           // only send categories with amounts set
      };

      // Backend uses upsert (POST /budgets) for both create and edit — no PUT endpoint
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

          {/* Budget Period Selector — 'day' is excluded, only Monthly / Yearly */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Budget Period</Text>
            <View style={styles.filterContainer}>
              {/* Custom 2-tab toggle: Month | Year only (no Day for budgets) */}
              <View style={styles.periodToggleRow}>
                {(['month', 'year'] as const).map((pt) => (
                  <TouchableOpacity
                    key={pt}
                    style={[
                      styles.periodTab,
                      periodType === pt && styles.periodTabActive,
                    ]}
                    onPress={() => {
                      setPeriodType(pt);
                      setShowDatePicker(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.periodTabText,
                      periodType === pt && styles.periodTabTextActive,
                    ]}>
                      {pt === 'month' ? 'Monthly' : 'Yearly'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tappable date label — opens the picker */}
              <TouchableOpacity
                style={styles.dateLabelRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dateLabelText}>
                  {periodType === 'month'
                    ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : String(selectedDate.getFullYear())}
                </Text>
                <Text style={[styles.dateLabelText, { fontSize: 12, opacity: 0.7, marginTop: 2 }]}>▾ tap to change</Text>
              </TouchableOpacity>

              {/* Conditionally rendered AppDatePicker with autoOpen */}
              {showDatePicker && (
                <View style={{ height: 0, overflow: 'hidden' }}>
                  <AppDatePicker
                    key={`budget-period-${periodType}-${showDatePicker}`}
                    value={selectedDate.toISOString()}
                    onChange={(iso) => {
                      setSelectedDate(new Date(iso));
                      setShowDatePicker(false);
                    }}
                    onDismiss={() => setShowDatePicker(false)}
                    mode={periodType === 'month' ? 'month' : 'year'}
                    allowModeSwitch={false}
                    autoOpen
                  />
                </View>
              )}
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
  filterContainer: {
    backgroundColor: DESIGN_COLORS.primary,
    borderRadius: 24,
    padding: 20,
    shadowColor: DESIGN_COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
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
  // Period toggle styles (Monthly / Yearly — no Day for budgets)
  periodToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  periodTabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
  },
  periodTabTextActive: {
    color: DESIGN_COLORS.primary,
  },
  dateLabelRow: {
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 4,
  },
  dateLabelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
