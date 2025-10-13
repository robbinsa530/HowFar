import store from '../store/store';
import {
  setPins
} from '../store/slices/mapSlice';
import cloneDeep from 'lodash.clonedeep';
import { v4 as uuidv4 } from 'uuid';

export function Pin ({
  id=uuidv4(),
  lngLat=[0.0, 0.0]
}) {
  return {
    id: id,
    lngLat: lngLat
  }
}

export function addPinAtCoordinates(latitude, longitude) {
  const state = store.getState();
  let pins = cloneDeep(state.map.pins);
  pins.push(Pin({
    id: uuidv4(),
    lngLat: [longitude, latitude],
  }));
  store.dispatch(setPins(pins));
}

export function removeAllPins() {
  store.dispatch(setPins([]));
}
