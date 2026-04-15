import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  currency: string;
}

const initialState: SettingsState = {
  currency: '₹', // Default currency
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<string>) {
      state.currency = action.payload;
    },
  },
});

export const { setCurrency } = settingsSlice.actions;
export default settingsSlice.reducer;
