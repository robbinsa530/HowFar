import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  menuOpen: false,
  clearMapOpen: false,
  clearEditOpen: false,
  postToStravaOpen: false,
  exportActivityOpen: false,
  importActivityOpen: false,
  editInfoOpen: false,
  loading: true,
  locating: false,
  uploading: false,
  uploadedMessage: '',
  isMobile: false,

  // Marker popup
  markerPopupOpen: false,
  markerPopupData: {
    id: '',
    longitude: 0,
    latitude: 0
  }
};

const displaySlice = createSlice({
  name: 'display',
  initialState,
  reducers: {
    setMenuOpen: (state, action) => {
      state.menuOpen = action.payload;
    },
    setClearMapOpen: (state, action) => {
      state.clearMapOpen = action.payload;
    },
    setClearEditOpen: (state, action) => {
      state.clearEditOpen = action.payload;
    },
    setPostToStravaOpen: (state, action) => {
      state.postToStravaOpen = action.payload;
    },
    setExportActivityOpen: (state, action) => {
      state.exportActivityOpen = action.payload;
    },
    setImportActivityOpen: (state, action) => {
      state.importActivityOpen = action.payload;
    },
    setEditInfoOpen: (state, action) => {
      state.editInfoOpen = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setLocating: (state, action) => {
      state.locating = action.payload;
    },
    setUploading: (state, action) => {
      state.uploading = action.payload;
    },
    setUploadedMessage: (state, action) => {
      state.uploadedMessage = action.payload;
    },
    setMarkerPopupOpen: (state, action) => {
      state.markerPopupOpen = action.payload;
    },
    setMarkerPopupData: (state, action) => {
      state.markerPopupData = { ...state.markerPopupData, ...action.payload };
    },
    setIsMobile: (state, action) => {
      state.isMobile = action.payload;
    },
  }
});

export const {
  setMenuOpen,
  setClearMapOpen,
  setClearEditOpen,
  setPostToStravaOpen,
  setExportActivityOpen,
  setImportActivityOpen,
  setEditInfoOpen,
  setLoading,
  setLocating,
  setUploading,
  setUploadedMessage,
  setMarkerPopupOpen,
  setMarkerPopupData,
  setIsMobile,
} = displaySlice.actions;
export default displaySlice.reducer;
