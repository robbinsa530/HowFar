/*
  For handling when a marker is deleted via the popup button
*/
import store from '../store/store';
import {
  setMarkers,
  setGeojsonFeatures
} from '../store/slices/routeSlice';
import { getDirections } from '../controllers/DirectionsController';
import cloneDeep from 'lodash.clonedeep';

async function onMarkerDelete(map, markerIdToRemove) {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  // Remove the marker from the markers array
  let markerToRemoveIndex = markers.findIndex(m => m.id === markerIdToRemove);
  let markerToRemove = markers[markerToRemoveIndex];
  markers.splice(markerToRemoveIndex, 1);

  // Prepare the undo action info to return
  let undoActionInfoToReturn = {
    marker: markerToRemove,
    index: markerToRemoveIndex,
    lines: [ // Can hold 0-2 lines
      // {
      //   line: LineString Feature,
      //   lineIndex: Number,
      //   otherMarker: Marker obj,
      // }
    ],
    lineAddedOnDeleteId: null
  };

  if (markers.length > 1) {
    // Marker removed. Update all associated lines
    if (markerToRemove.associatedLines.length === 1) {
      // End point. Remove associated line, update new end point
      const lineToRemoveId = markerToRemove.associatedLines[0];
      const lineToRemoveIndex = geojson.features.findIndex(
        f => f.properties.id === lineToRemoveId
      );
      const lineToRemove = geojson.features[lineToRemoveIndex];
      undoActionInfoToReturn.lines.push({
        line: lineToRemove,
        lineIndex: lineToRemoveIndex,
        otherMarker: null // To be filled
      });
      geojson.features.splice(lineToRemoveIndex, 1);

      // Remove all references to the deleted line from all markers
      markers.forEach((m,i) => {
        const startLen = m.associatedLines.length;
        markers[i].associatedLines = m.associatedLines.filter(
          l => l !== lineToRemoveId
        );
        const endLen = markers[i].associatedLines.length;
        if (startLen !== endLen) { // Marker was associated with line
          undoActionInfoToReturn.lines[0].otherMarker = markers[i];
        }
      });
    }
    else if (markerToRemove.associatedLines.length > 1) {
      // Middle point. Remove associated lines, reroute, update
      const linesToRemove = markerToRemove.associatedLines;
      const lineIndices = linesToRemove.map(l => {
        return geojson.features.findIndex(f => f.properties.id === l);
      });
      const line1Index = Math.min(...lineIndices);
      undoActionInfoToReturn.lines.push({
        line: geojson.features[line1Index],
        lineIndex: line1Index,
        otherMarker: null // To be filled
      });
      const line2Index = Math.max(...lineIndices);
      undoActionInfoToReturn.lines.push({
        line: geojson.features[line2Index],
        lineIndex: line2Index,
        otherMarker: null // To be filled
      });
      geojson.features = geojson.features.filter(
        f => !linesToRemove.includes(f.properties.id)
      );

      // Remove all references to the deleted lines from affected markers
      const lMarker = markers[markerToRemoveIndex - 1];
      const rMarker = markers[markerToRemoveIndex /*+ 1*/]; // Don't need to +1 b/c marker has already been removed
      lMarker.associatedLines = lMarker.associatedLines.filter(l => !linesToRemove.includes(l));
      rMarker.associatedLines = rMarker.associatedLines.filter(l => !linesToRemove.includes(l));

      // Calculate new route and insert where the old lines were
      const [_, newLine] = await getDirections(map, lMarker, rMarker, [!lMarker.snappedToRoad, !rMarker.snappedToRoad]);
      undoActionInfoToReturn.lineAddedOnDeleteId = newLine.properties.id;
      geojson.features.splice(Math.min(...lineIndices), 0, newLine);

      // Update markers at ends of new line with line's id
      // lMarker and rMarker are references to elements in the markers array, so they'll be updated
      lMarker.associatedLines.push(newLine.properties.id);
      rMarker.associatedLines.push(newLine.properties.id);
      undoActionInfoToReturn.lines[0].otherMarker = lMarker;
      undoActionInfoToReturn.lines[1].otherMarker = rMarker;
    }
    else if (markerToRemove.associatedLines.length === 0) {
      // Should never happen...
      alert("Error deleting point.");
      console.error("Multiple markers exist after removal, but removed marker had no associated lines. Not sure how that happened...");
    }
  } else {
    if (markers.length === 1) {
      undoActionInfoToReturn.lines.push({
        line: geojson.features[0],
        lineIndex: 0,
        otherMarker: markers[0]
      });
    }
    geojson.features = [];
    markers.forEach((_,i) => {
      markers[i].associatedLines = [];
    });
  }

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));

  return undoActionInfoToReturn;
}

export default onMarkerDelete;
