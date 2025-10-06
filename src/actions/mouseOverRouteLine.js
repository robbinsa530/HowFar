/*
  The code in this action handler takes care of two things:
  1. Showing/hiding the temporary marker used to show a user when they can "split" a line on their route.
      This is also called the "edit line on click" feature.
  2. Showing/hiding the little popup box to show the distance along the route under the mouse when the user
      hovers their mouse over a line segment on the route.
*/
import store from '../store/store';
import {
  setAddPointInLineState,
  resetAddPointInLineState
} from '../store/slices/addPointInLineSlice';
import {
  setDistancesToDisplay
} from '../store/slices/distancePopupSlice';
import { splitLineWithPoint } from '../controllers/GeoController';
import { getMouseToMarkerSqDistance } from '../utils/mouseMath';
import cloneDeep from 'lodash.clonedeep';
import nearestPointOnLine from '@turf/nearest-point-on-line'
import length from '@turf/length';

async function onMouseOverRouteLine(event, map) {
  const state = store.getState();
  // Route state
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);
  // Map state
  const mouseOnMarker = state.map.mouseOnMarker;
  // Settings state
  const addMarkerInLineEnabled = state.settings.addMarkerInLineEnabled;
  const displayDistancePopupEnabled = state.settings.displayDistancePopupEnabled;

  let snapped;
  let lineUnderMouse;
  let linesAndIndicesUnderMouse = [];

  // Do what both things will need
  if (addMarkerInLineEnabled || displayDistancePopupEnabled) {
    event.features.forEach((mouse_feat, i) => {
      // Use this b/c e.features[0] only returns rendered geometry, not complete
      const idx = geojson.features.findIndex(f => f.properties.id === mouse_feat.properties.id);
      const ln = geojson.features[idx];
      linesAndIndicesUnderMouse.push([idx, ln]);

      // Save info of top most feature (line)
      // 0th feature is always the top rendered feature
      if (i === 0) {
        lineUnderMouse = ln;
      }
    });

    // Happens sometimes for a split second after line is split. geojson has new ids, but rendered map still has old ones
    if (!lineUnderMouse) {
      store.dispatch(resetAddPointInLineState());
      store.dispatch(setDistancesToDisplay([]));
      return;
    }

    // Calculate point centered on line closest to mouse
    // Prevents marker from moving along the width of the line as the mouse moves
    const mousePt = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [event.lngLat.lng, event.lngLat.lat]
      }
    }
    snapped = nearestPointOnLine(lineUnderMouse, mousePt);
  }

  // Handle showing distance under mouse
  if (displayDistancePopupEnabled) {
    let partialDistances = [];
    let idsChecked = []; // Sometimes the same line is returned twice
    linesAndIndicesUnderMouse.forEach(value => {
      const [idx, ln] = value;
      if (idsChecked.includes(ln.properties.id)) {
        return; // continue
      }

      // Calculate distance from start of route to point where mouse is
      let partialDist = 0.0;
      for (let i = 0; i < idx; i++) {
        partialDist += geojson.features[i].properties.distance;
      }

      // Calculate distance from start of split segment to mouse
      const [lCoords, _] = splitLineWithPoint(ln, snapped.geometry.coordinates);
      let partialLine = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: lCoords
        }
      };
      partialDist += length(partialLine, {units: 'miles'});

      // Usually returns double of the same when hovering over junction between segments
      if (partialDistances.length === 0 || Math.abs(partialDist - partialDistances[partialDistances.length - 1]) > 0.005) {
        partialDistances.push(partialDist);
      }
      idsChecked.push(ln.properties.id);
    });
    store.dispatch(setDistancesToDisplay(partialDistances));
  }

  // Handle the "add new/edit line on click" marker
  if (addMarkerInLineEnabled) {
    // If over real marker, don't show this marker.
    // 1. Less intensive check (doesn't work if marker was visible, but faster if it is)
    if (mouseOnMarker) {
      store.dispatch(resetAddPointInLineState());
      return;
    }
    // 2. More intensive check
    const idsUnderMouse = event.features.map(f => f.properties.id);
    const lineEndPtMarkers = markers.filter(m => m.associatedLines.some(l => idsUnderMouse.includes(l)));
    for (const m of lineEndPtMarkers) {
      if (getMouseToMarkerSqDistance(event, map, m.lngLat) < 64) {
        store.dispatch(resetAddPointInLineState());
        return;
      }
    }

    // Make sure marker is visible and save location/id of line to split on click
    store.dispatch(setAddPointInLineState({
      addPointInLineMarkerVisible: true,
      addPointInLineIdToSplit: lineUnderMouse.properties.id,
      addPointInLineMarkerLocation: {
        longitude: snapped.geometry.coordinates[0],
        latitude: snapped.geometry.coordinates[1],
      }
    }));
  }
}

export default onMouseOverRouteLine;
