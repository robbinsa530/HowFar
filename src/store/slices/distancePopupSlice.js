import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  distancesToDisplay: []
};

const distancePopupSlice = createSlice({
  name: 'distancePopup',
  initialState,
  reducers: {
    setDistancesToDisplay: (state, action) => {
      state.distancesToDisplay = [...action.payload];
    }
  }
});

export const {
  setDistancesToDisplay,
} = distancePopupSlice.actions;
export default distancePopupSlice.reducer;
