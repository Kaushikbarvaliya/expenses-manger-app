import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import theme from "../theme/theme";

interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minDate?: Date;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select Date",
  minDate,
}: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Hide picker for Android. iOS handles it inline or in modal depending on config,
    // but generally we hide it after selection for standard simple inputs on Android.
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formattedDate = value
    ? value.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.inputBox, !value && styles.placeholderBox]}
        onPress={() => setShow(true)}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {formattedDate || placeholder}
        </Text>
        <Calendar size={20} color={theme.COLORS.text3} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onValueChange={handleDateChange}
          onDismiss={() => setShow(false)}
          minimumDate={minDate}
        />
      )}
      
      {Platform.OS === "ios" && show && (
         <TouchableOpacity 
           style={styles.doneButton} 
           onPress={() => setShow(false)}
         >
            <Text style={styles.doneText}>Done</Text>
         </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.SPACING.base,
  },
  label: {
    ...theme.TYPOGRAPHY.label,
    marginBottom: theme.SPACING.xs,
  },
  inputBox: {
    ...theme.COMPONENT_STYLES.input,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  placeholderBox: {
    borderColor: theme.COLORS.border,
  },
  valueText: {
    color: theme.COLORS.text,
    fontSize: 15,
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: 15,
  },
  doneButton: {
    alignSelf: "flex-end",
    padding: theme.SPACING.sm,
  },
  doneText: {
    color: theme.COLORS.primary,
    fontWeight: "bold",
  }
});
