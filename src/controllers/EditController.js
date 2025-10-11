import store from '../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
  setUndoActionList
} from '../store/slices/routeSlice';
import {
  setEditingMarkers,
  setEditFinishMarker,
  setUndoActionListBackup,
  setStartEndMarkerIndices
} from '../store/slices/editRouteSlice';
import {
  setAddToStartOrEnd
} from '../store/slices/settingsSlice';
import { resetEditStateBasics } from './ResetController';
import cloneDeep from 'lodash.clonedeep';

export function beginEditRouteBetweenPoints() {
  // Called AFTER the two points are selected!

  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  // Find indices of two markers that are selected for edit
  const firstMarkerIndex = markers.findIndex(m => m.selectedForEdit);
  const secondMarkerIndex = markers.slice(firstMarkerIndex + 1).findIndex(m => m.selectedForEdit) + firstMarkerIndex + 1;
  if (firstMarkerIndex === -1 || secondMarkerIndex === -1) {
    alert("Error: Failed to find two markers that are selected for edit.");
    return;
  }

  // Store these to make updating distance and elevation change easier
  store.dispatch(setStartEndMarkerIndices({
    start: firstMarkerIndex,
    end: secondMarkerIndex
  }));

  const firstMarker = markers[firstMarkerIndex];
  const secondMarker = markers[secondMarkerIndex];

  // Set properties.editing to true for all lines in geojson between the two markers
  geojson.features.forEach((f, i) => {
    if (i >= firstMarkerIndex && i < secondMarkerIndex) {
      f.properties.editing = true;
    }
  });
  store.dispatch(setGeojsonFeatures(geojson.features));

  // Hide all markers except the start and end markers and the two points we're editing between:
  // (technically we actually hide the first selected-for-editing-between point, but it'll be displayed via the editingMarkers list)
  markers.forEach((m, i) => {
    if (/*i !== firstMarkerIndex && */i !== secondMarkerIndex && i !== 0 && i !== markers.length - 1) {
      m.hidden = true;
    }
  });
  store.dispatch(setMarkers(markers));
  store.dispatch(setEditingMarkers([{...firstMarker, selectedForEdit: false, hidden: false, associatedLines: []}])); // Starts with just start marker
  store.dispatch(setEditFinishMarker(secondMarker)); // End marker is set on its own for distance calcs and to know when done editing

  // Make a backup of the undo action list. If edit is cancelled, we can restore it.
  // If edit is finished, we will restore it and add a new undo-bulk-edit entry.
  store.dispatch(setUndoActionListBackup(cloneDeep(state.route.undoActionList)));
  store.dispatch(setUndoActionList([]));

  // Cannot allow adding to beginning of route while editing
  store.dispatch(setAddToStartOrEnd('end'));
}

export function finishEditRouteBetweenPoints() {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);
  let editingMarkers = cloneDeep(state.editRoute.editingMarkers);
  const editingGeojson = state.editRoute.editingGeojson;
  const startEndMarkerIndices = state.editRoute.startEndMarkerIndices;

  // Before we add markers and geojson to undo action list, clean them up
  markers.forEach(m => {
    m.selectedForEdit = false;
    m.hidden = false;
  });
  for (let line of geojson.features) {
    delete line.properties.editing;
  }

  // Then let's restore the undo action list and add a new item to it
  let undoActionList = cloneDeep(state.editRoute.undoActionListBackup);
  undoActionList.push({
    type: 'edit',
    info: {
      markers: cloneDeep(markers),
      geojson: cloneDeep(geojson),
    }
  });
  store.dispatch(setUndoActionList(undoActionList));

  // Now we add the appropriate markers (skip duplicated first and last)
  editingMarkers[0].associatedLines.unshift(geojson.features[startEndMarkerIndices.start - 1].properties.id);
  editingMarkers[editingMarkers.length - 1].associatedLines.push(geojson.features[startEndMarkerIndices.end].properties.id);
  markers.splice(
    startEndMarkerIndices.start,
    (startEndMarkerIndices.end - startEndMarkerIndices.start) + 1,
    ...editingMarkers);

  //And add the appropriate lines
  geojson.features.splice(
    startEndMarkerIndices.start,
    startEndMarkerIndices.end - startEndMarkerIndices.start,
    ...editingGeojson.features);

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));

  // Reset edit state to clean up backup and close edit mode only once we're completely done
  resetEditStateBasics();
}
