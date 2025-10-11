/*
  For undoing an add-marker-in-line action
  We remove the middle marker and 2 connecting lines and replace with the single old line
*/
import {
  getMarkersAgnostic,
  getGeojsonAgnostic,
  setMarkersAgnostic,
  setGeojsonFeaturesAgnostic
} from '../../controllers/RouteController';

function onUndoAddMarkerInline(undoInfo) {
  let markers = getMarkersAgnostic();
  let geojson = getGeojsonAgnostic();

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

  setMarkersAgnostic(markers);
  setGeojsonFeaturesAgnostic(geojson.features);
}

export default onUndoAddMarkerInline;
