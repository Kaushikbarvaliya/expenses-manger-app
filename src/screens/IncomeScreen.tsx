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
import { INCOME_SOURCES, DESIGN_COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { deleteTransaction, selectActiveTransactions } from "../store/slices/transactionSlice";
import type { Income } from "../types";


export function IncomeScreen({ navigation }: any) {
  const { formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const { incomes } = useAppSelector(selectActiveTransactions);
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

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 500); // Dummy refresh for feedback
    }
  }, []);

  const total = useMemo(() => incomes.reduce((sum, x) => sum + (Number(x.amount) || 0), 0), [incomes]);

  const deleteIncome = async (id: string) => {
    Alert.alert("Delete income?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          dispatch(deleteTransaction({ id, type: 'income' }));

          if (user?.token) {
            try {
              await apiFetch<{ message: string }>(`/incomes/${id}`, { method: "DELETE", token: user.token, sheetId: sheetId || undefined });
            } catch (e: unknown) {
              // Silently fail if offline
            }
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Income</Text>
        <Text style={styles.subtitle}>Total: {formatAmount(total)} · {incomes.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={incomes}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No income yet</Text>
              <Text style={styles.emptyText}>Tap the Add button below to track income.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const srcMeta = INCOME_SOURCES.find((s) => s.id === item.source) || INCOME_SOURCES[INCOME_SOURCES.length - 1];
            return (
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("IncomeForm", { mode: "edit", incomeId: item._id })}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: srcMeta.color + "18" }]}>
                    <Text style={styles.iconText}>{srcMeta.icon}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.source === "other" && item.name ? item.name : srcMeta.label}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.name} · {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {item.familyMemberName ? ` · ${item.familyMemberName}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => navigation.navigate("IncomeForm", { mode: "edit", incomeId: item._id })}>
                    <Text style={styles.smallButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallButton, styles.deleteButton]} onPress={() => void deleteIncome(item._id)}>
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
  safe: { flex: 1, backgroundColor: DESIGN_COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 13, fontWeight: "800", color: "#4b5563", marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  centerText: { color: "#6b7280", fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  empty: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#ffffff", gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  emptyText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#ffffff", padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  iconText: { fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  cardMeta: { fontSize: 12, fontWeight: "700", color: "#6b7280", marginTop: 4 },
  amount: { fontSize: 14, fontWeight: "900", color: DESIGN_COLORS.green },
  cardActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  smallButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(124,106,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,106,255,0.22)",
  },
  smallButtonText: { fontSize: 12, fontWeight: "900", color: "#6655ee" },
  deleteButton: { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.18)" },
  deleteText: { color: "#b91c1c" },
});
