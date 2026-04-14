import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StoredUser } from "../navigation/types";

const USER_KEY = "expense-tracker-user";
const ACTIVE_SHEET_ID_KEY = "expense-tracker-active-sheet-id";

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

