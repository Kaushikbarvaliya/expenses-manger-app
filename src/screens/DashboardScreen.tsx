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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { clearStoredUser, getActiveSheetId, getStoredUser } from "../storage/auth";
import { CATEGORIES, INCOME_SOURCES, COLORS } from "../constants/design";

type Expense = {
  _id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  method?: string;
  familyMemberName?: string;
  recurring?: boolean;
  type: "expense";
};

type Income = {
  _id: string;
  name: string;
  source: string;
  amount: number;
  date: string;
  method?: string;
  familyMemberName?: string;
  type: "income";
};

type Transaction = Expense | Income;

function formatINR(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₹${Math.round(amount)}`;
  }
}

export function DashboardScreen({ navigation }: any) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  useEffect(() => {
    const bootstrap = async () => {
      const u = await getStoredUser();
      const sid = await getActiveSheetId();
      if (!u?.token) {
        navigation.replace("Login");
        return;
      }
      setUser(u);
      setSheetId(sid);
      setLoading(false);
    };
    void bootstrap();
  }, [navigation]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user?.token) return;
    if (isRefresh) setRefreshing(true);
    try {
      const [expRes, incRes] = await Promise.all([
        apiFetch<Omit<Expense, "type">[]>("/expenses", { token: user.token, sheetId: sheetId || undefined }),
        apiFetch<Omit<Income, "type">[]>("/incomes", { token: user.token, sheetId: sheetId || undefined }),
      ]);
      const mappedExp = (Array.isArray(expRes) ? expRes : []).map(e => ({ ...e, type: "expense" as const }));
      const mappedInc = (Array.isArray(incRes) ? incRes : []).map(i => ({ ...i, type: "income" as const }));
      setExpenses(mappedExp);
      setIncomes(mappedInc);
    } catch (e: unknown) {
      Alert.alert("Failed to load data", e instanceof Error ? e.message : "Failed to load dashboard data");
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

  const { totalExpense, totalIncome, balance } = useMemo(() => {
    const exp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const inc = incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    return { totalExpense: exp, totalIncome: inc, balance: inc - exp };
  }, [expenses, incomes]);

  const recentTransactions = useMemo(() => {
    const combined: Transaction[] = [...expenses, ...incomes];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined.slice(0, 10);
  }, [expenses, incomes]);

  const handleLogout = async () => {
    await clearStoredUser();
    navigation.replace("Login");
  };

  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Income</Text>
        <Text style={[styles.summaryValue, { color: COLORS.green }]}>{formatINR(totalIncome)}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Expense</Text>
        <Text style={[styles.summaryValue, { color: COLORS.red }]}>{formatINR(totalExpense)}</Text>
      </View>
      <View style={[styles.summaryCard, { width: "100%", backgroundColor: COLORS.text, marginTop: 8 }]}>
        <Text style={[styles.summaryLabel, { color: "rgba(255,255,255,0.7)" }]}>Balance</Text>
        <Text style={[styles.summaryValue, { color: balance >= 0 ? COLORS.green : COLORS.red, fontSize: 28 }]}>
          {formatINR(balance)}
        </Text>
      </View>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Overview</Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void handleLogout()} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.centerText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={recentTransactions}
          keyExtractor={(item) => `${item.type}-${item._id}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
          ListHeaderComponent={renderSummaryCards}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>Tap the buttons below to add expenses or incomes.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isExp = item.type === "expense";
            const meta = isExp 
                ? CATEGORIES.find(c => c.id === (item as Expense).category) || CATEGORIES[CATEGORIES.length - 1]
                : INCOME_SOURCES.find(s => s.id === (item as Income).source) || INCOME_SOURCES[INCOME_SOURCES.length - 1];

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: meta.color + "18" }]}>
                    <Text style={styles.iconText}>{meta.icon}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {isExp ? (item as Expense).category === "other" && item.name ? item.name : meta.label : (item as Income).source === "other" && item.name ? item.name : meta.label}
                      {isExp && (item as Expense).recurring ? "  🔄" : ""}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.name} · {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {item.familyMemberName ? ` · ${item.familyMemberName}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: isExp ? COLORS.red : COLORS.green }]}>
                    {isExp ? "-" : "+"}{formatINR(item.amount)}
                  </Text>
                </View>
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
  header: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "space-between",
  },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.text },
  secondaryButton: {
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, paddingVertical: 8, paddingHorizontal: 12,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  centerText: { color: COLORS.text2, fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  summaryContainer: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    marginBottom: 6, marginTop: 4,
  },
  summaryCard: {
    width: "48%", backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  summaryLabel: {
    fontSize: 12, fontWeight: "700", color: COLORS.text2, textTransform: "uppercase", letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  sectionTitle: { width: "100%", fontSize: 18, fontWeight: "800", color: COLORS.text, marginTop: 20, marginBottom: 4 },
  empty: {
    padding: 18, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, gap: 6, marginTop: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  emptyText: { fontSize: 13, fontWeight: "700", color: COLORS.text2 },
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  iconText: { fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  cardMeta: { fontSize: 12, fontWeight: "600", color: COLORS.text2, marginTop: 4 },
  amount: { fontSize: 15, fontWeight: "900" },
});
