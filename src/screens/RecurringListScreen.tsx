import React, { useEffect, useCallback, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  StatusBar,
  Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, ChevronRight, Repeat, Calendar, ShieldCheck, Sparkles } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/types";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchRecurring, deleteRecurring, toggleRecurring } from "../store/slices/recurringSlice";
import { RecurringCard } from "../components/RecurringCard";
import { COLORS as DESIGN_COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";
import theme from "../theme/theme";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "RecurringList">;

export function RecurringListScreen({ navigation }: Props) {
  const { formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.recurring);

  const loadData = useCallback(() => {
    dispatch(fetchRecurring());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (id: string) => {
    navigation.navigate("AddEditRecurring", { mode: "edit", id });
  };

  const handleDelete = (id: string) => {
    dispatch(deleteRecurring(id));
  };

  const handleToggle = (id: string) => {
    dispatch(toggleRecurring(id));
  };

  // Calculate Summary Stats
  const { activeCount, monthlyVolume } = useMemo(() => {
    const activeItems = items.filter(i => i.isActive);
    const volume = activeItems.reduce((sum, item) => {
      let monthlyAmt = item.amount;
      if (item.frequency === "weekly") monthlyAmt = item.amount * 4;
      if (item.frequency === "daily") monthlyAmt = item.amount * 30;
      if (item.frequency === "yearly") monthlyAmt = item.amount / 12;
      return sum + (item.type === "expense" ? -monthlyAmt : monthlyAmt);
    }, 0);

    return {
      activeCount: activeItems.length,
      monthlyVolume: volume
    };
  }, [items]);

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
          <Text style={styles.headerTitle}>Recurring Plans</Text>
          <TouchableOpacity 
            style={styles.plusButton} 
            onPress={() => navigation.navigate("AddEditRecurring", { mode: "add" })}
          >
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Est. Monthly Impact</Text>
          <Text style={styles.summaryAmount}>
            {monthlyVolume >= 0 ? "+" : ""}{formatAmount(monthlyVolume)}
          </Text>
          <View style={styles.countBadge}>
            <Repeat size={12} color="#fff" />
            <Text style={styles.countText}>{activeCount} Active Automations</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderSummaryCard = () => (
    <View style={styles.overlapGroup}>
      <View style={styles.summarySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Auto-Pay Overview</Text>
          <View style={styles.statusPill}>
            <ShieldCheck size={12} color={DESIGN_COLORS.green} />
            <Text style={styles.statusText}>Secure</Text>
          </View>
        </View>
        
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Upcoming Run</Text>
            <Text style={styles.cardValue}>
              {items.length > 0 ? "Next 7 Days" : "No active runs"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Accuracy</Text>
            <Text style={styles.cardValue}>100% Sync</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.proBanner}
        onPress={() => navigation.navigate("AddEditRecurring", { mode: "add" })}
      >
        <View style={styles.proLeft}>
          <View style={styles.sparkleBox}>
            <Sparkles size={16} color="#fff" />
          </View>
          <Text style={styles.proText}>Add a new recurring item</Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Repeat size={40} color={DESIGN_COLORS.text4} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>No recurring items yet</Text>
      <Text style={styles.emptySubtitle}>
        Automate your subscriptions and regular bills to never miss a payment.
      </Text>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate("AddEditRecurring", { mode: "add" })}
      >
        <Text style={styles.addBtnText}>Add First Item</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderSummaryCard()}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>All Items</Text>
            </View>
          </>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={loadData} 
            tintColor={DESIGN_COLORS.primary} 
          />
        }
        renderItem={({ item }) => (
          <RecurringCard
            item={item}
            onEdit={() => handleEdit(item._id)}
            onDelete={() => handleDelete(item._id)}
            onToggle={() => handleToggle(item._id)}
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
    marginBottom: 30,
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
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 10,
    gap: 6,
  },
  countText: {
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
    elevation: 5,
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
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_COLORS.green + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    color: DESIGN_COLORS.green,
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
  proBanner: {
    backgroundColor: "#111827",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginTop: 20,
  },
  proLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sparkleBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 6,
    borderRadius: 8,
  },
  proText: {
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
    fontSize: 18,
    fontWeight: "700",
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
  addBtn: {
    backgroundColor: DESIGN_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 15,
    shadowColor: DESIGN_COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
