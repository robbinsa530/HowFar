/*
  For handling when a helper pin is clicked
*/
import store from '../store/store';
import {
  setPins
} from '../store/slices/mapSlice';

async function onPinDelete(pinId) {
  const state = store.getState();
  store.dispatch(setPins(state.map.pins.filter(p => p.id !== pinId)));
}

export default onPinDelete;
