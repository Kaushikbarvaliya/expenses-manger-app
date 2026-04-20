import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { X, Calendar, Repeat, ArrowRight } from "lucide-react-native";

import { RootStackParamList } from "../navigation/types";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addRecurring, updateRecurring } from "../store/slices/recurringSlice";
import { AppDatePicker } from "../components/AppDatePicker";
import { CATEGORIES, INCOME_SOURCES, DESIGN_COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
import theme from "../theme/theme";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type Props = NativeStackScreenProps<RootStackParamList, "AddEditRecurring">;

export function AddEditRecurringScreen({ navigation, route }: Props) {
  const { currencySymbol, formatAmount } = useCurrency();
  const isEditing = route.params.mode === "edit";
  const itemId = route.params.mode === "edit" ? route.params.id : undefined;

  const dispatch = useAppDispatch();
  const { items, loading: storeLoading } = useAppSelector((state) => state.recurring);

  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isEditing && itemId) {
      const existing = items.find((i) => i._id === itemId);
      if (existing) {
        setType(existing.type);
        setTitle(existing.name);
        setAmount(String(existing.amount));
        setCategory(existing.category);
        setFrequency(existing.frequency as Frequency);
        setStartDate(new Date(existing.startDate));
        if (existing.endDate) {
          setEndDate(new Date(existing.endDate));
        }
      }
    }
  }, [isEditing, itemId, items]);

  const categories = type === "expense" ? CATEGORIES : INCOME_SOURCES;
  const selectedCat = categories.find(c => c.id === category) || categories[categories.length - 1];

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Input", "Please provide a title and a valid amount.");
      return;
    }

    setSaving(true);
    const payload = {
      type,
      name: title.trim(),
      amount: numAmount,
      category,
      frequency,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate ? endDate.toISOString().split("T")[0] : null,
    };

    try {
      if (isEditing && itemId) {
        await dispatch(updateRecurring({ id: itemId, data: payload })).unwrap();
      } else {
        await dispatch(addRecurring(payload as any)).unwrap();
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save recurring transaction.");
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (newType: "income" | "expense") => {
    setType(newType);
    // Reset category to 'other' if the current category doesn't exist in the new type's list
    const newCategories = newType === "expense" ? CATEGORIES : INCOME_SOURCES;
    if (!newCategories.find(c => c.id === category)) {
      setCategory("other");
    }
  };

  const isValid = title.trim().length > 0 && parseFloat(amount) > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <X size={24} color={DESIGN_COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? "Edit" : "Schedule"} Plan</Text>
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
            <Text style={styles.amountLabel}>RECURRING AMOUNT</Text>
            <View style={styles.amountWrap}>
              <Text style={[styles.currencyPrefix, { color: isValid ? DESIGN_COLORS.primary : DESIGN_COLORS.text3 }]}>
                {currencySymbol}
              </Text>
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
              {[500, 1000, 2000, 5000, 10000].map(val => (
                <TouchableOpacity
                  key={val}
                  style={styles.quickAmtBtn}
                  onPress={() => setAmount(String(val))}
                >
                  <Text style={styles.quickAmtText}>{currencySymbol}{val}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Type Toggle */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, type === "expense" && styles.activeTab]}
              onPress={() => handleTypeChange("expense")}
            >
              <Text style={[styles.tabText, type === "expense" && styles.activeTabText]}>
                Expenses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, type === "income" && styles.activeTab]}
              onPress={() => handleTypeChange("income")}
            >
              <Text style={[styles.tabText, type === "income" && styles.activeTabText]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder='e.g. "Rent", "Netflix", "Salary"...'
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={DESIGN_COLORS.text3}
            />
          </View>

          {/* Category Grid */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSel = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryPill,
                      isSel && { borderColor: cat.color, backgroundColor: cat.color + "15" }
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryLabel, isSel && { color: cat.color }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Frequency Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.freqContainer}>
              {(["daily", "weekly", "monthly", "yearly"] as Frequency[]).map((f) => {
                const isSel = frequency === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqBtn, isSel && styles.freqBtnActive]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={[styles.freqBtnText, isSel && styles.freqBtnTextActive]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <AppDatePicker
                label="Start Date"
                value={startDate.toISOString()}
                onChange={(iso) => setStartDate(new Date(iso))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppDatePicker
                label="End Date (Optional)"
                value={endDate ? endDate.toISOString() : null}
                onChange={(iso) => setEndDate(iso ? new Date(iso) : null)}
                minDate={startDate}
                placeholder="No end date"
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving || !isValid}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isValid
                ? `${selectedCat.icon} ${isEditing ? "Update" : "Schedule"} ${formatAmount(parseFloat(amount))}`
                : "Schedule Plan"}
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 14,
    padding: 4,
    marginBottom: 30,
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
  fieldGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    padding: 16,
    fontSize: 16,
    color: DESIGN_COLORS.text,
    fontWeight: "600",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  categoryPill: {
    width: "22%",
    alignItems: "center",
    paddingVertical: 14,
    marginHorizontal: "1.5%",
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    backgroundColor: "#fff",
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
  },
  freqContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  freqBtn: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: DESIGN_COLORS.surface2,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    alignItems: "center",
  },
  freqBtnActive: {
    backgroundColor: DESIGN_COLORS.primary,
    borderColor: DESIGN_COLORS.primary,
  },
  freqBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  freqBtnTextActive: {
    color: "#fff",
  },
  dateRow: {
    flexDirection: "row",
    gap: 15,
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
