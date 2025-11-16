/*
  For handling when the map is clicked
*/
import store from '../store/store';
import { addUndoActionToList } from '../store/slices/routeSlice';
import { setEditingMarkers, setEditingGeojsonFeatures } from '../store/slices/editRouteSlice';
import { getDirections } from '../controllers/DirectionsController';
import { markersAreCloseEnough } from '../controllers/GeoController';
import { getMouseToMarkerSqDistance } from '../utils/mouseMath';
import { Marker } from '../controllers/MarkerController';
import {
  getMarkersAgnostic,
  getGeojsonAgnostic,
  setMarkersAgnostic,
  setGeojsonFeaturesAgnostic
} from '../controllers/RouteController';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash.clonedeep';

let mutex = false; // Used to prevent multiple clicks from being processed at the same time

async function handleLeftRightClick(
    map,
    rightClick,
    targetClassName,
    lngLat,
    screenPoint
  ) {
  const state = store.getState();
  let markers = getMarkersAgnostic();
  let geojson = getGeojsonAgnostic();
  const addToEnd = state.settings.addToStartOrEnd === 'end';
  const addMarkerInLineEnabled = state.settings.addMarkerInLineEnabled;
  const addPointInLineMarkerVisible = state.addPointInLine.addPointInLineMarkerVisible;
  const addPointInLineMarkerLocation = state.addPointInLine.addPointInLineMarkerLocation;

  // This is a little hack to let us adjust the final point/line if this click was the user
  //  clicking on the finish marker when bulk editing. Sometimes if that finish markers is not
  //  on a road or path, this click will end up snapping away from it which makes it so we can't
  //  finish the edit (since we check that editing is done by checking for overlapping markers)
  let returnVal = {
    newMarkerId: null,
    newLineId: null
  }

  // Check that a marker wasnt being dragged when click happened
  // If so, just do nothing
  let draggingMarker = markers.find(m => m.isDragging);
  if (draggingMarker) {
    draggingMarker.isDragging = false;
    draggingMarker.lngLat = [...draggingMarker.originalLngLat];
    delete draggingMarker.originalLngLat;
    store.dispatch(setMarkersAgnostic(markers));
    return returnVal;
  }

  // If a marker was clicked, do nothing
  // (only fires for right click, or add-point-in-line marker click, b/c marker click handler eats left clicks)
  if (targetClassName.includes('marker')) {
    return returnVal;
  }

  // Just in case, do a specific check to make sure we don't proceed if the add-point-in-line marker was clicked
  // Will almost certainly be caught by the check above, but it would be bad if we did both...
  const addPointInLineMarkerLngLat = [addPointInLineMarkerLocation.longitude, addPointInLineMarkerLocation.latitude];
  if (addMarkerInLineEnabled && addPointInLineMarkerVisible && (getMouseToMarkerSqDistance(screenPoint, map, addPointInLineMarkerLngLat) < 64)) {
    return returnVal;
  }

  let markerToAdd = Marker({
    id: uuidv4(),
    lngLat: [lngLat.lng, lngLat.lat],
    associatedLines: [],
    isDragging: false,
    snappedToRoad: true // default to true, seems to work?
  });

  // Save new marker ID
  returnVal.newMarkerId = markerToAdd.id;

  let prevPt;
  if (addToEnd) {
    // If theres already 1+ markers, calculate directions/distance
    if (markers.length > 0) {
      prevPt = markers[markers.length-1];
      const [calculatedDirections, newLine] = await getDirections(
        prevPt,
        markerToAdd,
        [!prevPt.snappedToRoad, false],
        (rightClick) ? false : undefined // If right click, just this time don't calculate directions
      );
      markerToAdd.snappedToRoad = calculatedDirections;

      // Save new line ID
      returnVal.newLineId = newLine.properties.id;

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
        markerToAdd,
        prevPt,
        [false, !prevPt.snappedToRoad],
        (rightClick) ? false : undefined // If right click, just this time don't calculate directions
      );
      markerToAdd.snappedToRoad = calculatedDirections;

      // Save new line ID
      returnVal.newLineId = newLine.properties.id;

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

  // Allows for undo of 'add' action
  store.dispatch(addUndoActionToList({
    type: 'add',
    marker: markerToAdd
  }));

  setMarkersAgnostic(markers);
  setGeojsonFeaturesAgnostic(geojson.features);

  return returnVal;
}

export async function onMapClick(event, map, rightClick) {
  if (!mutex) {
    mutex = true;
    await handleLeftRightClick(
      map,
      rightClick,
      event.originalEvent.target.className,
      event.lngLat,
      event.point
    );
    mutex = false;
  }
}

// Doesn't really belong in here, but I want to keep these two together
export async function onFinishMarkerClick(event, finishMarker, map, rightClick) {
  if (!mutex) {
    mutex = true;
    const returnVal = await handleLeftRightClick(
      map,
      rightClick,
      '',
      {
        lng: finishMarker.lngLat[0],
        lat: finishMarker.lngLat[1]
      },
      { x: event.clientX, y: event.clientY }
    );

    // Move the new marker and line if needed (little hacky, but whatevs, its clean and better than filling onMapClick with ifs)
    const { newMarkerId, newLineId } = returnVal;
    if (newMarkerId && newLineId) {
      // Don't need to use agnostic function because in here we know we only ever want to edit the editmarkers/geojson
      const state = store.getState();
      let markers = cloneDeep(state.editRoute.editingMarkers);
      let geojson = cloneDeep(state.editRoute.editingGeojson);
      const markerIndex = markers.findIndex(m => m.id === newMarkerId);
      const lineIndex = geojson.features.findIndex(f => f.properties.id === newLineId);
      if (!markersAreCloseEnough(markers[markerIndex], finishMarker, 1e-7)) {
        // Marker must have been moved by directions controller
        markers[markerIndex].lngLat = finishMarker.lngLat;
        markers[markerIndex].snappedToRoad = false; // If this happened we are almost certainly not on a road or path
        geojson.features[lineIndex].geometry.coordinates.push(finishMarker.lngLat);
        store.dispatch(setEditingMarkers(markers));
        store.dispatch(setEditingGeojsonFeatures(geojson.features));
      }
    }

    mutex = false;
  }
}
