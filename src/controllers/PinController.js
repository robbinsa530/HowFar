import store from '../store/store';
import {
  setPins
} from '../store/slices/mapSlice';
import cloneDeep from 'lodash.clonedeep';
import { v4 as uuidv4 } from 'uuid';

export function Pin ({
  id=uuidv4(),
  lngLat=[0.0, 0.0],
  name='',
  color='red'
}) {
  return {
    id: id,
    lngLat: lngLat,
    name: name,
    color: color
  }
}

export function addPinAtCoordinates(latitude, longitude, name = '', color = 'red') {
  const state = store.getState();
  let pins = cloneDeep(state.map.pins);
  pins.push(Pin({
    id: uuidv4(),
    lngLat: [longitude, latitude],
    name: name,
    color: color
  }));
  store.dispatch(setPins(pins));
}

export function removeAllPins() {
  store.dispatch(setPins([]));
}
