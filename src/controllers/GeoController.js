import lineChunk from '@turf/line-chunk'
import pointToLineDistance from "@turf/point-to-line-distance";

function getElevationChange(map, line, elevStart) {
  const chunks = lineChunk(line, 0.1/*km*/).features;
  let elevations = [ // In meters
    ...chunks.map((feature) => {
        return map.queryTerrainElevation(
            feature.geometry.coordinates[0],
            { exaggerated: false }
        );
    }),
    // do not forget the last coordinate
    map.queryTerrainElevation(
        chunks[chunks.length - 1].geometry.coordinates[1],
        { exaggerated: false }
    )
  ];

  // Fix a bug where if the start point is off screen, you'll get a bunch of
  // nulls back from queryTerrainElevation
  elevations.unshift(elevStart);
  elevations = elevations.filter(e => (e !== undefined && e != null));

  let up = 0.0;
  let down = 0.0;
  let prevEle;
  elevations.forEach((ele,i) => {
    if (i > 0) {
      const change = ele - prevEle;
      if (change < 0) {
        down += change;
      } else {
        up += change;
      }
    }
    prevEle = ele;
  });
  return [up, down];
}

function updateMarkerElevation(map, marker) {
  marker.elevation = map.queryTerrainElevation(
    marker.lngLat,
    { exaggerated: false }
  );
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

export {
  getElevationChange,
  updateMarkerElevation,
  splitLineWithPoint
}