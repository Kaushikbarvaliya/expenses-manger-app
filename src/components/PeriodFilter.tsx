import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppDatePicker } from "./AppDatePicker";

export type FilterType = 'day' | 'month' | 'year';

interface PeriodFilterProps {
  type: FilterType;
  onTypeChange: (type: FilterType) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function PeriodFilter({ type, onTypeChange, selectedDate, onDateChange }: PeriodFilterProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format label shown in the filter bar
  const filterLabel = useMemo(() => {
    if (type === 'day') {
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const mmm = selectedDate.toLocaleDateString('en-US', { month: 'short' });
      const yyyy = selectedDate.getFullYear();
      return `${dd} ${mmm} ${yyyy}`;
    }
    if (type === 'month') {
      return selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return String(selectedDate.getFullYear());
  }, [type, selectedDate]);

  const handleTypePress = (newType: FilterType) => {
    onTypeChange(newType);
    setShowDatePicker(true);
  };

  const handleDatePickerChange = (iso: string) => {
    onDateChange(new Date(iso));
    setShowDatePicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Day / Month / Year toggle */}
      <View style={styles.filterBar}>
        {(['day', 'month', 'year'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterTab, type === t && styles.filterTabActive]}
            onPress={() => handleTypePress(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, type === t && styles.filterTabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected value display */}
      <TouchableOpacity 
        style={styles.selectedValueBtn} 
        onPress={() => setShowDatePicker(true)} 
        activeOpacity={0.8}
      >
        <Text style={styles.selectedValueText}>{filterLabel}</Text>
        <Text style={styles.selectedValueCaret}>▾</Text>
      </TouchableOpacity>

      {/* AppDatePicker hidden trigger */}
      {showDatePicker && (
        <View style={{ height: 0, overflow: 'hidden' }}>
          <AppDatePicker
            key={`${type}-${showDatePicker}`}
            value={selectedDate.toISOString()}
            onChange={handleDatePickerChange}
            onDismiss={() => setShowDatePicker(false)}
            mode={type === 'day' ? 'date' : type === 'month' ? 'month' : 'year'}
            allowModeSwitch={false}
            autoOpen
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  filterBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  filterTabTextActive: {
    color: "#7C3AED",
  },
  selectedValueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
  },
  selectedValueText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  selectedValueCaret: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
});
