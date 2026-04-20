import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import transactionReducer from './slices/transactionSlice';
import settingsReducer from './slices/settingsSlice';
import recurringReducer from './slices/recurringSlice';

const migrations: any = {
  // Version 1: migrate from old guest/byUserId shape to guestTransactions/userTransactions
  1: (state: any) => {
    const oldTransactions = state?.transactions || {};
    return {
      ...state,
      transactions: {
        isLoggedIn: false,
        guestTransactions: {
          expenses: oldTransactions?.guest?.expenses || [],
          incomes: oldTransactions?.guest?.incomes || [],
        },
        userTransactions: {
          expenses: [],
          incomes: [],
        },
      },
    };
  },
  // Version 2: fix corrupted recurring.items — old code used state.transactions.user?.token
  // (which doesn't exist) so API calls were unauthenticated, returning {message: "..."} objects
  // instead of arrays. These got persisted. Always ensure items is a valid array.
  2: (state: any) => {
    const recurringItems = state?.recurring?.items;
    return {
      ...state,
      recurring: {
        ...(state?.recurring || {}),
        items: Array.isArray(recurringItems) ? recurringItems : [],
        loading: false,
        error: null,
      },
    };
  },
};

const persistConfig = {
  key: 'root',
  version: 2,
  storage: AsyncStorage,
  whitelist: ['transactions', 'settings', 'recurring'],
  migrate: createMigrate(migrations, { debug: false }),
};

const rootReducer = combineReducers({
  transactions: transactionReducer,
  settings: settingsReducer,
  recurring: recurringReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
