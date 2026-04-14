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
import type { StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { CATEGORIES, COLORS } from "../constants/design";

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

function formatINR(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₹${Math.round(amount)}`;
  }
}

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
    Alert.alert("Delete Budget?", "Cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
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
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets & Goals</Text>
        <Text style={styles.subtitle}>Set period limits to track your spending.</Text>
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
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No tracking goals set</Text>
              <Text style={styles.emptyText}>Tap “Add” to create your first budget.</Text>
            </View>
          }
          renderItem={({ item }) => {
             const periodLabel = item.periodType === "yearly" ? `Year ${item.year}` : `${MONTH_FULL[item.month - 1]} ${item.year}`;
             const periodIcon = item.periodType === "yearly" ? "📆" : "📅";
             
             const scopedExp = filterExpensesForBudget(expenses, item);
             const spent = scopedExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
             const total = Number(item.totalBudget) || 0;
             const remaining = total - spent;
             const rawPct = total > 0 ? (spent / total) * 100 : 0;
             const pct = Math.min(100, Math.max(0, rawPct));
             const isOver = remaining < 0;
             
             let barColor = COLORS.green;
             if (pct >= 100) barColor = COLORS.red;
             else if (pct >= 80) barColor = COLORS.amber;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                   <View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                         <Text style={{ fontSize: 16 }}>{periodIcon}</Text>
                         <Text style={styles.periodLabel}>{periodLabel}</Text>
                         <View style={[styles.badge, { backgroundColor: item.periodType === "yearly" ? "rgba(124,106,255,0.12)" : "rgba(52,211,153,0.12)" }]}>
                            <Text style={[styles.badgeText, { color: item.periodType === "yearly" ? COLORS.accent2 : COLORS.green }]}>
                               {item.periodType === "yearly" ? "Yearly" : "Monthly"}
                            </Text>
                         </View>
                      </View>
                      <Text style={styles.totalLabel}>Total Budget: {formatINR(total)}</Text>
                   </View>
                   <View style={styles.cardActions}>
                     <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("BudgetForm", { mode: "edit", budgetId: item._id })}>
                        <Text style={{ fontSize: 12 }}>✏️</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => void deleteBudget(item._id)}>
                        <Text style={{ fontSize: 12 }}>🗑️</Text>
                     </TouchableOpacity>
                   </View>
                </View>

                {/* Main Progress Bar */}
                <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                       <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}>{formatINR(spent)} spent</Text>
                       <Text style={{ fontSize: 13, fontWeight: "700", color: isOver ? COLORS.red : COLORS.text3 }}>{isOver ? `${formatINR(Math.abs(remaining))} over` : `${formatINR(remaining)} left`}</Text>
                    </View>
                    <View style={styles.barBackground}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                    </View>
                </View>

                {/* Category Breakdown */}
                {item.categories && item.categories.some(c => c.amount > 0) && (
                  <View style={styles.catSection}>
                    {item.categories.filter(c => c.amount > 0).map((catBud) => {
                      const catInfo = CATEGORIES.find(c => c.id === catBud.category) || CATEGORIES[CATEGORIES.length - 1];
                      const catSpent = scopedExp.filter(e => e.category === catBud.category).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                      const catPct = Math.min(100, Math.max(0, (catSpent / catBud.amount) * 100));
                      const catOver = catSpent > catBud.amount;

                      return (
                        <View key={catBud.category} style={styles.catRow}>
                           <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                              <Text style={styles.catLabel}>{catInfo.icon} {catInfo.label}</Text>
                              <Text style={[styles.catValue, catOver && { color: COLORS.red }]}>
                                 ₹{catSpent} / ₹{catBud.amount}
                              </Text>
                           </View>
                           <View style={styles.miniBarBg}>
                              <View style={[styles.miniBarFill, { width: `${catPct}%`, backgroundColor: catOver ? COLORS.red : COLORS.accent }]} />
                           </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.text },
  subtitle: { fontSize: 13, fontWeight: "800", color: COLORS.text3, marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  centerText: { color: COLORS.text3, fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  
  empty: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  emptyText: { fontSize: 13, fontWeight: "700", color: COLORS.text3, marginTop: 4 },
  
  card: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  periodLabel: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  totalLabel: { fontSize: 12, fontWeight: "600", color: COLORS.text3 },
  
  cardActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center" },
  deleteBtn: { borderColor: "rgba(220,38,38,0.2)", backgroundColor: "rgba(220,38,38,0.05)" },

  barBackground: { height: 10, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  
  catSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingTop: 16, gap: 14 },
  catRow: { gap: 0 },
  catLabel: { fontSize: 13, fontWeight: "800", color: COLORS.text2 },
  catValue: { fontSize: 12, fontWeight: "700", color: COLORS.text3 },
  miniBarBg: { height: 6, backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 3, overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 3 },
  
});
