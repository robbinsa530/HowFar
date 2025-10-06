import type {LayerProps} from 'react-map-gl/mapbox';

export const measureLinesLayer: LayerProps = {
  id: 'measure-lines',
  type: 'line',
  // source: 'geojson',
  layout: {
      'line-cap': 'round',
      'line-join': 'round'
  },
  paint: {
      'line-color': '#074dd9',
      'line-width': 5,
      'line-opacity': 0.65
  },
  filter: ['in', '$type', 'LineString']
};