import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { X, TrendingUp, Wallet, Calendar } from "lucide-react-native";
import { SegmentedControl } from "./SegmentedControl";
import { COLORS } from "../constants/design";

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  formatAmount: (amount: number) => string;
}

export function DatePickerModal({
  visible,
  onClose,
  selectedDate,
  onDateChange,
  totalIncome,
  totalExpense,
  balance,
  formatAmount
}: DatePickerModalProps) {
  const [dateViewMode, setDateViewMode] = React.useState<'month' | 'year'>('month');
  
  // Always show current date when modal opens
  const currentDate = React.useMemo(() => new Date(), []);
  
  const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearOptions = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());
  
  const currentOptions = dateViewMode === 'month' ? monthOptions : yearOptions;
  const currentSelectedIndex = dateViewMode === 'month' 
    ? currentDate.getMonth() 
    : yearOptions.indexOf(currentDate.getFullYear().toString());

  const handleDateSelect = (index: number) => {
    const newDate = new Date(selectedDate);
    if (dateViewMode === 'month') {
      newDate.setMonth(index);
    } else {
      newDate.setFullYear(parseInt(yearOptions[index]));
    }
    onDateChange(newDate);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Date</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Date Display */}
          <View style={styles.currentDateCard}>
            <View style={styles.dateHeader}>
              <Calendar size={20} color={COLORS.primary} />
              <Text style={styles.currentDateText}>
                {dateViewMode === 'month' 
                  ? currentDate.toLocaleDateString("en-US", { 
                      month: "long" 
                    })
                  : currentDate.getFullYear().toString()
                }
              </Text>
            </View>
          </View>

          {/* Date Selection Controls */}
          <View style={styles.selectionSection}>
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  dateViewMode === 'month' && styles.activeModeButton
                ]}
                onPress={() => setDateViewMode('month')}
              >
                <Text style={[
                  styles.modeButtonText,
                  dateViewMode === 'month' && styles.activeModeButtonText
                ]}>
                  Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  dateViewMode === 'year' && styles.activeModeButton
                ]}
                onPress={() => setDateViewMode('year')}
              >
                <Text style={[
                  styles.modeButtonText,
                  dateViewMode === 'year' && styles.activeModeButtonText
                ]}>
                  Year
                </Text>
              </TouchableOpacity>
            </View>

            <SegmentedControl
              options={currentOptions}
              selectedIndex={currentSelectedIndex}
              onSelect={handleDateSelect}
              backgroundColor="#F3F4F6"
              activeColor={COLORS.primary}
              textColor={COLORS.text3}
              activeTextColor="#fff"
            />
          </View>

          {/* Financial Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Financial Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIcon, { backgroundColor: "#DBEAFE" }]}>
                  <TrendingUp size={20} color={COLORS.blue} strokeWidth={2.5} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Income</Text>
                  <Text style={styles.summaryValue}>{formatAmount(totalIncome)}</Text>
                </View>
              </View>

              <View style={[styles.summaryItem, styles.borderTop]}>
                <View style={[styles.summaryIcon, { backgroundColor: "#Fee2E2" }]}>
                  <Wallet size={20} color={COLORS.red} strokeWidth={2.5} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Expenses</Text>
                  <Text style={styles.summaryValue}>{formatAmount(totalExpense)}</Text>
                </View>
              </View>

              <View style={[styles.summaryItem, styles.borderTop]}>
                <View style={[styles.summaryIcon, { backgroundColor: "#EDE9FE" }]}>
                  <TrendingUp size={20} color={COLORS.primary} strokeWidth={2.5} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Balance</Text>
                  <Text style={[
                    styles.summaryValue,
                    { color: balance >= 0 ? COLORS.green : COLORS.red }
                  ]}>
                    {balance >= 0 ? "+" : ""}{formatAmount(balance)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentDateCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  currentDateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  selectionSection: {
    marginTop: 24,
  },
  modeToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  activeModeButton: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeModeButtonText: {
    color: COLORS.primary,
  },
  summarySection: {
    marginTop: 32,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
});
