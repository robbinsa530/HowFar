import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import './Map.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiYXJvYmJpbnM1MzAiLCJhIjoiY2x1b2xzOGNtMXhpMTJrbGQ2YnA0bDlhcSJ9.jyhalVCpoVufi45_mrB-zw';

let markers = [];

function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-104.9);
  const [lat, setLat] = useState(39.8);
  const [zoom, setZoom] = useState(12);

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

    // For displaying current location
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    // Place a marker on click
    map.current.on('click', e => {
      // Only add marker if click was NOT on an existing marker
      if (!markers.includes(e.originalEvent.target)) {
        // Create a new DOM node and save it to a React ref
        const ref = React.createRef();
        ref.current = document.createElement('div');
        markers.push(ref.current);
      
        // Create a Mapbox Marker at our new DOM node
        new mapboxgl.Marker({
          className: "marker",
          element: ref.current,
          draggable: true
        }).setLngLat(e.lngLat)
          .setPopup(new mapboxgl.Popup().setText("TODO: Make this do something"))
          .addTo(map.current);
      }

      // Clean up on unmount
      return () => map.remove();
    });
  });

  return (
    <div className="Map">
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default Map;
