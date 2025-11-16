import store from '../store/store';
import * as tilebelt from "@mapbox/tilebelt";
import lineChunk from '@turf/line-chunk'
import pointToLineDistance from "@turf/point-to-line-distance";
import LRUCache from '../utils/lruCache';
import { interpolateSpottyData } from '../utils/interpolate';

// Global cache for map DEM tiles
const tileCache = LRUCache;
const CACHE_SIZE = tileCache.cacheSize;

// Other globals
const DEFAULT_ZOOM = 14; // 14 zoom provides very good accuracy for elevation
const TILE_SIZE = 512; // Use 512 instead of default 256 (so we can do less fetching)


function getElevationChange(profile /* array of [distance, elevation] pairs */) {
  let eleUpTotal = 0.0;
  let eleDownTotal = 0.0;
  let prevEle;
  profile.map((el) => el[1])
      .filter(e => e !== null && e !== undefined)
      .forEach((ele, i) => {
    if (i > 0) {
      const change = ele - prevEle;
      if (change < 0) {
        eleDownTotal += change;
      } else {
        eleUpTotal += change;
      }
    }
    prevEle = ele;
  });
  return [eleUpTotal, eleDownTotal];
}

function splitLineWithPoint(lineToSplit, pointLngLat) {
  /*
    Split line around point

    Turf line-split doesn't always work here due to a known problem, so go with a super
    primitive approach of just finding the segment which the point is closest to. Luckily
    this works super well and pretty fast.

    Turf issues:
    https://github.com/Turfjs/turf/issues/2206
    https://github.com/Turfjs/turf/issues/852
  */

  const point = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: pointLngLat
    }
  };

  const ltsLen = lineToSplit.geometry.coordinates.length;
  let prevPt = lineToSplit.geometry.coordinates[ltsLen - 1];
  let minDist;
  let minDistIndex = -1;

  /*
    Search in reverse so that if a the line segment being split (lineToSplit)
    overlaps itself (only possible on import) the later segment, and thus the
    top-rendered one will be returned.
  */
  for (let i = ltsLen - 2; i >= 0; i--) {
    let coords = lineToSplit.geometry.coordinates[i];
    let tempLine = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [coords, prevPt] // prevPt 2nd b/c we're iterating in reverse (doesn't really matter)
      }
    };
    let ptToLineDist = pointToLineDistance(point, tempLine);
    if ((minDistIndex < 0) || (ptToLineDist < minDist)) {
      minDist = ptToLineDist;
      minDistIndex = i;
    }
    prevPt = coords;
  }

  // Get 2 new coordinate sets
  let lCoords = lineToSplit.geometry.coordinates.slice(0, minDistIndex + 1);
  let rCoords = lineToSplit.geometry.coordinates.slice(minDistIndex + 1);
  lCoords.push(pointLngLat);
  rCoords.unshift(pointLngLat);

  return [lCoords, rCoords];
}

function markersAreCloseEnough(marker1, marker2, epsilon) {
  return Math.abs(marker1.lngLat[0] - marker2.lngLat[0]) < epsilon && Math.abs(marker1.lngLat[1] - marker2.lngLat[1]) < epsilon;
}

//////////////////////////////////////////////////////////////////////////////
// Everything below this is for querying elevation data
// We use the mapbox Raster Tile API for elevation
// https://docs.mapbox.com/data/tilesets/guides/access-elevation-data/#use-the-raster-tiles-api
//////////////////////////////////////////////////////////////////////////////

async function getElevationDataForRoute(geojson, distance) {
  if (geojson.features.length === 0) return [];

  // - If distance less than a mile, sample at 0.05km intervals
  // - If distance more than a mile, sample at 0.1km intervals
  let chunkSize = 0.1; // km
  if (distance <= 1) { // mile
    chunkSize = 0.05;
  }

  // Merge all features of geojson into a single feature, making sure not to add duplicate coordinates
  // This is to make the results of turf's lineChunk() cleaner
  let mergedFeature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  };
  geojson.features.forEach((feature, i) => {
    if (i === 0) {
      mergedFeature.geometry.coordinates.push(...feature.geometry.coordinates);
    } else {
      const allButFirstCoords = feature.geometry.coordinates.slice(1);
      mergedFeature.geometry.coordinates.push(...allButFirstCoords);
    }
  });
  const mergedGeojson = {
    'type': 'FeatureCollection',
    'features': [mergedFeature]
  };

  const chunks = lineChunk(mergedGeojson, chunkSize).features;
  let points = chunks.map((feature) => feature.geometry.coordinates[0]);
  points.push(chunks[chunks.length - 1].geometry.coordinates[1]);
  const elevations = await getElevationsForPoints(points);

  let elevationsWithDistances = elevations.map((el, index) => [(index * chunkSize) / 1.609344, el])
  elevationsWithDistances[elevationsWithDistances.length - 1][0] = distance; // Just in case it wasn't even (it usually is not)

  return elevationsWithDistances;
}

// Fetch + decode a map DEM tile
async function fetchTile(tileKey /** `${z}/${x}/${y}` */, mapboxToken, returnCode = false) {
  if (tileCache.has(tileKey)) return (returnCode ? 200 : tileCache.get(tileKey));
  // Note: @2x grabs 512x512 tiles instead of default 256x256 (so we can do less fetching)
  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${tileKey}@2x.pngraw?access_token=${mapboxToken}`;

  let blob = null;
  try {
    blob = await fetch(url);
    if (!blob.ok) {
      console.error('Fetch file returned not ok:', blob.status, blob.statusText, await blob.text());
      return (returnCode ? blob.status : null);
    }
    blob = await blob.blob();
  } catch (err) {
    console.error('Error fetching tile:', err);
    return (returnCode ? 500 : null);
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);

  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const tile = { data: imageData.data, width: bitmap.width, height: bitmap.height };
  tileCache.set(tileKey, tile);
  return (returnCode ? 200 : tile);
}

// Decode RGB -> elevation (per the mapbox docs)
// This is to get elevation in meters at a pixel from RGB value of that pixel
function decodeElevation(R, G, B) {
  return -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
}

// Bilinear interpolation sampling
// Get's more accurate elevation than simply finding the nearest pixel
function sampleElevationBilinear(tile, px, py) {
  const { data, width, height } = tile;

  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);

  const dx = px - x0;
  const dy = py - y0;

  const getElev = (x, y) => {
    const i = (y * width + x) * 4;
    return decodeElevation(data[i], data[i + 1], data[i + 2]); // R, G, B
  };

  const e00 = getElev(x0, y0);
  const e10 = getElev(x1, y0);
  const e01 = getElev(x0, y1);
  const e11 = getElev(x1, y1);

  return (
    e00 * (1 - dx) * (1 - dy) +
    e10 * dx * (1 - dy) +
    e01 * (1 - dx) * dy +
    e11 * dx * dy
  );
}

// Get elevation for one coordinate
async function getElevation(lon, lat, zoom, mapboxToken) {
  // Get fractional tile position
  const [xFloat, yFloat] = tilebelt.pointToTileFraction(lon, lat, zoom);
  const tileX = Math.floor(xFloat);
  const tileY = Math.floor(yFloat);

  // Get pixel offset inside tile
  const px = (xFloat - tileX) * TILE_SIZE;
  const py = (yFloat - tileY) * TILE_SIZE;

  const tile = await fetchTile(`${zoom}/${tileX}/${tileY}`, mapboxToken);
  if (!tile) return null;
  return sampleElevationBilinear(tile, px, py) * 3.28084; // Convert to feet
}

// Bulk sampling
async function getElevationsForPoints(coords) {
  const state = store.getState();
  const mapboxToken = state.map.mapboxToken;
  let neededTiles; // = new Set()
  let tileToCoordsMap; // = {}
  let zoom = DEFAULT_ZOOM + 1;

  // Collect all required tiles
  // We reduce zoom until we get less than 100 tiles. This reduces accuracy, but greatly improves speed
  //  for really long routes. And you'll never notice the difference on the graph.
  do {
    neededTiles = new Set();
    tileToCoordsMap = {};
    zoom--;
    for (const [i, [lon, lat]] of coords.entries()) {
      const [x, y] = tilebelt.pointToTile(lon, lat, zoom);
      const tileKey = `${zoom}/${x}/${y}`;
      neededTiles.add(tileKey);
      tileToCoordsMap[tileKey] = tileToCoordsMap[tileKey] || [];
      tileToCoordsMap[tileKey].push(i);
    }
  } while (neededTiles.size > 100);

  let results = new Array(coords.length).fill(0);
  // Break tile loading into buckets if we need more than the cache can hold
  // Because of new code above to reduce zoom, we don't actually need this... but I like it
  const buckets = [];
  for (let i = 0; i < neededTiles.size; i += CACHE_SIZE) {
    buckets.push(Array.from(neededTiles).slice(i, i + CACHE_SIZE));
  }

  for (const bucket of buckets) {
    const tileCodes = await Promise.all(bucket.map(async (key) => {
      return fetchTile(key, mapboxToken, true /** returnCode */);
    }));

    // Build a map of tile status codes
    // 200 = we have it or can get it
    // 404 = It does not exist, don't try again
    // 500/etc. = We failed to get it for some reason, but it might exist (try again)
    const tileCodeMap = {};
    bucket.forEach((key, index) => {
      tileCodeMap[key] = tileCodes[index];
    });

    // Now we should have all the tiles in the cache
    for (const tileKey of bucket) {
      for (const index of tileToCoordsMap[tileKey]) {
        // Happens a lot when point is over water for example
        if (tileCodeMap[tileKey] === 404) {
          results[index] = 0.0; // Set to 0.0 to indicate no elevation data available
          continue;
        }
        const [lon, lat] = coords[index];
        results[index] = await getElevation(lon, lat, zoom, mapboxToken);
      }
    }
  }

  // Clean any nulls in results by interpolating between the nearest non-null points
  // Should happen very infrequently
  results = interpolateSpottyData(results);

  return results;
}

export {
  getElevationChange,
  splitLineWithPoint,
  markersAreCloseEnough,
  getElevationDataForRoute,
  // Don't need to export the internal elevation functions
}