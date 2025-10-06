import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  directionsMode: 'walking', // 'walking' or 'cycling'
  autoFollowRoadsEnabled: true,
  rightClickEnabled: true,
  addMarkerInLineEnabled: false,
  addToStartOrEnd: 'end', // 'start' or 'end'
  walkwayBias: 0, // -1 to 1, favor roads vs walkways
  imperialOrMetric: 'imperial', // 'imperial' or 'metric'
  displayDistancePopupEnabled: true,
  displayChevronsEnabled: true
};

const settingsSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setDirectionsMode: (state, action) => {
      state.directionsMode = action.payload;
    },
    setAddToStartOrEnd: (state, action) => {
      state.addToStartOrEnd = action.payload;
    },
    setWalkwayBias: (state, action) => {
      state.walkwayBias = action.payload;
    },
    setImperialOrMetric: (state, action) => {
      state.imperialOrMetric = action.payload;
    },
    setAutoFollowRoadsEnabled: (state, action) => {
      state.autoFollowRoadsEnabled = action.payload;
    },
    setRightClickEnabled: (state, action) => {
      state.rightClickEnabled = action.payload;
    },
    setAddMarkerInLineEnabled: (state, action) => {
      state.addMarkerInLineEnabled = action.payload;
    },
    setDisplayDistancePopupEnabled: (state, action) => {
      state.displayDistancePopupEnabled = action.payload;
    },
    setDisplayChevronsEnabled: (state, action) => {
      state.displayChevronsEnabled = action.payload;
    }
  }
});

export const {
  setDirectionsMode,
  setAddToStartOrEnd,
  setWalkwayBias,
  setImperialOrMetric,
  setAutoFollowRoadsEnabled,
  setRightClickEnabled,
  setAddMarkerInLineEnabled,
  setDisplayDistancePopupEnabled,
  setDisplayChevronsEnabled
} = settingsSlice.actions;
export default settingsSlice.reducer;
