/*
  For undoing an add-marker-in-line action
  We remove the middle marker and 2 connecting lines and replace with the single old line
*/
import store from '../../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
} from '../../store/slices/routeSlice';
import cloneDeep from 'lodash.clonedeep';

function onUndoAddMarkerInline(undoInfo) {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  const associatedMarkers = [
    markers[undoInfo.addedMarkerIndex - 1],
    markers[undoInfo.addedMarkerIndex + 1],
  ];
  markers.splice(undoInfo.addedMarkerIndex, 1);

  let addedLineIndices = [];
  geojson.features.forEach((f,i) => {
    if (undoInfo.addedLineIds.includes(f.properties.id)) {
      addedLineIndices.push(i);
    }
  });
  // 2 added lines will always be next to each other
  geojson.features.splice(Math.min(...addedLineIndices), 2, undoInfo.removedLine);

  associatedMarkers.forEach(m => {
    m.associatedLines = m.associatedLines.filter(l => ((l !== undoInfo.addedLineIds[0]) && (l !== undoInfo.addedLineIds[1])));
    m.associatedLines.push(undoInfo.removedLine.properties.id);
  });

  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
}

export default onUndoAddMarkerInline;
