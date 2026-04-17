import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StoredUser } from "../navigation/types";

const USER_KEY = "expense-tracker-user";
const ACTIVE_SHEET_ID_KEY = "expense-tracker-active-sheet-id";
const CURRENCY_KEY = "expense-tracker-currency";
const GUEST_ID_KEY = "expense-tracker-guest-id";

import { generateUUID } from "../utils/uuid";

export async function getGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  
  const newGuestId = generateUUID();
  await AsyncStorage.setItem(GUEST_ID_KEY, newGuestId);
  return newGuestId;
}

export async function getStoredUser(): Promise<StoredUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: StoredUser): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearStoredUser(): Promise<void> {
  await AsyncStorage.multiRemove([USER_KEY, "expense-tracker-active-sheet-owner"]);
}

export async function setActiveSheetId(sheetId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SHEET_ID_KEY, String(sheetId));
}

export async function getActiveSheetId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_SHEET_ID_KEY);
}

export async function getStoredCurrency(): Promise<string> {
  const val = await AsyncStorage.getItem(CURRENCY_KEY);
  return val || "INR";
}

export async function setStoredCurrency(currency: string): Promise<void> {
  await AsyncStorage.setItem(CURRENCY_KEY, currency);
}

