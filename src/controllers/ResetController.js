/*
Functions used for resetting app states (stopping an edit, clearing the map, etc.)
*/
import {
  setNewDistance,
  setJustEditingDistance,
  setNewElevationChange,
  setNewElevationProfile,
  setNewElevationProfileExtraData
} from '../store/slices/mapSlice';
import { setMarkers, setGeojsonFeatures, setUndoActionList } from '../store/slices/routeSlice';
import { setEditInfoOpen } from '../store/slices/displaySlice';
import { resetEditRouteState } from '../store/slices/editRouteSlice';
import store from '../store/store';
import cloneDeep from 'lodash.clonedeep';

export function resetEditStateBasics() {
  store.dispatch(setEditInfoOpen(false));
  store.dispatch(resetEditRouteState());
  store.dispatch(setNewDistance(0.0));
  store.dispatch(setJustEditingDistance(0.0));
  store.dispatch(setNewElevationChange({
    eleUp: 0.0,
    eleDown: 0.0
  }));
  store.dispatch(setNewElevationProfile([]));
  store.dispatch(setNewElevationProfileExtraData({
    splitIndexStart: -1,
    splitIndexEnd: -1,
    interpolatedPointBefore: [],
    interpolatedPointAfter: [],
    elevationChangeBefore: {
      eleUp: 0.0,
      eleDown: 0.0
    },
    elevationChangeAfter: {
      eleUp: 0.0,
      eleDown: 0.0
    }
  }));
}

// Used to reset state when an edit action is cancelled (NOT when edit is successfully completed)
export function resetEditState() {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  // Reset all markers to their original state
  markers.forEach(m => {
    m.selectedForEdit = false;
    m.hidden = false;
  });

  // Reset all lines to their original state
  for (let line of geojson.features) {
    delete line.properties.editing;
  }

  // Reset undo action list
  if (state.editRoute.undoActionsAreBackedUp) {
    const undoActionListBackup = cloneDeep(state.editRoute.undoActionListBackup);
    store.dispatch(setUndoActionList(undoActionListBackup));
  }

  // Reset the rest
  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
  resetEditStateBasics();
}

// Handle clearing the map on "Clear" button click or before import for example
export function resetRouteState() {
  store.dispatch(setMarkers([]));
  store.dispatch(setGeojsonFeatures([]));
  store.dispatch(setUndoActionList([]));
}
