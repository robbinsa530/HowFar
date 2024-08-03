import lineChunk from '@turf/line-chunk'

export function getElevationChange(map, line, elevStart) {
  const chunks = lineChunk(line, 0.02/*km*/).features;
  let elevations = [ // In meters
    ...chunks.map((feature) => {
        return map.current.queryTerrainElevation(
            feature.geometry.coordinates[0],
            { exaggerated: false }
        );
    }),
    // do not forget the last coordinate
    map.current.queryTerrainElevation(
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

export function updateMarkerElevation(map, marker) {
  marker.elevation = map.current.queryTerrainElevation(
    marker.lngLat,
    { exaggerated: false }
  );
}