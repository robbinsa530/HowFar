/**
 * Calculates the display position for a pin, clamping it to the edge of the viewport
 * if it's outside the visible bounds. If the pin is off to the side, it appears at
 * the edge at the same latitude. If it's off diagonally, it appears in the corner.
 * 
 * @param {Object} map - The mapbox map instance
 * @param {Object} pin - The pin object
 * @returns {Object} - { longitude, latitude, isOnEdge: boolean }
 */
export function getPinDisplayPosition(map, pin) {
  const pinLngLat = pin.lngLat;
  // Get pin size from SVG element if it exists, otherwise use default
  const pinHeight = document.getElementById(`pin-${pin.id}`)?.getBoundingClientRect().height || 34;
  const pinWidth = document.getElementById(`pin-${pin.id}`)?.getBoundingClientRect().width || 23;

  if (!map) {
    return { longitude: pinLngLat[0], latitude: pinLngLat[1], isOnEdge: false };
  }

  // Get the pin's position in screen coordinates (in CSS pixels)
  const pinScreenCoords = map.project(pinLngLat);

  // Get viewport dimensions in CSS pixels (not device pixels)
  const container = map.getContainer();
  const viewportWidth = container.clientWidth;
  const viewportHeight = container.clientHeight;

  // Pin is centered, so it extends half its size in each direction
  // Leave a small amount visible (e.g., 5px) when clamping to edge
  const halfPinWidth = pinWidth / 2;
  const halfPinHeight = pinHeight / 2;
  const visiblePadding = 5; // Keep 5px of the pin visible
  const paddingX = halfPinWidth - visiblePadding;
  const paddingY = halfPinHeight - visiblePadding;

  // Check if pin is within the safe zone (not at the clamping boundary)
  if (pinScreenCoords.x >= paddingX && pinScreenCoords.x <= viewportWidth - paddingX &&
      pinScreenCoords.y >= paddingY && pinScreenCoords.y <= viewportHeight - paddingY) {
    // Pin is in the safe zone, return original coordinates
    return { longitude: pinLngLat[0], latitude: pinLngLat[1], isOnEdge: false };
  }

  // Pin is outside viewport - clamp to viewport edges with padding
  // This keeps the pin "in line" with its actual position while preventing excessive cropping
  const clampedX = Math.max(paddingX, Math.min(viewportWidth - paddingX, pinScreenCoords.x));
  const clampedY = Math.max(paddingY, Math.min(viewportHeight - paddingY, pinScreenCoords.y));

  // Convert clamped screen coordinates back to lng/lat
  const edgeLngLat = map.unproject([clampedX, clampedY]);

  return {
    longitude: edgeLngLat.lng,
    latitude: edgeLngLat.lat,
    isOnEdge: true
  };
}

