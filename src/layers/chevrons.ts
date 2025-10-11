import type {LayerProps} from 'react-map-gl/mapbox';

export const chevronsLayer1: LayerProps = {
  id: 'arrow-overlay',
  type: 'symbol',
  layout: {
    'symbol-placement': 'line',
    'symbol-spacing': 100,          // distance between chevrons in pixels
    'icon-image': 'chevron',        // must match the ID of your loaded sprite
    'icon-size': 0.18,              // scale the chevron
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-rotation-alignment': 'map' // makes the icon follow the line direction
  },
  paint: {
    'icon-opacity': 1.0,
  },
  filter: ['in', '$type', 'LineString']
};

export const chevronsLayer2: LayerProps = {
  id: 'other-arrow-overlay',
  type: 'symbol',
  layout: {
    'symbol-placement': 'line',
    'symbol-spacing': 100,          // distance between chevrons in pixels
    'icon-image': 'chevron',        // must match the ID of your loaded sprite
    'icon-size': 0.18,              // scale the chevron
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-rotation-alignment': 'map' // makes the icon follow the line direction
  },
  paint: {
    'icon-opacity': 1.0,
  },
  filter: ['in', '$type', 'LineString']
};