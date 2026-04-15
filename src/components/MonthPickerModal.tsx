import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { COLORS } from "../constants/design";

const { width } = Dimensions.get("window");

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface MonthPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export function MonthPickerModal({ 
  visible, 
  onClose, 
  selectedDate, 
  onSelect 
}: MonthPickerModalProps) {
  const [tempDate, setTempDate] = useState(new Date(selectedDate));

  const changeYear = (delta: number) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(newDate.getFullYear() + delta);
    setTempDate(newDate);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(monthIndex);
    onSelect(newDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearArrow}>
              <ChevronLeft size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.yearText}>{tempDate.getFullYear()}</Text>
            <TouchableOpacity onPress={() => changeYear(1)} style={styles.yearArrow}>
              <ChevronRight size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {MONTHS.map((month, index) => {
              const isSelected = selectedDate.getMonth() === index && selectedDate.getFullYear() === tempDate.getFullYear();
              return (
                <TouchableOpacity 
                  key={month} 
                  style={[styles.monthItem, isSelected && styles.monthItemActive]}
                  onPress={() => handleSelectMonth(index)}
                >
                  <Text style={[styles.monthItemText, isSelected && styles.monthItemTextActive]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    width: width * 0.85,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  yearArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  yearText: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  monthItem: {
    width: "30%",
    aspectRatio: 1.5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  monthItemActive: {
    backgroundColor: COLORS.primary,
  },
  monthItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text2,
  },
  monthItemTextActive: {
    color: "#fff",
  },
});
