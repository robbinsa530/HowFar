import store from '../store/store';

import length from '@turf/length'
import greatCircle from '@turf/great-circle'
import { v4 as uuidv4 } from 'uuid';

const BASEDIR = 'https://api.mapbox.com/directions/v5/mapbox';

async function getRouteBetweenPoints(lngLatStart, lngLatEnd, walkwayBias, directionsMode, token) {
  let endpoint = `${BASEDIR}/${directionsMode}/${lngLatStart[0]},${lngLatStart[1]};${lngLatEnd[0]},${lngLatEnd[1]}?exclude=ferry&geometries=geojson&access_token=${token}&overview=full`;
  if (directionsMode === 'walking') {
    endpoint += `&walkway_bias=${walkwayBias}`;
  }
  let query;
  try {
    query = await fetch(endpoint, { method: 'GET' });
  }
  catch (error) {
    console.error(error);
    return { routes: [] };
  }

  if (query.ok) {
    return await query.json();
  } else {
    return { routes: [] };
  }
}

// Note: Use when the directions API isn't working
// const BASEDIR = 'https://api.mapbox.com/optimized-trips/v1/mapbox/walking/'
// async function getRouteBetweenPoints(lngLatStart, lngLatEnd, walkwayBias, token) {
//   const endpoint = `${BASEDIR}${lngLatStart[0]},${lngLatStart[1]};${lngLatEnd[0]},${lngLatEnd[1]}?source=first&destination=last&roundtrip=false&geometries=geojson&overview=full&access_token=${token}`; // &exclude=ferry&walkway_bias=${walkwayBias}
//   let query;
//   try {
//     query = await fetch(endpoint, { method: 'GET' });
//   }
//   catch (error) {
//     console.error(error);
//     return { routes: [] };
//   }

//   if (query.ok) {
//     let result = await query.json();
//     result.routes = result.trips;
//     delete result.trips;
//     return result;
//   } else {
//     return { routes: [] };
//   }
// }

// Use for mocking. Forces Map component to use straight line distance
// Avoids unnecessary calls to API
// async function getRouteBetweenPoints(lngLatStart, lngLatEnd, token) {
//   return { routes: [] };
// }

async function getDirections(startMarker, endMarker, connectDisjoint, calculateDirectionsOverride=undefined) {
  const state = store.getState();
  // Pull state that we care about for this function
  const walkwayBias = state.settings.walkwayBias;
  const directionsMode = state.settings.directionsMode;
  const autoFollowRoadsEnabled = state.settings.autoFollowRoadsEnabled;
  const mapboxToken = state.map.mapboxToken;

  const calculateDirections = (calculateDirectionsOverride !== undefined) ?
                                calculateDirectionsOverride
                                : autoFollowRoadsEnabled;
  let lngLatStart = startMarker.lngLat;
  let lngLatEnd = endMarker.lngLat;
  let jsonData;
  if (calculateDirections) {
    jsonData = await getRouteBetweenPoints(
      lngLatStart,
      lngLatEnd,
      walkwayBias,
      directionsMode,
      mapboxToken
    );
  }
  let newLine = { // To be returned
    type: 'Feature',
    properties: {
      id: uuidv4(),
      // distance: (Needs to be added)
    },
    geometry: {
      type: 'LineString',
      // coordinates: (Needs to be added)
    }
  };
  if (!calculateDirections || jsonData.routes.length === 0) {
    if (calculateDirections) { alert("Failed to calculate directions"); }
    // Default to direct distance/lines
    newLine.geometry.coordinates = [lngLatStart, lngLatEnd];
    newLine.properties.distance = length(newLine, {units: 'miles'});

    // If line is longer than 1 mile, split it up into a great circle line.
    // If line <= 250mi, break into ~1mi segments.
    // If line > 250mi, break into 250 segments of whatever length that comes out to be.
    if (newLine.properties.distance > 1) {
      let npoints = 250;
      if (newLine.properties.distance <= 250) {
        npoints = Math.trunc(newLine.properties.distance);
      }
      const greatCircleLine = greatCircle(lngLatStart, lngLatEnd, {npoints});
      newLine.geometry.coordinates = greatCircleLine.geometry.coordinates;
    }
  }
  else {
    const route = jsonData.routes[0]; // Will always be a single route
    newLine.properties.distance = route.distance / 1609.344; // Convert dist from meters to miles
    newLine.geometry.coordinates = route.geometry.coordinates;

    /* There's a fun bug where if you're not auto-following roads and have the last point of
        your route going through a field or something (anywhere off road/path), then enable
        auto-follow roads and click on a road, the directions API will give you a route starting
        at the nearest point on a road/path and ignore the distance in between that start and your
        last point. MapMyRun has this issue too actually. This fixes that for sufficiently large gaps.
    */
    const [connectDisjointStart, connectDisjointEnd] = connectDisjoint;
    if (connectDisjointStart) {
      let tempLine = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [lngLatStart, newLine.geometry.coordinates[0]]
        }
      }
      const distBtwn = length(tempLine, {units: 'miles'});
      if (distBtwn > 0.005) {
        // Add segment to lineString and update distance
        newLine.geometry.coordinates.unshift(lngLatStart);
        newLine.properties.distance += distBtwn;
      }
    }
    if (connectDisjointEnd) {
      let tempLine = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [newLine.geometry.coordinates[newLine.geometry.coordinates.length -1], lngLatEnd]
        }
      }
      const distBtwn = length(tempLine, {units: 'miles'});
      if (distBtwn > 0.005) {
        // Add segment to lineString and update distance
        newLine.geometry.coordinates.push(lngLatEnd);
        newLine.properties.distance += distBtwn;
      }
    }
  }

  return [calculateDirections, newLine];
}

export {
  getDirections,
  getRouteBetweenPoints
}
