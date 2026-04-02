import store from '../store/store';

import { geojsonToPointsForGpx } from './StravaController'
import { Marker } from './MarkerController'
import { addPinAtCoordinates } from './PinController'
import { setLoading } from '../store/slices/displaySlice'
import { setMarkers, setGeojsonFeatures } from '../store/slices/routeSlice'

import { XMLParser } from 'fast-xml-parser'
import { v4 as uuidv4 } from 'uuid';
import length from '@turf/length'
import lineChunk from '@turf/line-chunk'
import cloneDeep from 'lodash.clonedeep';

/**
 * Fetches saved route by UUID: PostGIS line geometry + pins (see server /api/routes/:uuid).
 * @param {string} uuid - Route identifier
 * @returns {Promise<{ routeGeom: GeoJSON.LineString|GeoJSON.MultiLineString, pins: Array }|null>}
 */
export async function fetchRouteByUuid(uuid) {
  if (!uuid) return null;
  const res = await fetch(`/api/routes/${encodeURIComponent(uuid)}`, {
    credentials: 'include',
  });
  if (res.status === 404) return null;
  if (res.status === 503) {
    console.warn('Route API unavailable (database not configured).');
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load route: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Flatten LineString / MultiLineString GeoJSON into one [lng, lat][] for GPX-style import.
 * @param {GeoJSON.LineString | GeoJSON.MultiLineString} geom
 * @returns {number[][]}
 */
export function geometryToLngLatPoints(geom) {
  if (!geom || !geom.type) return [];
  if (geom.type === 'LineString') {
    return (geom.coordinates || []).map(([lng, lat]) => [lng, lat]);
  }
  if (geom.type === 'MultiLineString') {
    const pts = [];
    for (const line of geom.coordinates || []) {
      if (line.length === 0) continue;
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        const first = line[0];
        // Check if last point of previous line is the same as first point of current line.
        // If so, skip the first point of the current line.
        const same =
          Math.abs(last[0] - first[0]) < 1e-7 && Math.abs(last[1] - first[1]) < 1e-7;
        if (same) {
          for (let i = 1; i < line.length; i++) pts.push(line[i]);
        } else {
          pts.push(...line);
        }
      } else {
        // Always push all points of first line
        pts.push(...line);
      }
    }
    return pts;
  }
  return [];
}

/**
 * Load a route saved as PostGIS geometry + pins: pins first (same as GPX import), then
 * rebuild segments/markers/distances via loadRouteFromPoints.
 * @param {{ routeGeom: GeoJSON.LineString|GeoJSON.MultiLineString, pins?: Array }} data
 * @param {import('mapbox-gl').Map} map
 */
export async function loadSavedRoute(data, map) {
  const { routeGeom, pins = [] } = data;
  const points = geometryToLngLatPoints(routeGeom);
  if (points.length < 2) {
    console.error('Persisted route has too few coordinates.', routeGeom);
    alert('This saved route could not be loaded (not enough points).');
    return;
  }

  for (const pin of pins) {
    const ll = pin.lngLat;
    if (Array.isArray(ll) && ll.length >= 2) {
      addPinAtCoordinates(ll[1], ll[0], pin.name ?? '', pin.color ?? 'red');
    }
  }

  await loadRouteFromPoints(points, map, false, false);
}

export async function downloadActivityGpx(data) {
  const state = store.getState();
  let geojson = cloneDeep(state.route.geojson);
  const points = geojsonToPointsForGpx(geojson);
  const postResp = await fetch("/exportGpx",
    {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        points,
        title: data.filename,
      })
    }
  );
  if (!postResp.ok) {
    const errText = await postResp.text();
    console.error("Failed to export activity to GPX.", postResp.status, errText);
    alert("Failed to export activity to GPX");
    return;
  }
  const postRespJson = await postResp.json();
  const gpxText = postRespJson.gpx;

  const blob = new Blob([gpxText], { type: 'application/gpx+xml' });
  const url = window.URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', data.filename + ".gpx");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  window.URL.revokeObjectURL(url);
}

/**
 * @param {boolean} [addIntermediateMarkers=true] Mile-chunk markers vs start/end only.
 * @param {boolean} [fitBoundsReserveSidebar=true] Extra left padding for the desktop sidebar; set false when UI is slim (e.g. view-only saved route).
 */
export async function loadRouteFromPoints(points, map, addIntermediateMarkers = true, fitBoundsReserveSidebar = true) {
  const state = store.getState();
  let markers = cloneDeep(state.route.markers);
  let geojson = cloneDeep(state.route.geojson);

  // Move map to route boundaries
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  points.forEach(pt => {
    minLat = Math.min(pt[1], minLat);
    maxLat = Math.max(pt[1], maxLat);
    minLng = Math.min(pt[0], minLng);
    maxLng = Math.max(pt[0], maxLng);
  });

  // Handle bbox crossing intl. dateline (even though it'll probably never happen)
  if (minLng < -90 && maxLng > 90) {
    maxLng -= 360;
  }

  const edgePad = 20;
  let padding;
  if (fitBoundsReserveSidebar) {
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarWidth = sidebarContent?.offsetWidth ?? 0;
    padding = { top: edgePad, bottom: edgePad, left: sidebarWidth + edgePad, right: edgePad };
  } else {
    padding = { top: edgePad, bottom: edgePad, left: edgePad, right: edgePad };
  }

  map.fitBounds([
    [minLng, minLat], // sw
    [maxLng, maxLat]  // ne
  ], {
    animate: false,
    padding
  });

  // Wait for map to idle so we know it's all there
  store.dispatch(setLoading(true));
  await map.once("idle");
  store.dispatch(setLoading(false));

  // Create a single long ass segment for the whole route
  let totalLine = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: points
    }
  };

  // If requested, chunk the total line into 1 mile increments to make editing route easier after import
  let chunks = [];
  if (addIntermediateMarkers) {
    chunks = lineChunk(totalLine, 1, {units: 'miles'}).features;
  } else {
    chunks = [totalLine];
  }

  // Remove nearly duplicate coordinates from each chunk
  // 0.0000001 (1e^-7) is 4-11mm in the real world (unnoticeable for map display)
  // This prevents a weird bug with Turf.js where it fails to do some calculations on lines with duplicate coordinates
  chunks.forEach(chunk => {
    const coords = chunk.geometry.coordinates;
    const filteredCoords = coords.filter((coord, i) => {
      if (i === 0) return true;
      const prevCoord = coords[i-1];
      return Math.abs(coord[0] - prevCoord[0]) > 0.0000001 ||
             Math.abs(coord[1] - prevCoord[1]) > 0.0000001;
    });
    chunk.geometry.coordinates = filteredCoords;
  });

  chunks.forEach(chunk => {
    let line = {
      type: 'Feature',
      properties: {
        id: uuidv4(),
        // distance: (Needs to be added)
      },
      geometry: {
        type: 'LineString',
        coordinates: chunk.geometry.coordinates
      }
    };
    line.properties.distance = length(line, {units: 'miles'});
    geojson.features.push(line);
  });

  // Add markers
  let markerCoordsAndLines = [];
  if (addIntermediateMarkers) {
    // Add markers (start, and 1 mile intervals)
    markerCoordsAndLines = geojson.features.map((feat, i) => {
      let associatedLines;
      if (i === 0) {
        associatedLines = [feat.properties.id];
      } else {
        associatedLines = [geojson.features[i-1].properties.id, feat.properties.id];
      }
      return {
        coords: feat.geometry.coordinates[0],
        associatedLines
      };
    });
  } else {
    // Add just the start marker
    markerCoordsAndLines = [{
      coords: geojson.features[0].geometry.coordinates[0],
      associatedLines: [geojson.features[0].properties.id]
    }];
  }

  // Make sure we get the end marker and add it to the list
  const lastFeat = geojson.features[geojson.features.length-1];
  markerCoordsAndLines.push({
    coords: lastFeat.geometry.coordinates[lastFeat.geometry.coordinates.length-1],
    associatedLines: [lastFeat.properties.id]
  });

  for (const obj of markerCoordsAndLines) {
    markers.push(Marker({
      id: uuidv4(),
      lngLat: obj.coords,
      associatedLines: obj.associatedLines,
      isDragging: false,
      snappedToRoad: false
    }));
  }

  // Update state
  store.dispatch(setMarkers(markers));
  store.dispatch(setGeojsonFeatures(geojson.features));
}

function parseGpxLayer(layers, gpxRawData) {
  // Go through layers and get 1-N pieces from each
  let data = [];
  let lastData = [gpxRawData];
  layers.forEach(key => {
    lastData.forEach(value => {
      // Make sure key exists
      if (!Object.hasOwn(value, key)) {
        return; // continue
      }

      // Grab data
      if (value[key].constructor.name === "Array") {
        data.push(...value[key]);
      } else {
        data.push(value[key]);
      }
    });

    // Prepare to iterate again
    lastData = data;
    data = [];
  });
  return lastData;
}

export async function importRouteFromGpx(file, map) {
  const reader = new FileReader();
  reader.onabort = () => {
    console.log("File import read was aborted.");
    alert("Import cancelled.");
  };
  reader.onerror = () => {
    console.error("File import read failed.");
    alert("Import failed.");
  };
  reader.onload = async () => {
    const fileContents = reader.result;
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix : "@_"
    };
    const parser = new XMLParser(options);
    try {
      let result = parser.parse(fileContents);

      if (Object.hasOwn(result, "gpx")) {
        let buildingRouteFromWpts = false;
        let layers = []
        if (Object.hasOwn(result.gpx, "trk")) { // Use trk if available
          layers = ["trk", "trkseg", "trkpt"];
        } else if (Object.hasOwn(result.gpx, "rte")) { // If no trk, use rte
          layers = ["rte", "rtept"];
        } else if (Object.hasOwn(result.gpx, "wpt")) { // If no trk or rte, use wpt
          layers = ["wpt"];
          buildingRouteFromWpts = true;
        } else {
          console.error("Malformed GPX file. No trk, rte or wpt.");
          alert("Import failed. Malformed GPX.");
          return;
        }

        const parsedData = parseGpxLayer(layers, result.gpx);
        // `parsedData` should now be a list of items that contain lat/lon info
        // Convert data to a more usable format
        let points = parsedData.map(pt => {
          return [parseFloat(pt["@_lon"]), parseFloat(pt["@_lat"])]; // Lng, Lat
        });

        // Don't bother loading if less than 2 points
        if (points.length < 2) {
          console.error(`Not enough points in GPX file. Only ${points.length} points.`);
          alert("Import failed. Not enough points in GPX file.");
          return;
        }

        // If we didn't build the route from waypoints, add them as pins
        if (!buildingRouteFromWpts) {
          const parsedWpts = parseGpxLayer(["wpt"], result.gpx);
          for (const wpt of parsedWpts) {
            if (Object.hasOwn(wpt, "@_lat") && Object.hasOwn(wpt, "@_lon")) {
              addPinAtCoordinates(wpt["@_lat"], wpt["@_lon"], wpt["name"] || '');
            }
          }
        }

        await loadRouteFromPoints(points, map);
        return;
      } else {
        console.error("Malformed GPX file. Missing gpx field.");
        alert("Import failed. Malformed GPX.");
        return;
      }
    } catch(err){
      console.error("XML parsing failed.", err);
      alert("Import failed. Couldn't read file contents.");
    }
  }
  reader.readAsText(file);
}
