import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Dimensions } from "react-native";
import { Edit2, Trash2, Calendar, Repeat, MoreVertical, Clock } from "lucide-react-native";
import { RecurringTransaction } from "../types";
import { CATEGORIES, INCOME_SOURCES, COLORS as DESIGN_COLORS } from "../constants/design";
import theme from "../theme/theme";
import { useCurrency } from "../context/CurrencyContext";

const { width } = Dimensions.get("window");

interface RecurringCardProps {
  item: RecurringTransaction;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

export function RecurringCard({ item, onEdit, onDelete, onToggle }: RecurringCardProps) {
  const { formatAmount } = useCurrency();
  const [showOptions, setShowOptions] = useState(false);
  const isExp = item.type === "expense";

  const meta = isExp
    ? CATEGORIES.find(c => c.id === item.category) || CATEGORIES[CATEGORIES.length - 1]
    : INCOME_SOURCES.find(s => s.id === item.category) || INCOME_SOURCES[INCOME_SOURCES.length - 1];

  const handleDelete = () => {
    Alert.alert(
      "Delete Recurring",
      `Are you sure you want to stop and delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  const nextDateFormatted = new Date(item.nextRunDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.mainContent}
          onPress={onEdit}
          activeOpacity={0.7}
        >
          {/* Icon Section */}
          <View style={[styles.iconContainer, { backgroundColor: meta.color + "15" }]}>
            <Text style={styles.emojiIcon}>{meta.icon}</Text>
          </View>

          {/* Details Section */}
          <View style={styles.details}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            <View style={styles.metaRow}>
              <View style={styles.badge}>
                <Repeat size={10} color={DESIGN_COLORS.text3} />
                <Text style={styles.badgeText}>{item.frequency}</Text>
              </View>
              <Text style={styles.dot}>·</Text>
              <View style={styles.badge}>
                <Clock size={10} color={DESIGN_COLORS.text3} />
                <Text style={styles.badgeText}>Next: {nextDateFormatted}</Text>
              </View>
            </View>
          </View>

          {/* Amount Section */}
          <View style={styles.amountContainer}>
            <Text style={[styles.amount, { color: isExp ? DESIGN_COLORS.red : DESIGN_COLORS.green }]}>
              {isExp ? "-" : "+"}{formatAmount(item.amount)}
            </Text>
            <View style={styles.toggleRow}>
              <Switch
                value={item.isActive}
                onValueChange={onToggle}
                trackColor={{ false: "#E2E8F0", true: DESIGN_COLORS.primary }}
                thumbColor="#fff"
                ios_backgroundColor="#E2E8F0"
                style={{ transform: [{ scaleX: 0.65 }, { scaleY: 0.65 }] }}
              />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => setShowOptions(!showOptions)}
        >
          <MoreVertical size={20} color={DESIGN_COLORS.text3} />
        </TouchableOpacity>

        {showOptions && (
          <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptions(null as any);
                onEdit();
              }}
            >
              <Edit2 size={16} color={DESIGN_COLORS.text} />
              <Text style={styles.optionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionItem, styles.deleteOption]}
              onPress={() => {
                setShowOptions(null as any);
                handleDelete();
              }}
            >
              <Trash2 size={16} color={DESIGN_COLORS.red} />
              <Text style={[styles.optionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 2,
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiIcon: {
    fontSize: 22,
  },
  details: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: DESIGN_COLORS.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    color: DESIGN_COLORS.text3,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  dot: {
    fontSize: 12,
    color: DESIGN_COLORS.text3,
    marginHorizontal: 6,
  },
  amountContainer: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  toggleRow: {
    marginTop: -4,
    marginRight: -8,
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
    top: 60,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
    minWidth: 120,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
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
  },
  deleteText: {
    color: DESIGN_COLORS.red,
  },
});
