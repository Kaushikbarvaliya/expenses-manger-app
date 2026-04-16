import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { MoreVertical, Edit2, Trash2, TrendingUp, TrendingDown, Target } from "lucide-react-native";
import { CATEGORIES, COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";

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

interface BudgetCardProps {
  budget: Budget;
  expenses: Expense[];
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

export function BudgetCard({ budget, expenses, onEdit, onDelete }: BudgetCardProps) {
  const { formatAmount } = useCurrency();
  const [showOptions, setShowOptions] = useState(false);

  const periodLabel = budget.periodType === "yearly" ? `Year ${budget.year}` : `${MONTH_FULL[budget.month - 1]} ${budget.year}`;
  const periodIcon = budget.periodType === "yearly" ? "calendar" : "calendar";
  
  // Filter expenses for this budget period
  const scopedExp = expenses.filter((e) => {
    const d = new Date(e.date);
    if (isNaN(d.getTime())) return false;
    const expYear = d.getFullYear();
    const expMonth = d.getMonth() + 1;
    if (budget.periodType === "yearly") return expYear === budget.year;
    return expYear === budget.year && expMonth === budget.month;
  });
  
  const spent = scopedExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const total = Number(budget.totalBudget) || 0;
  const remaining = total - spent;
  const rawPct = total > 0 ? (spent / total) * 100 : 0;
  const pct = Math.min(100, Math.max(0, rawPct));
  const isOver = remaining < 0;
  
  let barColor = COLORS.green;
  if (pct >= 100) barColor = COLORS.red;
  else if (pct >= 80) barColor = COLORS.amber;

  const handleEdit = () => {
    setShowOptions(false);
    onEdit(budget);
  };

  const handleDelete = () => {
    setShowOptions(false);
    Alert.alert(
      "Delete Budget?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(budget._id),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.periodInfo}>
          <View style={styles.periodRow}>
            <Target size={16} color={COLORS.primary} />
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            <View style={[styles.periodBadge, { backgroundColor: budget.periodType === "yearly" ? COLORS.accent + "20" : COLORS.green + "20" }]}>
              <Text style={[styles.periodBadgeText, { color: budget.periodType === "yearly" ? COLORS.accent : COLORS.green }]}>
                {budget.periodType === "yearly" ? "Yearly" : "Monthly"}
              </Text>
            </View>
          </View>
          <Text style={styles.totalBudget}>Total Budget: {formatAmount(total)}</Text>
        </View>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => setShowOptions(!showOptions)}
          >
            <MoreVertical size={20} color={COLORS.text3} />
          </TouchableOpacity>
          
          {showOptions && (
            <View style={styles.optionsMenu}>
              <TouchableOpacity style={styles.optionItem} onPress={handleEdit}>
                <Edit2 size={16} color={COLORS.text} />
                <Text style={styles.optionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionItem, styles.deleteOption]} onPress={handleDelete}>
                <Trash2 size={16} color={COLORS.red} />
                <Text style={[styles.optionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.spentText}>{formatAmount(spent)} spent</Text>
          <Text style={[styles.remainingText, isOver && { color: COLORS.red }]}>
            {isOver ? `${formatAmount(Math.abs(remaining))} over` : `${formatAmount(remaining)} left`}
          </Text>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        
        <View style={styles.progressStats}>
          <View style={styles.statItem}>
            <TrendingUp size={14} color={COLORS.text3} />
            <Text style={styles.statText}>{pct.toFixed(1)}% used</Text>
          </View>
          <Text style={styles.progressPercentage}>{formatAmount(spent)} / {formatAmount(total)}</Text>
        </View>
      </View>

      {/* Category Breakdown */}
      {budget.categories && budget.categories.some(c => c.amount > 0) && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>Category Breakdown</Text>
          {budget.categories.filter(c => c.amount > 0).map((catBud) => {
            const catInfo = CATEGORIES.find(c => c.id === catBud.category) || CATEGORIES[CATEGORIES.length - 1];
            const catSpent = scopedExp.filter(e => e.category === catBud.category).reduce((s, e) => s + (Number(e.amount) || 0), 0);
            const catPct = Math.min(100, Math.max(0, (catSpent / catBud.amount) * 100));
            const catOver = catSpent > catBud.amount;

            return (
              <View key={catBud.category} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryIcon}>{catInfo.icon}</Text>
                  <Text style={styles.categoryLabel}>{catInfo.label}</Text>
                </View>
                <View style={styles.categoryAmount}>
                  <Text style={[styles.categorySpent, catOver && { color: COLORS.red }]}>
                    {formatAmount(catSpent)} / {formatAmount(catBud.amount)}
                  </Text>
                  <View style={styles.categoryProgress}>
                    <View style={[styles.categoryProgressFill, { width: `${catPct}%`, backgroundColor: catOver ? COLORS.red : COLORS.accent }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  periodInfo: {
    flex: 1,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  periodLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  periodBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  totalBudget: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text3,
  },
  optionsContainer: {
    position: "relative",
  },
  optionsButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsMenu: {
    position: "absolute",
    right: 0,
    top: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.red + "10",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  deleteText: {
    color: COLORS.red,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  spentText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  remainingText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text3,
  },
  progressBar: {
    height: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text3,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text3,
  },
  categorySection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  categoryAmount: {
    gap: 6,
  },
  categorySpent: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text3,
    textAlign: "right",
  },
  categoryProgress: {
    height: 6,
    backgroundColor: COLORS.surface2,
    borderRadius: 3,
    overflow: "hidden",
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
