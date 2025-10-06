/*
  For handling when the out and back button is clicked
*/
import store from '../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
  addUndoActionToList
} from '../store/slices/routeSlice';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash.clonedeep';

function onOutAndBack() {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  // Can't do an out and back if you haven't gone out yet!
  if (markers.length < 2) {
    return;
  }

  // Setup for undo
  const undoActionInfo = {
    markersLength: markers.length,
    linesLength: geojson.features.length
    // newAssocLineEndPtId: (Needs to be added)
  };

  // Reverse and add new linesegments
  let newLines = [];
  for (let i = geojson.features.length - 1; i >= 0; i--) {
    const oldLine =  geojson.features[i];
    let newLine = { // To be returned
      type: 'Feature',
      properties: {
        id: uuidv4(),
        distance: oldLine.properties.distance,
        eleUp: -oldLine.properties.eleDown, // Up will be down in reverse
        eleDown: -oldLine.properties.eleUp // Down will be up in reverse
      },
      geometry: {
        type: 'LineString',
        coordinates: oldLine.geometry.coordinates.slice().reverse()
      }
    };
    newLines.push(newLine);
  }

  // Add first new line to associatedLines of last marker
  markers[markers.length - 1].associatedLines.push(newLines[0].properties.id);
  undoActionInfo.newAssocLineEndPtId = newLines[0].properties.id;

  // Create and place new markers
  let newMarkers = [];
  for (let i = markers.length - 2; i >= 0; i--) { // Don't repeat turnaround-point marker
    const oldMarker = markers[i];

    // Will be assoc w/ newLine of same index, and the next one if it exists
    const l1 = newMarkers.length;
    const l2 = l1 + 1;
    let newAssocLines = [newLines[l1].properties.id];
    if (l2 < newLines.length) {
      newAssocLines.push(newLines[l2].properties.id);
    }
    let newMarker = {
      id: uuidv4(),
      lngLat: oldMarker.lngLat,
      associatedLines: newAssocLines,
      isDragging: false,
      snappedToRoad: oldMarker.snappedToRoad,
      elevation: oldMarker.elevation
    };

    // Add marker to running list
    newMarkers.push(newMarker);
  }

  geojson.features.push(...newLines);
  markers.push(...newMarkers);

  // Allows for undo of 'out and back' action
  store.dispatch(addUndoActionToList({
    type: 'out-and-back',
    info: undoActionInfo
  }));

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
}

export default onOutAndBack;
