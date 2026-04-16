import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  backgroundColor?: string;
  activeColor?: string;
  textColor?: string;
  activeTextColor?: string;
}

export function SegmentedControl({
  options,
  selectedIndex,
  onSelect,
  backgroundColor = "rgba(255,255,255,0.2)",
  activeColor = "#fff",
  textColor = "rgba(255,255,255,0.8)",
  activeTextColor = "#7C3AED"
}: SegmentedControlProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.segment,
            selectedIndex === index && {
              backgroundColor: activeColor,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }
          ]}
          onPress={() => onSelect(index)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color: selectedIndex === index ? activeTextColor : textColor
              }
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
