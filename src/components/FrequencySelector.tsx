import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import theme from "../theme/theme";

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

interface FrequencySelectorProps {
  value: Frequency;
  onChange: (freq: Frequency) => void;
}

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export function FrequencySelector({ value, onChange }: FrequencySelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Frequency</Text>
      <View style={styles.buttonContainer}>
        {FREQUENCIES.map((freq) => {
          const isSelected = value === freq.id;
          return (
            <TouchableOpacity
              key={freq.id}
              activeOpacity={0.7}
              onPress={() => onChange(freq.id)}
              style={[
                styles.button,
                isSelected && styles.buttonSelected,
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  isSelected && styles.buttonTextSelected,
                ]}
              >
                {freq.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.SPACING.sm,
  },
  button: {
    paddingVertical: theme.SPACING.sm,
    paddingHorizontal: theme.SPACING.base,
    borderRadius: theme.BORDER_RADIUS.pill,
    backgroundColor: theme.COLORS.surface2,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  buttonSelected: {
    backgroundColor: theme.COLORS.primary,
    borderColor: theme.COLORS.primary,
  },
  buttonText: {
    ...theme.TYPOGRAPHY.body,
    fontSize: 14,
    color: theme.COLORS.text2,
  },
  buttonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});
