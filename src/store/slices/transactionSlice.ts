import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Expense, Income, Transaction } from '../../types';
import type { RootState } from '..';

export interface TransactionBucket {
  expenses: Expense[];
  incomes: Income[];
}

interface TransactionState {
  isLoggedIn: boolean;
  guestTransactions: TransactionBucket;
  userTransactions: TransactionBucket;
}

const initialState: TransactionState = {
  isLoggedIn: false,
  guestTransactions: {
    expenses: [],
    incomes: [],
  },
  userTransactions: {
    expenses: [],
    incomes: [],
  },
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setLoggedIn(state, action: PayloadAction<boolean>) {
      state.isLoggedIn = action.payload;
    },
    login(state) {
      state.isLoggedIn = true;
      // Merge guest data into user data
      state.userTransactions.expenses = [
        ...state.userTransactions.expenses,
        ...state.guestTransactions.expenses,
      ];
      state.userTransactions.incomes = [
        ...state.userTransactions.incomes,
        ...state.guestTransactions.incomes,
      ];
      // Clear guest transactions after merge
      state.guestTransactions = { expenses: [], incomes: [] };
    },
    logout(state) {
      state.isLoggedIn = false;
      // Clear only userTransactions
      state.userTransactions = { expenses: [], incomes: [] };
      // Keep guestTransactions unchanged
    },
    addTransaction(state, action: PayloadAction<Transaction>) {
      const bucket = state.isLoggedIn ? state.userTransactions : state.guestTransactions;
      if (action.payload.type === 'expense') {
        bucket.expenses.push(action.payload as Expense);
      } else {
        bucket.incomes.push(action.payload as Income);
      }
    },
    deleteTransaction(state, action: PayloadAction<{ id: string; type: 'expense' | 'income' }>) {
      const bucket = state.isLoggedIn ? state.userTransactions : state.guestTransactions;
      if (action.payload.type === 'expense') {
        bucket.expenses = bucket.expenses.filter((e) => e._id !== action.payload.id);
      } else {
        bucket.incomes = bucket.incomes.filter((i) => i._id !== action.payload.id);
      }
    },
    updateTransaction(state, action: PayloadAction<Transaction>) {
      const bucket = state.isLoggedIn ? state.userTransactions : state.guestTransactions;
      if (action.payload.type === 'expense') {
        const index = bucket.expenses.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) {
          bucket.expenses[index] = action.payload as Expense;
        }
      } else {
        const index = bucket.incomes.findIndex((i) => i._id === action.payload._id);
        if (index !== -1) {
          bucket.incomes[index] = action.payload as Income;
        }
      }
    },
    setTransactions(
      state,
      action: PayloadAction<{ expenses: Expense[]; incomes: Income[] }>
    ) {
      const bucket = state.isLoggedIn ? state.userTransactions : state.guestTransactions;
      bucket.expenses = action.payload.expenses;
      bucket.incomes = action.payload.incomes;
    },
    clearGuestTransactions(state) {
      state.guestTransactions = { expenses: [], incomes: [] };
    }
  },
});

const EMPTY_BUCKET: TransactionBucket = { expenses: [], incomes: [] };

export const selectActiveTransactions = (state: RootState): TransactionBucket => {
  const t = state.transactions;
  if (!t) return EMPTY_BUCKET;
  return t.isLoggedIn 
    ? (t.userTransactions || EMPTY_BUCKET)
    : (t.guestTransactions || EMPTY_BUCKET);
};

export const selectGuestTransactions = (state: RootState): TransactionBucket => {
  return state.transactions?.guestTransactions || EMPTY_BUCKET;
};

export const {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  setTransactions,
  setLoggedIn,
  login,
  logout,
  clearGuestTransactions,
} = transactionSlice.actions;

export default transactionSlice.reducer;
