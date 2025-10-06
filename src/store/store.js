import { configureStore } from '@reduxjs/toolkit';
import mapSlice from './slices/mapSlice';
import settingsSlice from './slices/settingsSlice';
import displaySlice from './slices/displaySlice';
import routeSlice from './slices/routeSlice';
import markerDragSlice from './slices/markerDragSlice';
import addPointInLineSlice from './slices/addPointInLineSlice';
import distancePopupSlice from './slices/distancePopupSlice';
import externalSlice from './slices/externalSlice';

export const store = configureStore({
  reducer: {
    map: mapSlice,
    settings: settingsSlice,
    display: displaySlice,
    route: routeSlice,
    markerDrag: markerDragSlice,
    addPointInLine: addPointInLineSlice,
    distancePopup: distancePopupSlice,
    external: externalSlice,
  },
});

export default store;
