import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { MoreVertical, Edit2, Trash2, TrendingUp, Target, ChevronDown, ChevronUp } from "lucide-react-native";
import { CATEGORIES, COLORS as DESIGN_COLORS } from "../constants/design";
import { useCurrency } from "../context/CurrencyContext";

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
  const [expanded, setExpanded] = useState(false);

  const periodLabel = budget.periodType === "yearly" ? `${budget.year}` : `${MONTH_FULL[budget.month - 1]} ${budget.year}`;
  
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
  
  let barColor = DESIGN_COLORS.green;
  if (pct >= 100) barColor = DESIGN_COLORS.red;
  else if (pct >= 80) barColor = DESIGN_COLORS.amber;

  const handleEdit = () => {
    setShowOptions(false);
    onEdit(budget);
  };

  const handleDelete = () => {
    setShowOptions(false);
    onDelete(budget._id);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.periodRow}>
          <View style={[styles.iconBg, { backgroundColor: DESIGN_COLORS.primary + "15" }]}>
            <Target size={20} color={DESIGN_COLORS.primary} strokeWidth={2.5} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: budget.periodType === "yearly" ? "#EDE9FE" : "#DCFCE7" }]}>
                <Text style={[styles.badgeText, { color: budget.periodType === "yearly" ? DESIGN_COLORS.primary : DESIGN_COLORS.green }]}>
                  {budget.periodType === "yearly" ? "Yearly Goal" : "Monthly Target"}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => setShowOptions(!showOptions)}
          >
            <MoreVertical size={20} color={DESIGN_COLORS.text3} />
          </TouchableOpacity>
          
          {showOptions && (
            <View style={styles.optionsMenu}>
              <TouchableOpacity style={styles.optionItem} onPress={handleEdit}>
                <Edit2 size={16} color={DESIGN_COLORS.text} />
                <Text style={styles.optionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionItem, styles.deleteOption]} onPress={handleDelete}>
                <Trash2 size={16} color={DESIGN_COLORS.red} />
                <Text style={[styles.optionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressContainer}>
        <View style={styles.amountSummary}>
          <View>
            <Text style={styles.spentLabel}>{isOver ? "Overspent" : "Total Spent"}</Text>
            <Text style={[styles.spentAmount, isOver && { color: DESIGN_COLORS.red }]}>{formatAmount(spent)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.totalLabel}>Goal: {formatAmount(total)}</Text>
            <Text style={[styles.remainingLabel, isOver && { color: DESIGN_COLORS.red }]}>
              {isOver ? `${formatAmount(Math.abs(remaining))} over` : `${formatAmount(remaining)} left`}
            </Text>
          </View>
        </View>

        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
          </View>
          {pct > 0 && (
            <View style={[styles.pctIndicator, { left: `${Math.min(92, pct)}%` }]}>
              <Text style={styles.pctText}>{pct.toFixed(0)}%</Text>
            </View>
          )}
        </View>

        <View style={styles.statRow}>
          <View style={styles.statChip}>
            <TrendingUp size={12} color={DESIGN_COLORS.text2} />
            <Text style={styles.statChipText}>{isOver ? "Limit Exceeded" : "On Track"}</Text>
          </View>
        </View>
      </View>

      {/* Category Breakdown Toggle */}
      {budget.categories && budget.categories.some(c => c.amount > 0) && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity 
            style={styles.expandButton} 
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandText}>Category Breakdown</Text>
            {expanded ? <ChevronUp size={18} color={DESIGN_COLORS.text3} /> : <ChevronDown size={18} color={DESIGN_COLORS.text3} />}
          </TouchableOpacity>

          {expanded && (
            <View style={styles.categoryList}>
              {budget.categories.filter(c => c.amount > 0).map((catBud) => {
                const catInfo = CATEGORIES.find(c => c.id === catBud.category) || CATEGORIES[CATEGORIES.length - 1];
                const catSpent = scopedExp.filter(e => e.category === catBud.category).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                const catPct = Math.min(100, Math.max(0, (catSpent / catBud.amount) * 100));
                const catOver = catSpent > catBud.amount;

                return (
                  <View key={catBud.category} style={styles.categoryItem}>
                    <View style={styles.catHeader}>
                      <View style={styles.catLabelRow}>
                        <Text style={styles.catIcon}>{catInfo.icon}</Text>
                        <Text style={styles.catLabel}>{catInfo.label}</Text>
                      </View>
                      <Text style={[styles.catAmtText, catOver && { color: DESIGN_COLORS.red }]}>
                        {formatAmount(catSpent)} <Text style={{ color: DESIGN_COLORS.text3, fontWeight: "500" }}>/ {formatAmount(catBud.amount)}</Text>
                      </Text>
                    </View>
                    <View style={styles.catProgressContainer}>
                      <View style={styles.catProgressBar}>
                        <View style={[styles.catProgressFill, { width: `${catPct}%`, backgroundColor: catOver ? DESIGN_COLORS.red : DESIGN_COLORS.primaryLight }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerInfo: {
    justifyContent: "center",
  },
  periodLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: "row",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  optionsContainer: {
    position: "relative",
  },
  optionsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DESIGN_COLORS.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsMenu: {
    position: "absolute",
    right: 0,
    top: 48,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
    minWidth: 140,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_COLORS.text,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: DESIGN_COLORS.border,
    marginTop: 4,
    paddingTop: 10,
  },
  deleteText: {
    color: DESIGN_COLORS.red,
  },
  progressContainer: {
    marginBottom: 4,
  },
  amountSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  spentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_COLORS.text3,
    marginBottom: 2,
  },
  spentAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: DESIGN_COLORS.text,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_COLORS.text3,
    textAlign: "right",
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN_COLORS.green,
    textAlign: "right",
    marginTop: 2,
  },
  progressBarWrapper: {
    height: 24,
    justifyContent: "center",
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  pctIndicator: {
    position: "absolute",
    top: -2,
    backgroundColor: "#111827",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pctText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_COLORS.text2,
  },
  divider: {
    height: 1,
    backgroundColor: DESIGN_COLORS.border,
    marginVertical: 16,
  },
  expandButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 4,
  },
  expandText: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  categoryList: {
    marginTop: 16,
    gap: 16,
  },
  categoryItem: {
    gap: 8,
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catIcon: {
    fontSize: 18,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_COLORS.text,
  },
  catAmtText: {
    fontSize: 13,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  catProgressContainer: {
    height: 6,
  },
  catProgressBar: {
    height: 6,
    backgroundColor: DESIGN_COLORS.surface2,
    borderRadius: 3,
    overflow: "hidden",
  },
  catProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
