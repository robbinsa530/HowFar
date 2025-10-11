import store from '../store/store';
import { setMarkers, setGeojsonFeatures } from '../store/slices/routeSlice';
import { setEditingMarkers, setEditingGeojsonFeatures } from '../store/slices/editRouteSlice';
import cloneDeep from 'lodash.clonedeep';

function editActive() {
  const state = store.getState();
  return state.display.editInfoOpen && state.editRoute.editRedrawingRoute;
}

export function getMarkersAgnostic() {
  const state = store.getState();
  if (editActive()) {
    return cloneDeep(state.editRoute.editingMarkers);
  }
  return cloneDeep(state.route.markers);
}

export function getGeojsonAgnostic() {
  const state = store.getState();
  if (editActive()) {
    return cloneDeep(state.editRoute.editingGeojson);
  }
  return cloneDeep(state.route.geojson);
}

export function setMarkersAgnostic(markers) {
  if (editActive()) {
    store.dispatch(setEditingMarkers(markers));
  } else {
    store.dispatch(setMarkers(markers));
  }
}

export function setGeojsonFeaturesAgnostic(features) {
  if (editActive()) {
    store.dispatch(setEditingGeojsonFeatures(features));
  } else {
    store.dispatch(setGeojsonFeatures(features));
  }
}