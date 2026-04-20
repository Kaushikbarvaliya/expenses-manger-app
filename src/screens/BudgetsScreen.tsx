import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, ChevronRight, Target, TrendingUp, Sparkles, LogIn, PieChart } from "lucide-react-native";
import type { StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { DESIGN_COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
import { BudgetCard } from "../components/BudgetCard";
import { AppDatePicker } from "../components/AppDatePicker";
import { PeriodFilter, FilterType } from "../components/PeriodFilter";

const { width } = Dimensions.get("window");

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

export function BudgetsScreen({ navigation }: any) {
  const { formatAmount } = useCurrency();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Date Filtering State
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      console.log("Failed to load budgets", e);
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
      Alert.alert("Error", "Could not delete budget");
    }
  };

  const handleEditBudget = (budget: Budget) => {
    navigation.navigate("BudgetForm", { mode: "edit", budgetId: budget._id });
  };

  const handleDeleteBudget = (budgetId: string) => {
    Alert.alert("Delete Budget", "Are you sure you want to remove this budget and all its category limits?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteBudget(budgetId) }
    ]);
  };

  const handleAddBudget = () => {
    navigation.navigate("BudgetForm", { mode: "add" });
  };

  // Filtered Content Logic
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      if (filterType === 'year') {
        return b.periodType === 'yearly' && b.year === selectedDate.getFullYear();
      }
      // For both 'day' and 'month', we show the monthly budgets for that month
      return b.periodType === 'monthly' && b.month === (selectedDate.getMonth() + 1) && b.year === selectedDate.getFullYear();
    });
  }, [budgets, filterType, selectedDate]);

  const { totalLimit, totalSpent, healthStatus } = useMemo(() => {
    const limit = filteredBudgets.reduce((sum, b) => sum + (Number(b.totalBudget) || 0), 0);

    let spent = 0;
    filteredBudgets.forEach(b => {
      const scopedExp = expenses.filter(e => {
        const d = new Date(e.date);
        if (isNaN(d.getTime())) return false;

        // Base check for period type
        const matchesPeriod = b.periodType === "yearly"
          ? d.getFullYear() === b.year
          : d.getFullYear() === b.year && d.getMonth() + 1 === b.month;

        if (!matchesPeriod) return false;

        // If filtering by day, only count expenses on that exact day
        if (filterType === 'day') {
          return d.getDate() === selectedDate.getDate() &&
            d.getMonth() === selectedDate.getMonth() &&
            d.getFullYear() === selectedDate.getFullYear();
        }

        return true;
      });
      spent += scopedExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    });

    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    let status = "On Track";
    if (pct >= 100) status = "Over Budget";
    else if (pct >= 85) status = "At Risk";

    return { totalLimit: limit, totalSpent: spent, healthStatus: status };
  }, [filteredBudgets, expenses, filterType, selectedDate]);

  const renderHeader = () => (
    <LinearGradient
      colors={DESIGN_COLORS.primaryGradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <SafeAreaView edges={["top"]} style={styles.headerContent}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronRight size={24} color="#fff" style={{ transform: [{ rotate: "180deg" }] }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Budgets & Goals</Text>
          <TouchableOpacity
            style={styles.plusButton}
            onPress={handleAddBudget}
          >
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <PeriodFilter
          type={filterType}
          onTypeChange={setFilterType}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Combined Goal Limit</Text>
          <Text style={styles.summaryAmount}>{formatAmount(totalLimit)}</Text>
          <View style={styles.statusBadge}>
            <Target size={12} color="#fff" />
            <Text style={styles.statusText}>{filteredBudgets.length} Active Targets</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderSummaryCard = () => (
    <View style={styles.overlapGroup}>
      <View style={styles.summarySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Health</Text>
          <View style={[
            styles.healthPill,
            healthStatus === "Over Budget" ? { backgroundColor: DESIGN_COLORS.red + "15" } :
              healthStatus === "At Risk" ? { backgroundColor: DESIGN_COLORS.amber + "15" } :
                { backgroundColor: DESIGN_COLORS.green + "15" }
          ]}>
            <TrendingUp size={12} color={healthStatus === "Over Budget" ? DESIGN_COLORS.red : healthStatus === "At Risk" ? DESIGN_COLORS.amber : DESIGN_COLORS.green} />
            <Text style={[
              styles.healthText,
              { color: healthStatus === "Over Budget" ? DESIGN_COLORS.red : healthStatus === "At Risk" ? DESIGN_COLORS.amber : DESIGN_COLORS.green }
            ]}>{healthStatus}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Aggregated Spent</Text>
            <Text style={styles.cardValue}>{formatAmount(totalSpent)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Remaining Pool</Text>
            <Text style={[styles.cardValue, totalLimit - totalSpent < 0 && { color: DESIGN_COLORS.red }]}>
              {formatAmount(Math.max(0, totalLimit - totalSpent))}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.insightBanner}
        onPress={handleAddBudget}
      >
        <View style={styles.insightLeft}>
          <View style={styles.sparkleBox}>
            <Sparkles size={16} color="#fff" />
          </View>
          <Text style={styles.insightText}>Set a new spending goal</Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {!user?.token ? (
        <View style={styles.guestState}>
          <View style={styles.emptyIconCircle}>
            <LogIn size={40} color={DESIGN_COLORS.text3} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Budgets for Members</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to set recurring budget goals, track category limits, and sync data across all your devices.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.primaryBtnText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconCircle}>
            <PieChart size={40} color={DESIGN_COLORS.text3} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No targets set</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to start tracking your spending against monthly or yearly goals.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleAddBudget}
          >
            <Text style={styles.primaryBtnText}>Add First Budget</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={filteredBudgets}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderSummaryCard()}
            {filteredBudgets.length > 0 && (
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Your Budgets</Text>
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor={DESIGN_COLORS.primary}
          />
        }
        renderItem={({ item }) => (
          <BudgetCard
            budget={item}
            expenses={expenses}
            onEdit={handleEditBudget}
            onDelete={handleDeleteBudget}
            filterType={filterType}
            selectedDate={selectedDate}
          />
        )}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.bg,
  },
  headerGradient: {
    paddingBottom: 40,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryContainer: {
    alignItems: "center",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 10,
    gap: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  overlapGroup: {
    marginTop: -30,
    paddingHorizontal: 20,
  },
  summarySection: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  healthPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  healthText: {
    fontSize: 11,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCard: {
    width: "48%",
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 20,
    padding: 15,
  },
  cardLabel: {
    fontSize: 12,
    color: DESIGN_COLORS.text2,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  insightBanner: {
    backgroundColor: "#111827",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginTop: 20,
  },
  insightLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sparkleBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 6,
    borderRadius: 8,
  },
  insightText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 10,
    fontSize: 14,
  },
  listHeader: {
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: DESIGN_COLORS.surface2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: DESIGN_COLORS.text,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DESIGN_COLORS.text2,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
  },
  primaryBtn: {
    backgroundColor: DESIGN_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 15,
    shadowColor: DESIGN_COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  guestState: {
    alignItems: "center",
  },
  emptyContent: {
    alignItems: "center",
  },
});
