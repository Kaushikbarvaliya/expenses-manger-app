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
import { getActiveSheetId, getStoredUser } from "../storage/auth";
import { CATEGORIES, COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { deleteTransaction, selectActiveTransactions } from "../store/slices/transactionSlice";
import type { Expense } from "../types";


export function ExpensesScreen({ navigation }: any) {
  const { formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const { expenses } = useAppSelector(selectActiveTransactions);
  const loading = false;
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      setUser(await getStoredUser());
      setSheetId(await getActiveSheetId());
    };
    void bootstrap();
  }, []);

  const loadExpenses = useCallback(async (isRefresh = false) => {
     // Rely on background sync from Dashboard or global store, skip duplicate loading logic here when possible to prevent redundant flashes
     if (isRefresh) {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500); // Dummy refresh for feedback
     }
  }, []);

  const handleDelete = async (expenseId: string) => {
    Alert.alert("Delete", "Cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          dispatch(deleteTransaction({ id: expenseId, type: 'expense' }));
          
          if (user?.token) {
            try {
              await apiFetch<{ message: string }>(`/expenses/${expenseId}`, {
                method: "DELETE",
                token: user.token,
                sheetId: sheetId || undefined,
              });
            } catch (e: unknown) {
              // Fail silently since it's offline-first
            }
          }
        },
      },
    ]);
  };

  const total = useMemo(() => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>All Expenses</Text>
        <Text style={styles.subtitle}>Total: {formatAmount(total)} · {expenses.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /><Text style={styles.centerText}>Loading…</Text></View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={expenses}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadExpenses(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>Tap “Add” to create your first expense.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const catMeta = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[CATEGORIES.length - 1];
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("ExpenseForm", { mode: "edit", expenseId: item._id })}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: catMeta.color + "18" }]}>
                    <Text style={styles.iconText}>{catMeta.icon}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.category === "other" && item.name ? item.name : catMeta.label}
                      {item.recurring ? "  🔄" : ""}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.name} · {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {item.familyMemberName ? ` · ${item.familyMemberName}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => navigation.navigate("ExpenseForm", { mode: "edit", expenseId: item._id })}>
                    <Text style={styles.smallButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallButton, styles.deleteButton]} onPress={() => void handleDelete(item._id)}>
                    <Text style={[styles.smallButtonText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 13, fontWeight: "800", color: "#4b5563", marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  centerText: { color: "#6b7280", fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  empty: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", backgroundColor: "#ffffff" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  emptyText: { fontSize: 13, fontWeight: "700", color: "#6b7280", marginTop: 4 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", backgroundColor: "#ffffff", padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  iconText: { fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  cardMeta: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginTop: 4 },
  amount: { fontSize: 15, fontWeight: "900", color: "#b91c1c" },
  cardActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  smallButton: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "rgba(124,106,255,0.1)", borderWidth: 1, borderColor: "rgba(124,106,255,0.2)" },
  smallButtonText: { fontSize: 12, fontWeight: "800", color: "#6655ee" },
  deleteButton: { backgroundColor: "rgba(220,38,38,0.1)", borderColor: "rgba(220,38,38,0.2)" },
  deleteText: { color: "#b91c1c" },
});
