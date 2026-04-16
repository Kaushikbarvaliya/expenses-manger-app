export type StoredUser = {
  _id: string;
  name: string;
  email?: string;
  token: string;
};

export type SheetSummary = {
  sheetId: string;
  sheetName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  role: string;
  isOwner: boolean;
  isDefault?: boolean;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  Sheets: { accepted?: boolean; autoAccepted?: boolean } | undefined;
  App: undefined;
  ForgotPassword: undefined;
  ChangePassword: { step?: 1 | 2 } | undefined;
  ExpenseForm: { mode: "add" } | { mode: "edit"; expenseId: string };
  BudgetForm: { mode: "add" } | { mode: "edit"; budgetId: string };
  IncomeForm: { mode: "add" } | { mode: "edit"; incomeId: string };
  AddTransaction: { mode: "add" } | { mode: "edit"; id: string; type: "expense" | "income" };
};

export type TabParamList = {
  Home: undefined;
  Report: undefined;
  AddPlaceholder: undefined;
  Plan: undefined;
  Settings: undefined;
};


