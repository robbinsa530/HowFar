import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  markers: [],
  geojson: {
    'type': 'FeatureCollection',
    'features': []
  },
  undoActionList: []
};

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    setMarkers: (state, action) => {
      state.markers = [ ...action.payload ];
    },
    setGeojsonFeatures: (state, action) => {
      state.geojson.features = [ ...action.payload ];
    },
    setUndoActionList: (state, action) => {
      state.undoActionList = [ ...action.payload ];
    },
    addUndoActionToList: (state, action) => { // We never really edit things in this list, just add. So this is helpful
      state.undoActionList = [ ...state.undoActionList, action.payload ];
    },
    popFromUndoActionList: (state) => {
      state.undoActionList = [ ...state.undoActionList.slice(0, -1) ];
    }
  }
});

export const {
  setMarkers,
  setGeojsonFeatures,
  setUndoActionList,
  addUndoActionToList,
  popFromUndoActionList
} = routeSlice.actions;
export default routeSlice.reducer;
