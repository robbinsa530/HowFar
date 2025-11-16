/*
  For handling when a marker is dragged
*/
import store from '../store/store';
import {
  addUndoActionToList
} from '../store/slices/routeSlice';
import { getDirections } from '../controllers/DirectionsController';
import {
  getMarkersAgnostic,
  getGeojsonAgnostic,
  setMarkersAgnostic,
  setGeojsonFeaturesAgnostic
} from '../controllers/RouteController';
import cloneDeep from 'lodash.clonedeep';

async function onMarkerDragStart(draggedMarkerIndex) {
  let markers = getMarkersAgnostic();
  markers[draggedMarkerIndex].isDragging = true;
  markers[draggedMarkerIndex].originalLngLat = [...markers[draggedMarkerIndex].lngLat];
  setMarkersAgnostic(markers);
}

async function onMarkerDrag(event, draggedMarkerIndex) {
  let markers = getMarkersAgnostic();
  markers[draggedMarkerIndex].lngLat = [event.lngLat.lng, event.lngLat.lat];
  setMarkersAgnostic(markers);
}

async function onMarkerDragEnd(event, draggedMarkerIndex) {
  let markers = getMarkersAgnostic();
  let geojson = getGeojsonAgnostic();

  // Get a reference to our copy of the dragged marker
  let draggedMarker = markers[draggedMarkerIndex];

  // Setup undo action object
  let dragActionInfo = {
    markerId: draggedMarker.id,
    oldSnappedToRoad: draggedMarker.snappedToRoad,
    oldPosition: [...draggedMarker.originalLngLat], // Want copy since we're about to change this
    lines: [ // Can hold 0-2 lines.
      // LineString Feature (Deep copy)
    ]
  };

   // Update marker position and end dragging status (by reference)
   draggedMarker.lngLat = [event.lngLat.lng, event.lngLat.lat];
   delete draggedMarker.originalLngLat;
   draggedMarker.isDragging = false;

   if (markers.length > 1) {
    if (draggedMarker.associatedLines.length >= 1) {
      // Edit 1 or 2 associated lines
      let linesToEdit = [];
      draggedMarker.associatedLines.forEach(l => {
        const lineIndex = geojson.features.findIndex(f => f.properties.id === l);
        linesToEdit.push({line: geojson.features[lineIndex], index: lineIndex});
      });

      for (const [entryIndex, lineEntry] of linesToEdit.entries()) { // CANNOT use .forEach here b/c async
        const l = lineEntry.line;
        const i = lineEntry.index;
        dragActionInfo.lines.push(cloneDeep(l)) // Need a deep clone b/c we're about to edit this obj's nested members

        // Find other marker associated with line
        const otherMarkerIndex = markers.findIndex(m => m.id !== draggedMarker.id && m.associatedLines.includes(l.properties.id));
        // Replace old line with new one
        let calculatedDirections, newLine;
        if (draggedMarkerIndex < otherMarkerIndex) {
          [calculatedDirections, newLine] = await getDirections(
            markers[draggedMarkerIndex],
            markers[otherMarkerIndex],
            [false, !markers[otherMarkerIndex].snappedToRoad]);
        } else {
          [calculatedDirections, newLine] = await getDirections(
            markers[otherMarkerIndex],
            markers[draggedMarkerIndex],
            [!markers[otherMarkerIndex].snappedToRoad, false]);
        }
        geojson.features[i].properties.distance = newLine.properties.distance;
        geojson.features[i].geometry.coordinates = newLine.geometry.coordinates;

        // Update position of marker. This is in case it wasn't dragged onto a road or path,
        // the API will return the closest point to a road or path. That's what we wanna use
        if (entryIndex === 0) {
          draggedMarker.snappedToRoad = calculatedDirections;
          const coordIndex = (draggedMarkerIndex < otherMarkerIndex) ? 0 : newLine.geometry.coordinates.length -1;
          draggedMarker.lngLat = newLine.geometry.coordinates[coordIndex];
        }
      }
    }
    else if (draggedMarker.associatedLines.length === 0) {
      // Should never happen...
      alert("Error moving point.");
      console.error("Multiple markers exist, but dragged marker had no associated lines. Not sure how that happened...");
    }
  }

  // Allows for undo of 'move' action
  store.dispatch(addUndoActionToList({
    type: 'move',
    info: dragActionInfo
  }));

  setMarkersAgnostic(markers);
  setGeojsonFeaturesAgnostic(geojson.features);
}

export {
  onMarkerDragStart,
  onMarkerDrag,
  onMarkerDragEnd
};
