/*
  For handling when the add-point-in-line marker is clicked
  Will split the line at the clicked point creating a new marker and 2 lines where there was 1
*/
import store from '../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
  addUndoActionToList
} from '../store/slices/routeSlice';
import {
  updateMarkerElevation,
  splitLineWithPoint,
  getElevationChange
} from '../controllers/GeoController';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash.clonedeep';
import length from '@turf/length';

function onInlineMarkerClick(map) {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);
  const addPointInLineMarkerLocation = state.addPointInLine.addPointInLineMarkerLocation;
  const addPointInLineIdToSplit = state.addPointInLine.addPointInLineIdToSplit;

  // Find markers associated with line we will remove
  let markersToEdit = [];
  let markersToEditIndices = [];
  markers.forEach((m, i) => {
    if (m.associatedLines.includes(addPointInLineIdToSplit)) {
      markersToEdit.push(m);
      markersToEditIndices.push(i);
    }
  });
  if (markersToEdit.length !== 2) {
    console.error(`Somehow, line-to-be-split has ${markersToEdit.length} associated markers. Should have 2. Aborting`);
    alert("Failed to add new point.");
    return;
  }

  // Remove line associations from markers
  markersToEdit.forEach(m => {
    m.associatedLines = m.associatedLines.filter(l => l !== addPointInLineIdToSplit);
  });

  // Set up new marker
  let markerToAdd = {
    id: uuidv4(),
    lngLat: [addPointInLineMarkerLocation.longitude, addPointInLineMarkerLocation.latitude],
    associatedLines: [],
    isDragging: false
    // snappedToRoad: (Needs to be added)
    // elevation: (Needs to be added)
  };

  // Split line around point
  const lineToSplitIndex = geojson.features.findIndex(f => f.properties.id === addPointInLineIdToSplit);
  const lineToSplit = geojson.features[lineToSplitIndex];
  const [lCoords, rCoords] = splitLineWithPoint(lineToSplit, markerToAdd.lngLat);

  // Create 2 new lines in the geojson
  let newLine1 = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: lCoords
    }
  };
  const [up1, down1] = getElevationChange(map, newLine1, markersToEdit[0].elevation);
  const dist1 = length(newLine1, {units: 'miles'});
  newLine1.properties = {
    id: uuidv4(),
    distance: dist1,
    eleUp: up1,
    eleDown: down1
  };
  markerToAdd.snappedToRoad = markersToEdit[1].snappedToRoad;
  markersToEdit[0].associatedLines.push(newLine1.properties.id);
  markerToAdd.associatedLines.push(newLine1.properties.id);

  updateMarkerElevation(map, markerToAdd);

  let newLine2 = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: rCoords
    }
  };
  const [up2, down2] = getElevationChange(map, newLine2, markerToAdd.elevation);
  const dist2 = length(newLine2, {units: 'miles'});
  newLine2.properties = {
    id: uuidv4(),
    distance: dist2,
    eleUp: up2,
    eleDown: down2
  };
  markerToAdd.associatedLines.push(newLine2.properties.id);
  markersToEdit[1].associatedLines.push(newLine2.properties.id);

  // Remove old line and save it so we can add it to the undo action list
  const removedLine = geojson.features.splice(lineToSplitIndex, 1, newLine1, newLine2)[0]; // Returns same line as "lineToSplit" var

  // Add marker to running list
  markers.splice(markersToEditIndices[1], 0, markerToAdd);


  // Allows for undo of 'add-marker-in-line' action
  store.dispatch(addUndoActionToList({
    type: 'add-marker-in-line',
    info: {
      addedMarkerIndex: markersToEditIndices[1],
      addedLineIds: [newLine1.properties.id, newLine2.properties.id],
      removedLine: removedLine
    }
  }));

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
}

export default onInlineMarkerClick;
