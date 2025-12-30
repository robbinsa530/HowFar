import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  elevationProfile: [], // Will contain a single profile for the route
  elevationChange: {
    eleUp: 0.0,
    eleDown: 0.0
  },
  newElevationProfile: [], // Profile in the same format as elevationProfile above
  newElevationProfileExtraData: {
    splitIndexStart: -1, // Closest index (after real breakpoint) in the elevationProfile where the edit section starts
    splitIndexEnd: -1, // Closest index (after real breakpoint) in the elevationProfile where the edit section ends
    interpolatedPointBefore: [], // [x, y] - Interpolated dist/ele of the actual point where edit section starts
    interpolatedPointAfter: [], // [x, y] - Interpolated dist/ele of the actual point where edit section ends
    elevationChangeBefore: { // Elevation change before the edit section
      eleUp: 0.0,
      eleDown: 0.0
    },
    elevationChangeAfter: { // Elevation change after the edit section
      eleUp: 0.0,
      eleDown: 0.0
    }
  },
  newElevationChange: {
    eleUp: 0.0,
    eleDown: 0.0
  },
  elevationProfileHoverMarker: { // Marker that shows on route when hovering over the elevation profile
    display: false,
    latitude: -1,
    longitude: -1
  },
  removedElevationProfileHoverMarker: { // Same as above but for the removed section of the route if editing + hovering over elevation profile
    display: false,
    latitude: -1,
    longitude: -1
  }
};

const elevationSlice = createSlice({
  name: 'elevation',
  initialState,
  reducers: {
    setElevationProfile: (state, action) => {
      state.elevationProfile = [ ...action.payload ];
    },
    setElevationChange: (state, action) => {
      state.elevationChange = { ...action.payload };
    },
    setNewElevationProfile: (state, action) => {
      state.newElevationProfile = [ ...action.payload ];
    },
    setNewElevationProfileExtraData: (state, action) => {
      state.newElevationProfileExtraData = { ...action.payload };
    },
    setNewElevationChange: (state, action) => {
      state.newElevationChange = { ...action.payload };
    },
    setElevationProfileHoverMarker: (state, action) => {
      state.elevationProfileHoverMarker = { ...action.payload };
    },
    setRemovedElevationProfileHoverMarker: (state, action) => {
      state.removedElevationProfileHoverMarker = { ...action.payload };
    },
  }
});

export const {
  setElevationProfile,
  setElevationChange,
  setNewElevationProfile,
  setNewElevationProfileExtraData,
  setNewElevationChange,
  setElevationProfileHoverMarker,
  setRemovedElevationProfileHoverMarker,
} = elevationSlice.actions;
export default elevationSlice.reducer;
