import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  /** Display name from DB when viewing or editing a saved route */
  name: null,
  isPrivate: false,
  /** Route UUID when viewing (/route/:uuid) or editing (/editing/:uuid, then `/`) */
  shareUuid: null,
  /** True when viewer is logged in and is the route creator (from GET /api/routes/:uuid) */
  canEdit: false,
  /** True while editing an existing saved route (false on /route/:uuid view-only) */
  isEditing: false,
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
      state.isEditing = Boolean(action.payload.isEditing);
    },
    clearSavedRouteMeta: () => initialState,
  },
});

export const { setSavedRouteMeta, clearSavedRouteMeta } = savedRouteSlice.actions;
export default savedRouteSlice.reducer;
