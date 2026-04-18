import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart, LineChart } from "react-native-gifted-charts";
import { ChevronLeft, BarChart2, PieChart as PieIcon, ChevronDown } from "lucide-react-native";
import { apiFetch } from "../api/client";
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { CATEGORIES, COLORS, INCOME_SOURCES } from "../constants/design";
import { AppDatePicker } from "../components/AppDatePicker";
import { useCurrency } from "../context/CurrencyContext";
import theme from "../theme/theme";
import type { StoredUser } from "../navigation/types";

const { width } = Dimensions.get("window");

import { useAppSelector } from "../store/hooks";
import { selectActiveTransactions } from "../store/slices/transactionSlice";
import type { Transaction } from "../types";

export function ReportScreen({ navigation }: any) {
  const { formatAmount } = useCurrency();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { expenses, incomes } = useAppSelector(selectActiveTransactions);
  const transactions = useMemo<Transaction[]>(() => [...expenses, ...incomes], [expenses, incomes]);

  // Filtering & Toggles
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportType, setReportType] = useState<"expense" | "income">("expense");
  const [chartType, setChartType] = useState<"donut" | "line">("donut");

  useEffect(() => {
    const bootstrap = async () => {
      const u = await getStoredUser();
      const sid = await getActiveSheetId();
      setUser(u);
      setSheetId(sid);
      setLoading(false);
    };
    void bootstrap();
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 500);
    }
  }, []);

  // Aggregated Data by selected month/year
  const categoryData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      const isType = t.type === reportType;
      const isMonth = d.getMonth() === selectedDate.getMonth();
      const isYear = d.getFullYear() === selectedDate.getFullYear();
      return isType && isMonth && isYear;
    });

    const totals: Record<string, number> = {};

    filtered.forEach(t => {
      const key = reportType === "expense" ? t.category : t.source;
      if (key) totals[key] = (totals[key] || 0) + Number(t.amount);
    });

    const totalAmount = Object.values(totals).reduce((sum, val) => sum + val, 0);

    return Object.entries(totals).map(([key, value]) => {
      const meta = reportType === "expense"
        ? CATEGORIES.find(c => c.id === key)
        : INCOME_SOURCES.find(s => s.id === key);

      return {
        value,
        color: meta?.color || COLORS.primary,
        label: meta?.label || key,
        percentage: totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : "0",
        icon: meta?.icon || "❓",
        id: key
      };
    }).sort((a, b) => b.value - a.value);
  }, [transactions, reportType, selectedDate]);

  const totalAmount = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + item.value, 0);
  }, [categoryData]);

  // Weekly Trend Data for the selected month
  const lineData = useMemo(() => {
    const weeks = [
      { value: 0, label: "W1" },
      { value: 0, label: "W2" },
      { value: 0, label: "W3" },
      { value: 0, label: "W4" },
    ];

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === reportType &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear()) {
        const day = d.getDate();
        if (day <= 7) weeks[0].value += t.amount;
        else if (day <= 14) weeks[1].value += t.amount;
        else if (day <= 21) weeks[2].value += t.amount;
        else weeks[3].value += t.amount;
      }
    });

    return weeks;
  }, [transactions, reportType, selectedDate]);


  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft color={COLORS.text} size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report</Text>
          <View style={styles.monthPickerContainer}>
            <AppDatePicker
              value={selectedDate.toISOString()}
              onChange={(iso) => setSelectedDate(new Date(iso))}
              mode="month"
            />
          </View>
        </View>

        {/* Expenses/Income Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, reportType === "expense" && styles.typeBtnActive]}
            onPress={() => setReportType("expense")}
          >
            <Text style={[styles.typeBtnText, reportType === "expense" && styles.typeBtnTextActive]}>Expenses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, reportType === "income" && styles.typeBtnActive]}
            onPress={() => setReportType("income")}
          >
            <Text style={[styles.typeBtnText, reportType === "income" && styles.typeBtnTextActive]}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{reportType === "expense" ? "Expenses" : "Income"} Report</Text>
            <View style={styles.chartToggles}>
              <TouchableOpacity onPress={() => setChartType("line")} style={styles.toggleIcon}>
                <BarChart2 size={20} color={chartType === "line" ? COLORS.primary : COLORS.text3} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setChartType("donut")} style={styles.toggleIcon}>
                <PieIcon size={20} color={chartType === "donut" ? COLORS.primary : COLORS.text3} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartView}>
            {chartType === "donut" ? (
              <View style={styles.donutWrapper}>
                <PieChart
                  donut
                  radius={120}
                  innerRadius={80}
                  data={categoryData.length > 0 ? categoryData : [{ value: 1, color: "#f0f0f0" }]}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.centerLabel}>Total {reportType === "expense" ? "Expenses" : "Income"}</Text>
                      <Text style={styles.centerValue}>{formatAmount(totalAmount)}</Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={styles.lineWrapper}>
                <LineChart
                  data={lineData}
                  height={180}
                  width={width - 80}
                  color={COLORS.primary}
                  thickness={3}
                  hideDataPoints
                  noOfSections={3}
                  yAxisTextStyle={{ color: COLORS.text3, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: COLORS.text3, fontSize: 10 }}
                  areaChart
                  startFillColor={COLORS.primary}
                  startOpacity={0.2}
                  endOpacity={0}
                />
              </View>
            )}
          </View>
        </View>

        {/* Categories List */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All {reportType === "expense" ? "Expenses" : "Income"}</Text>
            <Text style={styles.sectionTotal}>Total <Text style={{ fontWeight: "800" }}>{formatAmount(totalAmount)}</Text></Text>
          </View>

          {categoryData.map((item, index) => (
            <View key={item.id} style={styles.categoryCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: item.color + "15" }]}>
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{item.label}</Text>
                  <Text style={styles.categoryMeta}>{item.percentage}% of total</Text>
                </View>
                <View style={styles.categoryValueContainer}>
                  <Text style={styles.categoryAmount}>{formatAmount(item.value)}</Text>
                  <Text style={[styles.trendText, { color: COLORS.green }]}>+12% <Text style={{ color: COLORS.text3, fontWeight: "400" }}>vs last month</Text></Text>
                </View>
              </View>
              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FE" },
  scrollContent: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  monthPickerContainer: {
    width: 150,
    marginBottom: -theme.SPACING.lg,
  },
  monthPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthText: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginRight: 4 },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
    padding: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 16 },
  typeBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  typeBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.text3 },
  typeBtnTextActive: { color: COLORS.text },
  chartContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 30,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  chartToggles: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 4 },
  toggleIcon: { padding: 8, borderRadius: 8 },
  chartView: { alignItems: "center", justifyContent: "center", minHeight: 250 },
  donutWrapper: { paddingVertical: 10 },
  centerLabel: { fontSize: 12, color: COLORS.text2, fontWeight: "600", marginBottom: 4 },
  centerValue: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  lineWrapper: { paddingVertical: 10 },
  categoriesSection: { paddingHorizontal: 20, marginTop: 30 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text3 },
  sectionTotal: { fontSize: 14, color: COLORS.text2 },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  categoryIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  categoryInfo: { flex: 1, marginLeft: 15 },
  categoryName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  categoryMeta: { fontSize: 12, color: COLORS.text3, marginTop: 2 },
  categoryValueContainer: { alignItems: "flex-end" },
  categoryAmount: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  trendText: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
});
