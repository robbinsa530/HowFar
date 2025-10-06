/*
  For handling when the map is clicked
*/
import store from '../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
  addUndoActionToList
} from '../store/slices/routeSlice';
import { getDirections } from '../controllers/DirectionsController';
import { updateMarkerElevation } from '../controllers/GeoController';
import { getMouseToMarkerSqDistance } from '../utils/mouseMath';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash.clonedeep';

let mutex = false; // Used to prevent multiple clicks from being processed at the same time

async function handleLeftRightClick(event, map, rightClick) {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);
  const addToEnd = state.settings.addToStartOrEnd === 'end';
  const addMarkerInLineEnabled = state.settings.addMarkerInLineEnabled;
  const addPointInLineMarkerVisible = state.addPointInLine.addPointInLineMarkerVisible;
  const addPointInLineMarkerLocation = state.addPointInLine.addPointInLineMarkerLocation;

  // Check that a marker wasnt being dragged when click happened
  // If so, just do nothing
  let draggingMarker = markers.find(m => m.isDragging);
  if (draggingMarker) {
    draggingMarker.isDragging = false;
    draggingMarker.lngLat = [...draggingMarker.originalLngLat];
    delete draggingMarker.originalLngLat;
    store.dispatch(setMarkers(markers));
    return;
  }

  // If a marker was clicked, do nothing
  // (only fires for right click, or add-point-in-line marker click, b/c marker click handler eats left clicks)
  if (event.originalEvent.target.className.includes('marker')) {
    return;
  }

  // Just in case, do a specific check to make sure we don't proceed if the add-point-in-line marker was clicked
  // Will almost certainly be caught by the check above, but it would be bad if we did both...
  const addPointInLineMarkerLngLat = [addPointInLineMarkerLocation.longitude, addPointInLineMarkerLocation.latitude];
  if (addMarkerInLineEnabled && addPointInLineMarkerVisible && (getMouseToMarkerSqDistance(event, map, addPointInLineMarkerLngLat) < 64)) {
    return;
  }

  let markerToAdd = {
    id: uuidv4(),
    lngLat: [event.lngLat.lng, event.lngLat.lat],
    associatedLines: [],
    isDragging: false,
    snappedToRoad: true // default to true, seems to work?
  };

  let prevPt;
  if (addToEnd) {
    // If theres already 1+ markers, calculate directions/distance
    if (markers.length > 0) {
      prevPt = markers[markers.length-1];
      const [calculatedDirections, newLine] = await getDirections(
        map,
        prevPt,
        markerToAdd,
        [!prevPt.snappedToRoad, false],
        (rightClick) ? false : undefined // If right click, just this time don't calculate directions
      );
      markerToAdd.snappedToRoad = calculatedDirections;

      // Associate this new line with both of its endpoint markers
      // This is so we can know which lines to edit on marker delete/move
      prevPt.associatedLines.push(newLine.properties.id); // markers[markers.length-1]
      markerToAdd.associatedLines.push(newLine.properties.id);

      // Update position of marker. This is in case click wasn't on a road or path,
      // the API will return the closest point to a road or path. That's what we wanna use
      markerToAdd.lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length -1];
      prevPt.lngLat = newLine.geometry.coordinates[0];

      if (markers.length === 1) { // Only on the second point, make sure we update the first too
        markers[0].lngLat = newLine.geometry.coordinates[0];
      }

      geojson.features.push(newLine);
    }
    markers.push(markerToAdd);
  }
  else { // Add to start
    // If theres already 1+ markers, calculate directions/distance
    if (markers.length > 0) {
      prevPt = markers[0];
      const [calculatedDirections, newLine] = await getDirections(
        map,
        markerToAdd,
        prevPt,
        [false, !prevPt.snappedToRoad],
        (rightClick) ? false : undefined // If right click, just this time don't calculate directions
      );
      markerToAdd.snappedToRoad = calculatedDirections;
      // Associate this new line with both of its endpoint markers
      // This is so we can know which lines to edit on marker delete/move
      prevPt.associatedLines.push(newLine.properties.id); // markers[0]
      markerToAdd.associatedLines.push(newLine.properties.id);

      // Update position of marker. This is in case click wasn't on a road or path,
      // the API will return the closest point to a road or path. That's what we wanna use
      markerToAdd.lngLat = newLine.geometry.coordinates[0];
      prevPt.lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length - 1];

      if (markers.length === 1) { // Only on the second point, make sure we update the first too
        markers[0].lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length - 1];
      }

      geojson.features.unshift(newLine);
    }
    markers.unshift(markerToAdd);
  }
  // Update marker elevation (I don't actually remember why this is needed...)
  updateMarkerElevation(map, markerToAdd);
  if (prevPt) {
    updateMarkerElevation(map, prevPt);
  }

  // Allows for undo of 'add' action
  store.dispatch(addUndoActionToList({
    type: 'add',
    marker: markerToAdd
  }));

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
}

async function onMapClick(event, map, rightClick) {
  if (!mutex) {
    mutex = true;
    await handleLeftRightClick(event, map, rightClick);
    mutex = false;
  }
}

export default onMapClick;
