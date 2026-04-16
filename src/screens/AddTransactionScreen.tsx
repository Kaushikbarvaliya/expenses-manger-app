import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { X } from "lucide-react-native";
import { COLORS } from "../constants/design";
import { ExpenseFormContent } from "../components/ExpenseFormContent";
import { IncomeFormContent } from "../components/IncomeFormContent";

export function AddTransactionScreen({ navigation, route }: any) {
  const { mode, id, type } = route.params || { mode: "add", id: null, type: null };
  const isEdit = mode === "edit";
  const [activeTab, setActiveTab] = useState<"expense" | "income">(isEdit && type ? type : "expense");

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
          <X size={24} color={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? "Edit Transaction" : "Add Transaction"}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "expense" && styles.activeTab]}
          onPress={() => setActiveTab("expense")}
        >
          <Text style={[styles.tabText, activeTab === "expense" && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "income" && styles.activeTab]}
          onPress={() => setActiveTab("income")}
        >
          <Text style={[styles.tabText, activeTab === "income" && styles.activeTabText]}>
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "expense" ? (
          <ExpenseFormContent navigation={navigation} mode={mode} id={id} />
        ) : (
          <IncomeFormContent navigation={navigation} mode={mode} id={id} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface2,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text3,
  },
  activeTabText: {
    color: COLORS.text,
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
});
