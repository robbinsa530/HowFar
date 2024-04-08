import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import './Map.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiYXJvYmJpbnM1MzAiLCJhIjoiY2x1b2xzOGNtMXhpMTJrbGQ2YnA0bDlhcSJ9.jyhalVCpoVufi45_mrB-zw';


function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-70.9);
  const [lat, setLat] = useState(42.35);
  const [zoom, setZoom] = useState(9);

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

    // For displaying current location
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    // Place a marker on click
    map.current.on('click', e => {
      // Create a new DOM node and save it to a React ref
      const ref = React.createRef();
      ref.current = document.createElement('div');
    
      // Create a Mapbox Marker at our new DOM node
      new mapboxgl.Marker({
        className: "marker", 
        element: ref.current,
        draggable: true
      })
        .setLngLat(e.lngLat)
        .addTo(map.current);

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
