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
