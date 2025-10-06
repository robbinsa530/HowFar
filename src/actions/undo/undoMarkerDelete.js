/*
  For undoing a marker delete
  We add back the marker and any affected lines
*/
import store from '../../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
} from '../../store/slices/routeSlice';
import cloneDeep from 'lodash.clonedeep';

function onUndoMarkerDelete(undoInfo) {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  if (undoInfo.lines.length === 0) {
    // A sole marker was deleted. Just add it back
    markers.push(undoInfo.marker);
  }
  else if (undoInfo.lines.length === 1) {
    // An end point was deleted. Add it and its one associated line back
    markers.splice(undoInfo.index, 0, undoInfo.marker);
    const otherMarkerIndex = markers.findIndex(m => m.id === undoInfo.lines[0].otherMarker.id);
    markers[otherMarkerIndex].associatedLines.push(undoInfo.lines[0].line.properties.id);
    geojson.features.splice(undoInfo.lines[0].lineIndex, 0, undoInfo.lines[0].line);
  }
  else { // undoInfo.lines.length === 2
    // A middle point was deleted. Add it back, and split line into 2 lines

    // Sanity check
    if (undoInfo.lines[1].lineIndex !== undoInfo.lines[0].lineIndex + 1) {
      console.error("Geojson lines were out of order somehow. Undo failed.");
      alert("Undo failed");
      return;
    }

    markers.splice(undoInfo.index, 0, undoInfo.marker);
    geojson.features = geojson.features.filter(
      f => f.properties.id !== undoInfo.lineAddedOnDeleteId
    );
    geojson.features.splice(undoInfo.lines[0].lineIndex, 0, undoInfo.lines[0].line, undoInfo.lines[1].line);

    const otherMarkerIndexLine0 = markers.findIndex(m => m.id === undoInfo.lines[0].otherMarker.id);
    const otherMarkerIndexLine1 = markers.findIndex(m => m.id === undoInfo.lines[1].otherMarker.id);
    markers[otherMarkerIndexLine0].associatedLines = markers[otherMarkerIndexLine0].associatedLines.filter(l => l !== undoInfo.lineAddedOnDeleteId);
    markers[otherMarkerIndexLine1].associatedLines = markers[otherMarkerIndexLine1].associatedLines.filter(l => l !== undoInfo.lineAddedOnDeleteId);
    markers[otherMarkerIndexLine0].associatedLines.push(undoInfo.lines[0].line.properties.id);
    markers[otherMarkerIndexLine1].associatedLines.push(undoInfo.lines[1].line.properties.id);
  }

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
}

export default onUndoMarkerDelete;
