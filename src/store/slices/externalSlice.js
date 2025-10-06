import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  connectedToStrava: false,
  stravaLoginWindowWasOpened: false
};

const externalSlice = createSlice({
  name: 'external',
  initialState,
  reducers: {
    setConnectedToStrava: (state, action) => {
      state.connectedToStrava = action.payload;
    },
    setStravaLoginWindowWasOpened: (state, action) => {
      state.stravaLoginWindowWasOpened = action.payload;
    }
  }
});

export const {
  setConnectedToStrava,
  setStravaLoginWindowWasOpened,
} = externalSlice.actions;
export default externalSlice.reducer;
