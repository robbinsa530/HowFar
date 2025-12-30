import along from '@turf/along';

function findTargetLine(distance, geojson) {
  let totalDistance = 0;
  for (const feature of geojson.features) {
    const newTotalDistance = totalDistance + feature.properties.distance;
    if (newTotalDistance >= distance) {
      return [feature, distance - totalDistance];
    }
    totalDistance = newTotalDistance;
  }
  console.warn('Elevation Profile: Hover distance is past end of route somehow.');
  const lastLine = geojson.features[geojson.features.length - 1];
  const distAlongLastLine = distance - (totalDistance - lastLine.properties.distance); // Will be past end of last line, but may as well return actual value
  return [lastLine, distAlongLastLine];
}

export function getPositionFromDistanceAlongRoute(distance, geojson) {
  const [lineToUse, distanceAlongLine] = findTargetLine(distance, geojson);
  const point = along(lineToUse, distanceAlongLine, { units: 'miles' });
  return [point.geometry.coordinates[0], point.geometry.coordinates[1]];
}
