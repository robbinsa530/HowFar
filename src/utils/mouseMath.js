// Return distance between a mouse event and the add-new-markrt
// Returns squared distance for faster computing
export function getMouseToMarkerSqDistance(event, map, markerLngLat/*[lng, lat]*/) {
  const markerPt = map.project(markerLngLat); // LngLat -> X/Y
  const xDist = (event.point.x - markerPt.x);
  const yDist = (event.point.y - markerPt.y);
  return (xDist*xDist) + (yDist*yDist);
}
