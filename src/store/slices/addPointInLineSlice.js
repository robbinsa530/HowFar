import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  addPointInLineMarkerVisible: false,
  addPointInLineIdToSplit: '',
  addPointInLineMarkerLocation: {
    longitude: 0,
    latitude: 0,
  }
};

const addPointInLineSlice = createSlice({
  name: 'addPointInLine',
  initialState,
  reducers: {
    setAddPointInLineMarkerVisible: (state, action) => {
      state.addPointInLineMarkerVisible = action.payload;
    },
    setAddPointInLineIdToSplit: (state, action) => {
      state.addPointInLineIdToSplit = action.payload;
    },
    setAddPointInLineMarkerLocation: (state, action) => {
      state.addPointInLineMarkerLocation = { ...action.payload };
    },
    setAddPointInLineState: (state, action) => action.payload,
    resetAddPointInLineState: () => initialState
  }
});

export const {
  setAddPointInLineMarkerVisible,
  setAddPointInLineIdToSplit,
  setAddPointInLineMarkerLocation,
  setAddPointInLineState,
  resetAddPointInLineState,
} = addPointInLineSlice.actions;
export default addPointInLineSlice.reducer;
