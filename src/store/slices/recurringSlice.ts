import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiFetch } from "../../api/client";
import { RecurringTransaction } from "../../types";
import { RootState } from "../index";
import { getActiveSheetId, getStoredUser } from "../../storage/auth";

interface RecurringState {
  items: RecurringTransaction[];
  loading: boolean;
  error: string | null;
}

const initialState: RecurringState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchRecurring = createAsyncThunk<
  RecurringTransaction[],
  void,
  { state: RootState }
>("recurring/fetchRecurring", async () => {
  // Use getStoredUser() from storage — state.transactions has no 'user' property
  const storedUser = await getStoredUser();
  const token = storedUser?.token;
  const sheetId = await getActiveSheetId();

  const result = await apiFetch<RecurringTransaction[]>("/recurring", {
    method: "GET",
    token,
    sheetId: sheetId || undefined,
  });

  // Guard: the API may return an error object instead of an array
  return Array.isArray(result) ? result : [];
});

export const addRecurring = createAsyncThunk<
  RecurringTransaction,
  Omit<RecurringTransaction, "_id" | "isActive" | "nextRunDate">,
  { state: RootState }
>("recurring/addRecurring", async (payload) => {
  const storedUser = await getStoredUser();
  const token = storedUser?.token;
  const sheetId = await getActiveSheetId();

  return apiFetch<RecurringTransaction>("/recurring", {
    method: "POST",
    token,
    sheetId: sheetId || undefined,
    body: JSON.stringify({
      title: payload.name, // The backend expects 'title', but the type has 'name'
      amount: payload.amount,
      type: payload.type,
      category: payload.category,
      frequency: payload.frequency,
      startDate: payload.startDate,
      endDate: payload.endDate,
    }),
  });
});

export const updateRecurring = createAsyncThunk<
  RecurringTransaction,
  { id: string; data: Partial<RecurringTransaction> },
  { state: RootState }
>("recurring/updateRecurring", async ({ id, data }) => {
  const storedUser = await getStoredUser();
  const token = storedUser?.token;
  const sheetId = await getActiveSheetId();

  // Maps name to title for backend expectations
  const payload = { ...data, title: data.name };
  return apiFetch<RecurringTransaction>(`/recurring/${id}`, {
    method: "PUT",
    token,
    sheetId: sheetId || undefined,
    body: JSON.stringify(payload),
  });
});

export const deleteRecurring = createAsyncThunk<
  string,
  string,
  { state: RootState }
>("recurring/deleteRecurring", async (id) => {
  const storedUser = await getStoredUser();
  const token = storedUser?.token;
  const sheetId = await getActiveSheetId();

  await apiFetch(`/recurring/${id}`, {
    method: "DELETE",
    token,
    sheetId: sheetId || undefined,
  });
  return id;
});

export const toggleRecurring = createAsyncThunk<
  RecurringTransaction,
  string,
  { state: RootState }
>("recurring/toggleRecurring", async (id) => {
  const storedUser = await getStoredUser();
  const token = storedUser?.token;
  const sheetId = await getActiveSheetId();

  return apiFetch<RecurringTransaction>(`/recurring/${id}/toggle`, {
    method: "PATCH",
    token,
    sheetId: sheetId || undefined,
  });
});

const recurringSlice = createSlice({
  name: "recurring",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchRecurring.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecurring.fulfilled, (state, action) => {
      state.loading = false;
      // Double-guard: thunk already returns [] on bad responses, but be safe
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(fetchRecurring.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "Failed to fetch recurring transactions";
    });

    // Add
    builder.addCase(addRecurring.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(addRecurring.fulfilled, (state, action) => {
      state.loading = false;
      if (!Array.isArray(state.items)) state.items = [];
      if (action.payload && action.payload._id) {
        state.items.unshift(action.payload);
      }
    });
    builder.addCase(addRecurring.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "Failed to add recurring transaction";
    });

    // Update
    builder.addCase(updateRecurring.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateRecurring.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.items.findIndex((item) => item._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    });
    builder.addCase(updateRecurring.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "Failed to update recurring transaction";
    });

    // Toggle
    builder.addCase(toggleRecurring.pending, (state) => {
      // Opt-out of full loading overlay for toggle to keep it snappy, but maybe add local loading state next time
    });
    builder.addCase(toggleRecurring.fulfilled, (state, action) => {
      const index = state.items.findIndex((item) => item._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    });

    // Delete
    builder.addCase(deleteRecurring.fulfilled, (state, action) => {
      if (!Array.isArray(state.items)) state.items = [];
      state.items = state.items.filter((item) => item._id !== action.payload);
    });
  },
});

export default recurringSlice.reducer;
