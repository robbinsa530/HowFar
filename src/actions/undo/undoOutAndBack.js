/*
  For undoing an out and back
  We remove all of the "back" and leave just the original "out"
*/
import store from '../../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
} from '../../store/slices/routeSlice';
import cloneDeep from 'lodash.clonedeep';

function onUndoOutAndBack(undoInfo) {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  // Remove markers and lines that were added
  markers.splice(undoInfo.markersLength);
  geojson.features.splice(undoInfo.linesLength);

  // Remove reference to the now deleted line from the now last marker
  let lastMarker = markers[markers.length - 1];
  lastMarker.associatedLines = lastMarker.associatedLines.filter(l => l !== undoInfo.newAssocLineEndPtId);

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
}

export default onUndoOutAndBack;
