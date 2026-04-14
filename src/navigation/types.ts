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
  BudgetForm: undefined;
  IncomeForm: { mode: "add" } | { mode: "edit"; incomeId: string };
};

export type DrawerParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Income: undefined;
  Budgets: undefined;
  Members: undefined;
  Settings: undefined;
};

