/*
  Generic undo function called from the sidebar and mobile sidebar
  Will handle calling the appropriate undo function for the last action
  and then removing the action from the undo action list
*/
import store from '../../store/store';
import {
  popFromUndoActionList
} from '../../store/slices/routeSlice';
import onMarkerDelete from '../markerDelete';
import onUndoMarkerDrag from './undoMarkerDrag';
import onUndoMarkerDelete from './undoMarkerDelete';
import onUndoOutAndBack from './undoOutAndBack';
import onUndoAddMarkerInline from './undoAddMarkerInline';
import onUndoEdit from './undoEdit';

async function onUndo(map) {
  const state = store.getState();
  const undoActionList = state.route.undoActionList;

  if (undoActionList.length === 0) {
    return;
  }
  // Undo last add/move/delete/...
  const lastAction = undoActionList[undoActionList.length - 1];
  store.dispatch(popFromUndoActionList());

  if (lastAction.type === 'add') {
    await onMarkerDelete(map, lastAction.marker.id);
  }
  else if (lastAction.type === 'move') {
    onUndoMarkerDrag(lastAction.info);
  }
  else if (lastAction.type === 'delete') {
    onUndoMarkerDelete(lastAction.info);
  }
  else if (lastAction.type === 'out-and-back') {
    onUndoOutAndBack(lastAction.info);
  }
  else if (lastAction.type === 'add-marker-in-line') {
    onUndoAddMarkerInline(lastAction.info);
  }
  else if (lastAction.type === 'edit') {
    onUndoEdit(lastAction.info);
  }
}

export default onUndo;