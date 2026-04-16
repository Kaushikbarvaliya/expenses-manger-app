import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, ChevronRight } from "lucide-react-native";
import type { StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { CATEGORIES, COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
import { BudgetCard } from "../components/BudgetCard";

type Budget = {
  _id: string;
  periodType: "monthly" | "yearly";
  month: number;
  year: number;
  totalBudget: number;
  categories: { category: string; amount: number }[];
};

type Expense = {
  category: string;
  amount: number;
  date: string;
};

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


// Same as Web: Filters expenses that fall inside this budget's period
function filterExpensesForBudget(expenses: Expense[], budget: Budget) {
  return expenses.filter((e) => {
    const d = new Date(e.date);
    if (isNaN(d.getTime())) return false;
    const expYear = d.getFullYear();
    const expMonth = d.getMonth() + 1;
    if (budget.periodType === "yearly") return expYear === budget.year;
    return expYear === budget.year && expMonth === budget.month;
  });
}

export function BudgetsScreen({ navigation }: any) {
  const { formatAmount, currencySymbol } = useCurrency();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const bootstrap = async () => {
      setUser(await getStoredUser());
      setSheetId(await getActiveSheetId());
      setLoading(false);
    };
    void bootstrap();
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user?.token) return;
    if (isRefresh) setRefreshing(true);
    try {
      const [budgetsData, expensesData] = await Promise.all([
        apiFetch<Budget[]>("/budgets", { token: user.token, sheetId: sheetId || undefined }),
        apiFetch<Expense[]>("/expenses", { token: user.token, sheetId: sheetId || undefined }),
      ]);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (e: unknown) {
      Alert.alert("Failed to load budgets", e instanceof Error ? e.message : "Error");
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

  const deleteBudget = async (id: string) => {
    if (!user?.token) return;
    try {
      await apiFetch<{ message: string }>(`/budgets/${id}`, {
        method: "DELETE",
        token: user.token,
        sheetId: sheetId || undefined,
      });
      setBudgets((prev) => prev.filter((b) => b._id !== id));
    } catch (e: unknown) {
      Alert.alert("Delete failed", e instanceof Error ? e.message : "Error");
    }
  };

  const handleEditBudget = (budget: Budget) => {
    navigation.navigate("BudgetForm", { mode: "edit", budgetId: budget._id });
  };

  const handleDeleteBudget = (budgetId: string) => {
    deleteBudget(budgetId);
  };

  const handleAddBudget = () => {
    navigation.navigate("BudgetForm", { mode: "add" });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Budgets & Goals</Text>
            <Text style={styles.subtitle}>Set period limits to track your spending.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddBudget}>
            <Plus size={20} color={COLORS.primary} strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Add Budget</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /><Text style={styles.centerText}>Loading…</Text></View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={budgets}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
          ListEmptyComponent={
            !user?.token ? (
              <View style={styles.guestPlaceholder}>
                <Text style={styles.guestIcon}>🎯</Text>
                <Text style={styles.emptyTitle}>Budgets are for members</Text>
                <Text style={styles.emptyText}>Sign in to set monthly limits, track category spending, and keep your finances on target across all your devices.</Text>
                <TouchableOpacity style={styles.signinBtn} onPress={() => navigation.navigate("Settings")}>
                  <Text style={styles.signinBtnText}>Go to Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No tracking goals set</Text>
                <Text style={styles.emptyText}>Tap “Add” to create your first budget.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <BudgetCard
              budget={item}
              expenses={expenses}
              onEdit={handleEditBudget}
              onDelete={handleDeleteBudget}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.text },
  subtitle: { fontSize: 13, fontWeight: "800", color: COLORS.text3, marginTop: 4 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 106, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(124, 106, 255, 0.2)",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  centerText: { color: COLORS.text3, fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  
  empty: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  emptyText: { fontSize: 13, fontWeight: "700", color: COLORS.text3, marginTop: 4 },
  
  guestPlaceholder: { 
    padding: 30, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    backgroundColor: COLORS.surface,
    alignItems: "center",
    gap: 12,
    marginTop: 20
  },
  guestIcon: { fontSize: 40, marginBottom: 8 },
  signinBtn: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  signinBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
