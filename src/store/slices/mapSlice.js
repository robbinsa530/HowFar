import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mapboxToken: '',
  stravaClientId: '', // Doesn't really belong here, but I want to have it with the mapbox token
  location: {
    longitude: -104.959730,
    latitude: 39.765733,
    zoom: import.meta.env.PROD ? 3 : 14
  },
  distance: 0.0,
  elevationChange: {
    eleUp: 0.0,
    eleDown: 0.0
  },
  mouseOnMarker: false,
  hasDefaultLocation: false,
  mapType: 0, // index of mapType in mapTypes
  mapTypes: [ // Cannot be changed
    'mapbox://styles/mapbox/streets-v12',
    'mapbox://styles/mapbox/outdoors-v12',
    'mapbox://styles/mapbox/satellite-streets-v12',
    'mapbox://styles/mapbox/dark-v11'
  ]
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setMapboxToken: (state, action) => {
      state.mapboxToken = action.payload;
    },
    setStravaClientId: (state, action) => {
      state.stravaClientId = action.payload;
    },
    setTokens: (state, action) => {
      state.mapboxToken = action.payload.mapboxToken;
      state.stravaClientId = action.payload.stravaClientId;
    },
    setLocation: (state, action) => {
      state.location = { ...action.payload };
    },
    setDistance: (state, action) => {
      state.distance = action.payload;
    },
    setElevationChange: (state, action) => {
      state.elevationChange = { ...action.payload };
    },
    setMouseOnMarker: (state, action) => {
      state.mouseOnMarker = action.payload;
    },
    setHasDefaultLocation: (state, action) => {
      state.hasDefaultLocation = action.payload;
    },
    setMapType: (state, action) => {
      state.mapType = action.payload;
    }
  }
});

export const {
  setMapboxToken,
  setStravaClientId,
  setTokens,
  setLocation,
  setDistance,
  setElevationChange,
  setMouseOnMarker,
  setHasDefaultLocation,
  setMapType,
} = mapSlice.actions;
export default mapSlice.reducer;
