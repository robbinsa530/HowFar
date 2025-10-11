/*
  For undoing an edit between two points
  This one would be a pain, so just save then overwrite markers and geojson
  TODO: We can make this way more space efficieny by saving:
   - New markers
   - New lines
   - Deleted markers
   - Deleted lines
   - The start and end markers of the edit (so we know where to restore)
  and rebuilding the edited section instead of just overwriting everything
*/
import store from '../../store/store';
import {
  setMarkers,
  setGeojsonFeatures,
} from '../../store/slices/routeSlice';

function onUndoEdit(undoInfo) {
  store.dispatch(setMarkers(undoInfo.markers));
  store.dispatch(setGeojsonFeatures(undoInfo.geojson.features));
}

export default onUndoEdit;
