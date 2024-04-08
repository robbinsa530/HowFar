import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import length from '@turf/length'
import './Map.css';

import publicKey from './secrets/mapbox.public';
mapboxgl.accessToken = publicKey;

/*
marker:
{
  id:,
  element:,
  lngLat:,
  markerObj:,
}
*/
let markers = [];

const geojson = {
  'type': 'FeatureCollection',
  'features': []
};

// Used to draw a line between points
const linestring = {
  'type': 'Feature',
  'geometry': {
      'type': 'LineString',
      'coordinates': []
  }
};

function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-104.9);
  const [lat, setLat] = useState(39.8);
  const [zoom, setZoom] = useState(12);
  const [dist, setDist] = useState(0.0);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });

    // Default cursor should be pointer
    map.current.getCanvas().style.cursor = 'crosshair';

    // Add zoom control and geolocate
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.current.addControl(new mapboxgl.GeolocateControl({showAccuracyCircle: false, showUserLocation: false}));

    map.current.on('load', () => {
      map.current.addSource('geojson', {
        'type': 'geojson',
        'data': geojson
      });
  
      // Add styles to the map
      map.current.addLayer({
        id: 'measure-lines',
        type: 'line',
        source: 'geojson',
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
      });

      // Define helper function for drawing lines
      function redrawLines() {
        linestring.geometry.coordinates = markers.map(
            m => m.lngLat
        );

        geojson.features.push(linestring);

        const distance = length(linestring, {units: 'miles'});
        setDist(distance);
      }

      // Place a marker on click
      map.current.on('click', e => {
        // Remove the linestring from the group
        // so we can redraw it based on the points collection.
        if (geojson.features.length) {
          geojson.features.pop();
        }

        // If anything but a point was clicked, add a new one
        if (!markers.map(m => m.element).includes(e.originalEvent.target)) {
          // Create a new DOM node and save it to a React ref
          const ref = React.createRef();
          ref.current = document.createElement('div');
          const idToUse = String(new Date().getTime());
          
          // Create a Mapbox Marker at our new DOM node
          const divRef = React.createRef();
          const btnRef = React.createRef();
          divRef.current = document.createElement('div');
          btnRef.current = document.createElement('div');
          btnRef.current.innerHTML = '<button class="marker-popup-btn">Delete point</button>';
          divRef.current.innerHTML = '<div></div>';
          divRef.current.appendChild(btnRef.current);
          btnRef.current.addEventListener('click', (e) => {
            markers.find(el => el.id == idToUse).markerObj.remove();
            markers = markers.filter(
                m => m.id !== idToUse
            );
            if (markers.length > 1) {
              redrawLines();
            } else {
              geojson.features = [];
              setDist(0);
            }
            map.current.getSource('geojson').setData(geojson);
          });
          let addedMarker = new mapboxgl.Marker({
            className: "marker",
            element: ref.current,
            draggable: true
          }).setLngLat(e.lngLat)
            .setPopup(new mapboxgl.Popup().setDOMContent(divRef.current))
            .addTo(map.current);

            addedMarker.on('dragend', (e) => {
              markers.find(el => el.id == idToUse).lngLat = [e.target._lngLat.lng, e.target._lngLat.lat];
              if (markers.length > 1) {
                redrawLines();
                map.current.getSource('geojson').setData(geojson);
              }
            });

            markers.push({
              id: idToUse,
              element: ref.current,
              lngLat: [e.lngLat.lng, e.lngLat.lat],
              markerObj: addedMarker
            });
        }

        if (markers.length > 1) {
          redrawLines();
        }

        map.current.getSource('geojson').setData(geojson);

        // Clean up on unmount
        return () => map.remove();
      });
    });

    // For displaying current location
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });
  });

  return (
    <div className="Map">
      <div className="sidebar">
        Longitude: {Number(lng).toFixed(4)} | Latitude: {Number(lat).toFixed(4)} | Zoom: {Number(zoom).toFixed(2)}
        <br/><br/>
        Distance: {dist.toFixed(2)} Miles
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default Map;
