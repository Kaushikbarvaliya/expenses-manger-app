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
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Wallet,
  TrendingUp,
  Sparkles,
  CreditCard,
  Clock,
  ChevronRight,
  User,
  Briefcase,
  MoreVertical,
  Edit2,
  Trash2,
  X
} from "lucide-react-native";
import type { StoredUser } from "../navigation/types";
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser, getGuestId } from "../storage/auth";
import { CATEGORIES, INCOME_SOURCES, DESIGN_COLORS } from "../constants/design";
import { AppDatePicker } from "../components/AppDatePicker";
import { PeriodFilter, FilterType } from "../components/PeriodFilter";
import { useCurrency } from "../context/CurrencyContext";

const { width } = Dimensions.get("window");

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectActiveTransactions, setLoggedIn, setTransactions, deleteTransaction } from "../store/slices/transactionSlice";
import type { Expense, Income, Transaction } from "../types";


function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function DashboardScreen({ navigation }: any) {
  const { formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showOptions, setShowOptions] = useState<string | null>(null);

  const { expenses, incomes } = useAppSelector(selectActiveTransactions);

  // Date Filtering State
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const bootstrap = async () => {
      const u = await getStoredUser();
      const sid = await getActiveSheetId();
      setUser(u);
      setSheetId(sid);
      dispatch(setLoggedIn(!!u?.token));
      setLoading(false);
    };
    void bootstrap();
  }, [dispatch, navigation]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    // Fetch from API if user is logged in OR has a guest ID
    const currentGuestId = !user?.token ? await getGuestId() : undefined;

    if (user?.token || currentGuestId) {
      try {
        const [expRes, incRes] = await Promise.all([
          apiFetch<Omit<Expense, "type">[]>("/expenses", {
            token: user?.token,
            sheetId: sheetId || undefined
          }),
          apiFetch<Omit<Income, "type">[]>("/incomes", {
            token: user?.token,
            sheetId: sheetId || undefined
          }),
        ]);
        const mappedExp: Expense[] = (Array.isArray(expRes) ? expRes : []).map(e => ({ ...e, type: "expense" as const }));
        const mappedInc: Income[] = (Array.isArray(incRes) ? incRes : []).map(i => ({ ...i, type: "income" as const }));

        // Update Redux store with API data
        dispatch(setTransactions({ expenses: mappedExp, incomes: mappedInc }));
      } catch (e: unknown) {
        console.log("Failed API sync, sticking to offline data if any.", e);
      }
    }
    // If user is not logged in, we don't need to fetch from API
    // The guest data will be automatically available from Redux state

    if (isRefresh) setRefreshing(false);
  }, [sheetId, user?.token, dispatch]);

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

  // Filtered Content
  const { filteredExpenses, filteredIncomes, totalExpense, totalIncome, balance } = useMemo(() => {
    const matches = (dateStr: string) => {
      const d = new Date(dateStr);
      if (filterType === 'day') {
        return (
          d.getDate() === selectedDate.getDate() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getFullYear() === selectedDate.getFullYear()
        );
      }
      if (filterType === 'month') {
        return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      }
      // year
      return d.getFullYear() === selectedDate.getFullYear();
    };

    const fExp = expenses.filter(e => matches(e.date));
    const fInc = incomes.filter(i => matches(i.date));
    const expTot = fExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const incTot = fInc.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    return {
      filteredExpenses: fExp,
      filteredIncomes: fInc,
      totalExpense: expTot,
      totalIncome: incTot,
      balance: incTot - expTot
    };
  }, [expenses, incomes, selectedDate, filterType]);

  const recentTransactions = useMemo(() => {
    const combined: Transaction[] = [...filteredExpenses, ...filteredIncomes];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined.slice(0, 10);
  }, [filteredExpenses, filteredIncomes]);

  const handleProfileClick = () => {
    if (user?.token) {
      navigation.navigate("Sheets");
    } else {
      navigation.navigate("Login");
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    Alert.alert(
      "Delete Transaction",
      `Are you sure you want to delete this ${transaction.type}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete from Redux store
              dispatch(deleteTransaction({ id: transaction._id, type: transaction.type }));

              // Try to delete from API if user is logged in
              if (user?.token) {
                try {
                  const endpoint = transaction.type === "expense" ? "/expenses" : "/incomes";
                  await apiFetch(`${endpoint}/${transaction._id}`, {
                    method: "DELETE",
                    token: user.token,
                    sheetId: sheetId || undefined,
                  });
                } catch (apiError) {
                  console.log("Failed to delete from API, but local state updated");
                }
              }

              // Refresh data
              await loadData(false);
            } catch (error) {
              Alert.alert("Error", "Failed to delete transaction");
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={["#7C3AED", "#A78BFA"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <SafeAreaView edges={["top"]} style={styles.headerContent}>
        {/* Top row: profile + notification */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.profileBtn} onPress={handleProfileClick}>
            <View style={styles.profileCircle}>
              <User size={24} color={DESIGN_COLORS.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.profileBadge}>
              <Briefcase size={8} color={DESIGN_COLORS.primary} strokeWidth={3} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.notificationBtn}>
            <Bell size={22} color="#fff" strokeWidth={2} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        <PeriodFilter
          type={filterType}
          onTypeChange={setFilterType}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>{formatAmount(balance)}</Text>
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceBadgeText}>
              {balance >= 0 ? "+" : ""}{formatAmount(balance)} for this period
            </Text>
          </View>
          {!user?.token && (
            <View style={styles.guestModeBadge}>
              <Text style={styles.guestModeText}>Guest Mode</Text>
              <Text style={styles.guestModeSubtext}>Login to sync your data</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderSummary = () => (
    <View style={styles.overlapGroup}>
      <View style={styles.summarySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Money</Text>
          <TouchableOpacity style={styles.detailsBtnContainer} onPress={() => navigation.navigate("Report")}>
            <Text style={styles.detailsBtn}>Details</Text>
            <ChevronRight size={12} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#DBEAFE" }]}>
              <TrendingUp size={20} color={DESIGN_COLORS.blue} strokeWidth={2.5} />
            </View>
            <Text style={styles.summaryCardLabel}>Income</Text>
            <Text style={styles.summaryCardValue}>{formatAmount(totalIncome)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#Fee2E2" }]}>
              <Wallet size={20} color={DESIGN_COLORS.red} strokeWidth={2.5} />
            </View>
            <Text style={styles.summaryCardLabel}>Expenses</Text>
            <Text style={styles.summaryCardValue}>{formatAmount(totalExpense)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.insightBanner}>
        <View style={styles.insightLeft}>
          <View style={styles.sparkleContainer}>
            <Sparkles size={16} color="#fff" />
          </View>
          <Text style={styles.insightText}>ght is ready</Text>
        </View>
        <View style={styles.insightActionContainer}>
          <Text style={styles.insightAction}>Get Pro</Text>
          <ChevronRight size={12} color="#9CA3AF" />
        </View>
      </TouchableOpacity>

      <View style={styles.transactionsHeader}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <View style={styles.transactionsActions}>
          <TouchableOpacity style={styles.transActionIcon}>
            <CreditCard size={18} color={DESIGN_COLORS.text3} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.transActionIcon}>
            <Clock size={18} color={DESIGN_COLORS.text3} />
          </TouchableOpacity>
          <View style={styles.periodBadge}>
            <Text style={styles.periodText}>For the Period</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => `${item.type}-${item._id}`}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderSummary()}
          </>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} tintColor={DESIGN_COLORS.primary} />}
        renderItem={({ item }) => {
          const isExp = item.type === "expense";
          const meta = isExp
            ? CATEGORIES.find(c => c.id === (item as Expense).category) || CATEGORIES[CATEGORIES.length - 1]
            : INCOME_SOURCES.find(s => s.id === (item as Income).source) || INCOME_SOURCES[INCOME_SOURCES.length - 1];

          return (
            <View style={styles.transCard}>
              <TouchableOpacity
                style={styles.transMainContent}
                onPress={() => navigation.navigate("AddTransaction", { mode: "edit", id: item._id, type: item.type })}
              >
                <View style={[styles.transIcon, { backgroundColor: meta.color + "15" }]}>
                  <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                </View>
                <View style={styles.transDetails}>
                  <Text style={styles.transTitle}>{meta.label}</Text>
                  <View style={styles.transMeta}>
                    <Text style={styles.transSubtitle} numberOfLines={1}>
                      {item.name || meta.label}
                    </Text>
                    <Text style={styles.transDot}>·</Text>
                    <Text style={styles.transDate}>{formatDate(item.date)}</Text>
                  </View>
                </View>
                <View style={styles.transAmountContainer}>
                  <Text style={[styles.transAmount, { color: isExp ? DESIGN_COLORS.red : DESIGN_COLORS.green }]}>
                    {isExp ? "-" : "+"}{formatAmount(item.amount)}
                  </Text>
                  {isExp && (item as Expense).method === "card" && (
                    <View style={styles.methodBadge}>
                      <CreditCard size={10} color={DESIGN_COLORS.text3} />
                      <Text style={styles.methodText}>Card</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => setShowOptions(showOptions === item._id ? null : item._id)}
              >
                <MoreVertical size={20} color={DESIGN_COLORS.text3} />
              </TouchableOpacity>
              {showOptions === item._id && (
                <View style={styles.optionsMenu}>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      setShowOptions(null);
                      navigation.navigate("AddTransaction", { mode: "edit", id: item._id, type: item.type });
                    }}
                  >
                    <Edit2 size={16} color={DESIGN_COLORS.text} />
                    <Text style={styles.optionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.optionItem, styles.deleteOption]}
                    onPress={() => {
                      setShowOptions(null);
                      handleDelete(item);
                    }}
                  >
                    <Trash2 size={16} color={DESIGN_COLORS.red} />
                    <Text style={[styles.optionText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions for this month</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FE" },
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
  profileBtn: {
    width: 44,
    height: 44,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFD699",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  balanceContainer: {
    alignItems: "center",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "700",
  },
  balanceBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 10,
  },
  balanceBadgeText: {
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
    paddingBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  detailsBtnContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    gap: 4,
  },
  detailsBtn: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    padding: 15,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryCardLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
  sparkleContainer: {
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
  insightActionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  insightAction: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 15,
  },
  transactionsActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  transActionIcon: {
    marginRight: 10,
    opacity: 0.8,
  },
  periodBadge: {
    backgroundColor: "#EDE9FE",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  periodText: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 120,
  },
  transCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
  },
  transIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  transDetails: {
    flex: 1,
    marginLeft: 15,
  },
  transTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  transMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  transSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    maxWidth: width * 0.35,
  },
  transDot: {
    fontSize: 12,
    color: "#9CA3AF",
    marginHorizontal: 6,
  },
  transDate: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  transAmountContainer: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  transAmount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 4,
  },
  methodText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  guestModeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  guestModeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  guestModeSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10,
    marginTop: 2,
  },
  transMainContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  optionsButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: DESIGN_COLORS.surface2,
    marginLeft: 8,
  },
  optionsMenu: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteOption: {
    backgroundColor: DESIGN_COLORS.red + "10",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_COLORS.text,
  },
  deleteText: {
    color: DESIGN_COLORS.red,
  },
});
;

