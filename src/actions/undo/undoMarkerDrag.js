/*
  For undoing a marker drag
  We move the marker and any affected lines back to their original positions
*/
import {
  getMarkersAgnostic,
  getGeojsonAgnostic,
  setMarkersAgnostic,
  setGeojsonFeaturesAgnostic
} from '../../controllers/RouteController';

function onUndoMarkerDrag(undoInfo) {
  let markers = getMarkersAgnostic();
  let geojson = getGeojsonAgnostic();

  // There are 3 possible cases. All of them require this step (moving the marker back to its old loc)
  let draggedMarker = markers.find(m => m.id === undoInfo.markerId);
  draggedMarker.lngLat = undoInfo.oldPosition;
  draggedMarker.snappedToRoad = undoInfo.oldSnappedToRoad;
  // The 3 cases are:
  // 1. The only existing marker was moved. Nothing else needs to be done
  // 2. An end point was moved. Move it back and adjust one line (if info.lines.length === 1)
  // 3. A middle point was moved. Move it back, and adjust 2 lines (if info.lines.length === 2)
  undoInfo.lines.forEach(l => {
    let lineRef = geojson.features.find(f => f.properties.id === l.properties.id);
    lineRef.properties.distance = l.properties.distance;
    lineRef.geometry.coordinates = l.geometry.coordinates;
  });

  setMarkersAgnostic(markers);
  setGeojsonFeaturesAgnostic(geojson.features);
}

export default onUndoMarkerDrag;
