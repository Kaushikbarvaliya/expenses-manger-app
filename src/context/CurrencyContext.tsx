import React, { createContext, useContext } from "react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setCurrency as setReduxCurrency } from "../store/slices/settingsSlice";

type Currency = "INR" | "USD";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (newCurrency: Currency) => void;
  formatAmount: (value: number) => string;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const rawCurrency = useAppSelector((state) => state.settings.currency);
  const currency: Currency = rawCurrency === "USD" ? "USD" : "INR";

  const setCurrency = (newCurrency: Currency) => {
    dispatch(setReduxCurrency(newCurrency));
  };

  const currencySymbol = currency === "INR" ? "₹" : "$";

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
