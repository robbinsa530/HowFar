import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  /** Display name from DB when viewing a shared route; null when not on /route/:uuid or cleared */
  name: null,
  isPrivate: false,
  /** Current route UUID when viewing /route/:uuid */
  shareUuid: null,
  /** True when viewer is logged in and is the route creator (from GET /api/routes/:uuid) */
  canEdit: false,
  /** Non-null when user chose "Edit route" and is editing an existing saved route on `/` */
  editingRouteUuid: null,
};

const savedRouteSlice = createSlice({
  name: 'savedRoute',
  initialState,
  reducers: {
    setSavedRouteMeta: (state, action) => {
      state.name = action.payload.name ?? null;
      state.isPrivate = Boolean(action.payload.isPrivate);
      state.shareUuid = action.payload.shareUuid ?? null;
      state.canEdit = Boolean(action.payload.canEdit);
    },
    setEditingSavedRoute: (state, action) => {
      state.editingRouteUuid = action.payload?.editingRouteUuid ?? null;
      if (typeof action.payload?.name === 'string') {
        state.name = action.payload.name;
      }
      if (typeof action.payload?.isPrivate !== 'undefined') {
        state.isPrivate = Boolean(action.payload.isPrivate);
      }
      state.canEdit = true;
    },
    clearEditingSavedRoute: (state) => {
      state.editingRouteUuid = null;
    },
    clearSavedRouteMeta: () => initialState,
  },
});

export const {
  setSavedRouteMeta,
  setEditingSavedRoute,
  clearEditingSavedRoute,
  clearSavedRouteMeta,
} = savedRouteSlice.actions;
export default savedRouteSlice.reducer;
