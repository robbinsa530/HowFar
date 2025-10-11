import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  editSelectingPoints: false,
  editRedrawingRoute: false,
  editGapClosed: false,
  editingMarkers: [], // Will contain the start marker for the edit at pos-0 (a duplicate of the marker in the markers array)
  editFinishMarker: null,
  editingGeojson: {
    'type': 'FeatureCollection',
    'features': []
  },
  undoActionListBackup: [],
  undoActionsAreBackedUp: false, // So we can tell if we actually have a backup to restore
  startEndMarkerIndices: {
    start: -1,
    end: -1
  }
};

const editRouteSlice = createSlice({
  name: 'editRoute',
  initialState,
  reducers: {
    setEditSelectingPoints: (state, action) => {
      state.editSelectingPoints = action.payload;
      if (action.payload) {
        state.editRedrawingRoute = false;
      }
    },
    setEditRedrawingRoute: (state, action) => {
      state.editRedrawingRoute = action.payload;
      if (action.payload) {
        state.editSelectingPoints = false;
      }
    },
    setEditGapClosed: (state, action) => {
      state.editGapClosed = action.payload;
    },
    setEditingMarkers: (state, action) => {
      state.editingMarkers = [ ...action.payload ];
    },
    setEditFinishMarker: (state, action) => {
      state.editFinishMarker = { ...action.payload };
    },
    setEditingGeojsonFeatures: (state, action) => {
      state.editingGeojson.features = [ ...action.payload ];
    },
    setUndoActionListBackup: (state, action) => {
      state.undoActionListBackup = [ ...action.payload ];
    },
    setUndoActionsAreBackedUp: (state, action) => {
      state.undoActionsAreBackedUp = action.payload;
    },
    setStartEndMarkerIndices: (state, action) => {
      state.startEndMarkerIndices = { ...action.payload };
    },
    resetEditRouteState: () => initialState
  }
});

export const {
  setEditSelectingPoints,
  setEditRedrawingRoute,
  setEditGapClosed,
  setEditingMarkers,
  setEditFinishMarker,
  setEditingGeojsonFeatures,
  setUndoActionListBackup,
  setUndoActionsAreBackedUp,
  setStartEndMarkerIndices,
  resetEditRouteState,
} = editRouteSlice.actions;

export default editRouteSlice.reducer;


