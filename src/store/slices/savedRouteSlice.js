import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  /** Display name from DB when viewing a shared route; null when not on /route/:uuid or cleared */
  name: null,
  isPrivate: false,
};

const savedRouteSlice = createSlice({
  name: 'savedRoute',
  initialState,
  reducers: {
    setSavedRouteMeta: (state, action) => {
      state.name = action.payload.name ?? null;
      state.isPrivate = Boolean(action.payload.isPrivate);
    },
    clearSavedRouteMeta: () => initialState,
  },
});

export const { setSavedRouteMeta, clearSavedRouteMeta } = savedRouteSlice.actions;
export default savedRouteSlice.reducer;
