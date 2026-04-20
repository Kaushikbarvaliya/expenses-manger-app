import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import theme from "../theme/theme";
import { SegmentedControl } from "./SegmentedControl";

const { width } = Dimensions.get("window");

interface AppDatePickerProps {
  label?: string;
  value: string | Date | null;
  onChange: (isoString: string) => void;
  onDismiss?: () => void;
  placeholder?: string;
  minDate?: Date;
  mode?: "date" | "month" | "year";
  allowModeSwitch?: boolean;
  /** Optional external validation error message */
  error?: string;
  /** If true, open the picker modal immediately on mount */
  autoOpen?: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/** Format a Date as DD MMM YYYY, e.g. "18 Apr 2026" */
const formatToDDMMMYYYY = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export function AppDatePicker({
  label,
  value,
  onChange,
  onDismiss,
  placeholder = "Select Date",
  minDate,
  mode: initialMode = "date",
  allowModeSwitch = true,
  error,
  autoOpen = false,
}: AppDatePickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentMode, setCurrentMode] = useState<"date" | "month" | "year">(initialMode);

  const closeModal = () => { setShowModal(false); onDismiss?.(); };

  // Auto-open on mount if requested
  useEffect(() => {
    if (autoOpen) setShowModal(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert value to Date object for internal use
  const dateValue = value ? new Date(value) : new Date();
  const [tempDate, setTempDate] = useState(new Date(dateValue));

  // Sync tempDate when value changes externally or modal opens
  useEffect(() => {
    if (showModal) {
      setTempDate(value ? new Date(value) : new Date());
      setCurrentMode(initialMode);
    }
  }, [showModal, value, initialMode]);

  const formatDateLabel = () => {
    if (!value) return placeholder;
    const d = new Date(value);
    if (initialMode === "year") return d.getFullYear().toString();
    if (initialMode === "month") {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    // date mode: always DD MMM YYYY
    return formatToDDMMMYYYY(d);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (Platform.OS === "android") {
        onChange(selectedDate.toISOString());
        closeModal();
      } else {
        setTempDate(selectedDate);
      }
    } else if (Platform.OS === "android") {
      closeModal();
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(monthIndex);
    onChange(newDate.toISOString());
    closeModal();
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(year);
    if (initialMode === "year") {
      onChange(newDate.toISOString());
      closeModal();
    } else {
      setTempDate(newDate);
      setCurrentMode("month");
    }
  };

  const changeYear = (delta: number) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(newDate.getFullYear() + delta);
    setTempDate(newDate);
  };

  const confirmIOSSelection = () => {
    onChange(tempDate.toISOString());
    closeModal();
  };

  const renderMonthGrid = () => (
    <View style={styles.gridContainer}>
      <View style={styles.gridHeader}>
        <TouchableOpacity onPress={() => changeYear(-1)} style={styles.arrowBtn}>
          <ChevronLeft size={20} color={theme.COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.yearTitle}>{tempDate.getFullYear()}</Text>
        <TouchableOpacity onPress={() => changeYear(1)} style={styles.arrowBtn}>
          <ChevronRight size={20} color={theme.COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {MONTHS.map((month, index) => {
          const isSelected = dateValue.getMonth() === index && dateValue.getFullYear() === tempDate.getFullYear();
          return (
            <TouchableOpacity
              key={month}
              style={[styles.gridItem, isSelected && styles.gridItemActive]}
              onPress={() => handleMonthSelect(index)}
            >
              <Text style={[styles.gridItemText, isSelected && styles.gridItemTextActive]}>
                {month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderYearGrid = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 16 }, (_, i) => currentYear - 10 + i);
    return (
      <View style={styles.gridContainer}>
        <View style={styles.grid}>
          {years.map((year) => {
            const isSelected = dateValue.getFullYear() === year;
            return (
              <TouchableOpacity
                key={year}
                style={[styles.gridItem, { width: "23%" }, isSelected && styles.gridItemActive]}
                onPress={() => handleYearSelect(year)}
              >
                <Text style={[styles.gridItemText, isSelected && styles.gridItemTextActive]}>
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.inputBox,
          !value && styles.placeholderBox,
          !!error && styles.inputBoxError,
        ]}
        onPress={() => setShowModal(true)}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {formatDateLabel()}
        </Text>
        <Calendar size={20} color={error ? theme.COLORS.error : theme.COLORS.text3} strokeWidth={2} />
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={closeModal}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color={theme.COLORS.text} />
              </TouchableOpacity>
            </View>

            {allowModeSwitch && (
              <View style={styles.tabsContainer}>
                <SegmentedControl
                  options={["Date", "Month", "Year"]}
                  selectedIndex={currentMode === "date" ? 0 : currentMode === "month" ? 1 : 2}
                  onSelect={(index) => setCurrentMode(index === 0 ? "date" : index === 1 ? "month" : "year")}
                  backgroundColor={theme.COLORS.surface2}
                  activeColor={theme.COLORS.primary}
                  activeTextColor="#fff"
                  textColor={theme.COLORS.text3}
                />
              </View>
            )}

            <View style={styles.pickerContent}>
              {currentMode === "date" ? (
                <View style={styles.datePickerWrapper}>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={handleDateChange}
                    minimumDate={minDate}
                    accentColor={theme.COLORS.primary}
                    themeVariant="light"
                  />
                  {Platform.OS === "ios" && (
                    <TouchableOpacity style={styles.doneButton} onPress={confirmIOSSelection}>
                      <Text style={styles.doneButtonText}>Confirm Selection</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : currentMode === "month" ? (
                renderMonthGrid()
              ) : (
                renderYearGrid()
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.SPACING.lg,
  },
  label: {
    ...theme.TYPOGRAPHY.label,
    marginBottom: theme.SPACING.base,
    color: theme.COLORS.text2,
  },
  inputBox: {
    ...theme.COMPONENT_STYLES.input,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.COLORS.surface,
    borderColor: theme.COLORS.borderLight,
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  placeholderBox: {
    borderColor: theme.COLORS.borderLight,
  },
  inputBoxError: {
    borderColor: theme.COLORS.error,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: theme.COLORS.error,
    marginTop: 4,
    fontWeight: "500",
  },
  valueText: {
    ...theme.TYPOGRAPHY.bodyLarge,
    color: theme.COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  placeholderText: {
    ...theme.TYPOGRAPHY.bodyLarge,
    color: theme.COLORS.text4,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.borderLight,
  },
  modalTitle: {
    ...theme.TYPOGRAPHY.h5,
    color: theme.COLORS.text,
  },
  tabsContainer: {
    padding: 16,
  },
  pickerContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  datePickerWrapper: {
    alignItems: "center",
  },
  doneButton: {
    ...theme.COMPONENT_STYLES.button,
    width: "100%",
    marginTop: 20,
  },
  doneButtonText: {
    ...theme.TYPOGRAPHY.buttonText,
    fontWeight: "800",
  },
  gridContainer: {
    paddingTop: 10,
  },
  gridHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.COLORS.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  yearTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.COLORS.text,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "30%",
    aspectRatio: 1.5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: theme.COLORS.surface2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  gridItemActive: {
    backgroundColor: theme.COLORS.primary,
    borderColor: theme.COLORS.primary,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.COLORS.text2,
  },
  gridItemTextActive: {
    color: "#fff",
  },
});
