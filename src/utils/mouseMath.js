// Return distance between a mouse event and the add-new-markrt
// Returns squared distance for faster computing
export function getMouseToMarkerSqDistance(screenPoint, map, markerLngLat/*[lng, lat]*/) {
  const markerPt = map.project(markerLngLat); // LngLat -> X/Y
  const xDist = (screenPoint.x - markerPt.x);
  const yDist = (screenPoint.y - markerPt.y);
  return (xDist*xDist) + (yDist*yDist);
}
