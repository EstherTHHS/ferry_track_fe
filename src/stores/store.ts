import { combineSlices, configureStore } from "@reduxjs/toolkit";

import appGlobalSlice from "./slices/appGlobalSlice";

const rootReducer = combineSlices(appGlobalSlice);

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
