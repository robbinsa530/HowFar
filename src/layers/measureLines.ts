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
      'line-color': [
          'case',
          [ '==', ['get', 'editing'], true ],
          '#808080',  // gray color when 'editing' property is true
          '#074dd9'   // default blue color
      ],
      'line-width': 5,
      'line-opacity': [
        'case',
        [ '==', ['get', 'editing'], true ],
        0.4,  // lighter opacity when 'editing' property is true
        0.65   // default opacity slightly higher
      ]
  },
  filter: ['in', '$type', 'LineString']
};

// Pretty much the same as the regular measure lines layer,
//  but will be attached to the editing geojson with a new id
export const editingMeasureLinesLayer: LayerProps = {
  id: 'editing-measure-lines',
  type: 'line',
  // source: 'editingGeojson',
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

// Dashed... Maybe? Idk. Keeping this comment so I don't forget this is possible
// Can be paired with the "case" so only sometimes...
// 'line-dasharray': [1, 1.5]