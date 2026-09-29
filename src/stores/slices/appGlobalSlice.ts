import { createSlice } from "@reduxjs/toolkit";

/** App-wide state shared across features. Add fields as they are needed. */
type AppGlobalState = Record<string, never>;

const initialState: AppGlobalState = {};

const appGlobalSlice = createSlice({
  name: "app-global",
  initialState,
  reducers: {
    resetAppGlobal: () => initialState,
  },
});

export const { resetAppGlobal } = appGlobalSlice.actions;

export default appGlobalSlice;
