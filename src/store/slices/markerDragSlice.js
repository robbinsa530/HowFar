// This is only needed because of what seems to be a bug in react-map-gl.
// When a marker is dragged, after the drag ends, it will fire a click event.
// This will cause the popup for that marker to open.
// There seems to be no built in way to prevent this... So I basicalyly do a
//  check on every marker click to see if it has moved between mouse button down and mouse button up.

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mouseDownCoords: {
    x: null,
    y: null
  }
};

const markerDragSlice = createSlice({
  name: 'markerDrag',
  initialState,
  reducers: {
    setMouseDownCoords: (state, action) => {
      state.mouseDownCoords = { ...action.payload };
    }
  }
});

export const {
  setMouseDownCoords
} = markerDragSlice.actions;
export default markerDragSlice.reducer;
