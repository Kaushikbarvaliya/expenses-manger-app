export type Expense = {
  _id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  method?: string;
  familyMemberName?: string;
  recurring?: boolean;
  type: "expense";
};

export type Income = {
  _id: string;
  name: string;
  source: string;
  amount: number;
  date: string;
  method?: string;
  familyMemberName?: string;
  type: "income";
};

export type Transaction = Expense | Income;

export type RecurringTransaction = {
  _id: string;
  type: "income" | "expense";
  name: string;
  category: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  isActive: boolean;
  method?: string;
  familyMemberName?: string;
};
