import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import transactionReducer from './slices/transactionSlice';
import settingsReducer from './slices/settingsSlice';

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
};

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['transactions', 'settings'],
  migrate: createMigrate(migrations, { debug: false }),
};

const rootReducer = combineReducers({
  transactions: transactionReducer,
  settings: settingsReducer,
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
