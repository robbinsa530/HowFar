import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import length from '@turf/length'
import { v4 as uuidv4 } from 'uuid';
import UndoIcon from '@mui/icons-material/Undo';
import ClearIcon from '@mui/icons-material/Clear';
import './Map.css';

import AreYouSureDialog from './components/AreYouSureDialog'
import { getRouteBetweenPoints } from './controllers/DirectionsController';

import publicKey from './secrets/mapbox.public';
mapboxgl.accessToken = publicKey;

/*
marker:
{
  id:,
  element:,
  lngLat:,
  markerObj:,
  associatedLines,
}
*/
let markers = [];

const geojson = {
  'type': 'FeatureCollection',
  'features': []
};

async function getDirections(lngLatStart, lngLatEnd, calculateDirections=true) {
  let jsonData;
  if (calculateDirections) {
    jsonData = await getRouteBetweenPoints(
      lngLatStart,
      lngLatEnd,
      mapboxgl.accessToken
    );
  }
  let newLine = { // To be returned
    type: 'Feature',
    properties: {
      id: uuidv4(),
      // distance: (Needs to be added)
    },
    geometry: {
      type: 'LineString',
      // coordinates: (Needs to be added)
    }
  };
  if (!calculateDirections || jsonData.routes.length === 0) {
    if (calculateDirections) { alert("Failed to calculate directions"); }
    // Default to direct distance/lines
    newLine.geometry.coordinates = [lngLatStart, lngLatEnd];
    newLine.properties.distance = length(newLine, {units: 'miles'});
  }
  else {
    const route = jsonData.routes[0]; // Will always be a single route
    newLine.properties.distance = route.distance / 1609.344; // Convert dist from meters to miles
    newLine.geometry.coordinates = route.geometry.coordinates;
  }
  return newLine;
}

function updateDistanceState() {
  return geojson.features.map(line => line.properties.distance).reduce((a,b) => a+b, 0);
}

function handleClearMap() {
  // Clear markers/lines
  markers.forEach(m => m.markerObj.remove());
  markers = [];
  geojson.features = [];
}

function Map() {
  const [loading, setLoading] = useState(true);
  const [clearMap, setClearMap] = useState(false);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-104.959730  );
  const [lat, setLat] = useState(39.765733);
  const [zoom, setZoom] = useState(14);
  const [dist, setDist] = useState(0.0);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      // style: 'mapbox://styles/mapbox/satellite-streets-v12',
      // style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [lng, lat],
      zoom: zoom
    });

    // Default cursor should be pointer
    map.current.getCanvas().style.cursor = 'crosshair';

    // Add zoom control and geolocate
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.current.addControl(new mapboxgl.GeolocateControl({showAccuracyCircle: false, showUserLocation: false}), "bottom-right");

    map.current.on('load', () => {
      setLoading(false);
      console.info("Map loaded. Adding routing functionality.");
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

      async function handleLeftRightClick(e, calculateDirections) {
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
          btnRef.current.addEventListener('click', async (e) => {
            let markerToRemoveIndex = markers.findIndex(el => el.id === idToUse);
            let markerToRemove = markers[markerToRemoveIndex];
            markerToRemove.markerObj.remove();
            markers = markers.filter(
                m => m.id !== idToUse
            );
            if (markers.length > 1) {
              // Marker removed. Update all associated lines
              if (markerToRemove.associatedLines.length === 1) {
                // End point. Remove associated line, update new end point
                const lineToRemove = markerToRemove.associatedLines[0];
                geojson.features = geojson.features.filter(
                  f => f.properties.id !== lineToRemove
                );

                // Remove all references to the deleted line from all markers
                markers.forEach((m,i) => {
                  markers[i].associatedLines = m.associatedLines.filter(
                    l => l !== lineToRemove
                  );
                });
              }
              else if (markerToRemove.associatedLines.length > 1) {
                // Middle point. Remove associated lines, reroute, update
                const linesToRemove = markerToRemove.associatedLines;
                geojson.features = geojson.features.filter(
                  f => !linesToRemove.includes(f.properties.id)
                );

                // Remove all references to the deleted line from affected markers
                const lMarker = markers[markerToRemoveIndex - 1];
                const rMarker = markers[markerToRemoveIndex /*+ 1*/]; // Don't need to +1 b/c marker has already been removed
                lMarker.associatedLines = lMarker.associatedLines.filter(l => !linesToRemove.includes(l));
                rMarker.associatedLines = rMarker.associatedLines.filter(l => !linesToRemove.includes(l));

                // Calculate new route
                const newLine = await getDirections(lMarker.lngLat, rMarker.lngLat);
                geojson.features.push(newLine);

                // Update markers at ends of new line with line's id
                lMarker.associatedLines.push(newLine.properties.id);
                rMarker.associatedLines.push(newLine.properties.id);
              }
              else if (markerToRemove.associatedLines.length === 0) {
                // Should never happen...
                alert("Error deleting point.");
                console.error("Multiple markers exist after removal, but removed marker had no associated lines. Not sure how that happened...");
              }
            } else {
              geojson.features = [];
              markers.forEach((_,i) => {
                markers[i].associatedLines = [];
              });
            }
            setDist(updateDistanceState());
            map.current.getSource('geojson').setData(geojson);
          });

          let markerToAdd = {
            id: idToUse,
            element: ref.current,
            lngLat: [e.lngLat.lng, e.lngLat.lat],
            associatedLines: []
            // markerObj: (Needs to be added)
          };

          // If theres already 1+ markers, calculate directions/distance
          if (markers.length + 1 > 1) {
            let prevPt = markers[markers.length-1];
            const newLine = await getDirections(
              [prevPt.lngLat[0], prevPt.lngLat[1]],
              markerToAdd.lngLat,
              calculateDirections
            );
            // Associate this new line with both of its endpoint markers
            // This is so we can know which lines to edit on marker delete/move
            prevPt.associatedLines.push(newLine.properties.id); // markers[markers.length-2]
            markerToAdd.associatedLines.push(newLine.properties.id);

            // Update position of marker. This is in case click wasn't on a road or path,
            // the API will return the closest point to a road or path. That's what we wanna use
            markerToAdd.lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length -1];

            if (markers.length == 1) { // Only on the second point, make sure we update the first too
              markers[0].markerObj.setLngLat(newLine.geometry.coordinates[0]);
              markers[0].lngLat = newLine.geometry.coordinates[0];
            }

            geojson.features.push(newLine);
            setDist(updateDistanceState())

            // Redraw lines on map
            map.current.getSource('geojson').setData(geojson);
          }

          let addedMarker = new mapboxgl.Marker({
            className: "marker",
            element: ref.current,
            draggable: true
          }).setLngLat(markerToAdd.lngLat)
            .setPopup(new mapboxgl.Popup().setDOMContent(divRef.current))
            .addTo(map.current);

          // Add marker to running list
          markerToAdd.markerObj = addedMarker;
          markers.push(markerToAdd);

          addedMarker.on('dragend', async (e) => {
            let draggedMarkerIndex = markers.findIndex(el => el.id === idToUse);
            let draggedMarker = markers[draggedMarkerIndex];
            draggedMarker.lngLat = [e.target._lngLat.lng, e.target._lngLat.lat];
            if (markers.length > 1) {
              if (draggedMarker.associatedLines.length >= 1) {
                // Edit 1 or 2 associated lines
                let linesToEdit = [];
                draggedMarker.associatedLines.forEach(l => {
                  linesToEdit.push(geojson.features.find(f => f.properties.id === l));
                });

                for (const [i, l] of linesToEdit.entries()) { // CANNOT use .forEach here b/c async
                  // Find other marker associated with line
                  const otherMarkerIndex = markers.findIndex(m => m.id !== idToUse && m.associatedLines.includes(l.properties.id));

                  // Replace old line with new one
                  const sIndex = Math.min(draggedMarkerIndex, otherMarkerIndex);
                  const eIndex = Math.max(draggedMarkerIndex, otherMarkerIndex);
                  const newLine = await getDirections(markers[sIndex].lngLat, markers[eIndex].lngLat);
                  linesToEdit[i].properties.distance = newLine.properties.distance;
                  linesToEdit[i].geometry.coordinates = newLine.geometry.coordinates;

                  // Update position of marker. This is in case it wasn't dragged onto a road or path,
                  // the API will return the closest point to a road or path. That's what we wanna use
                  if (i == 0) {
                    const coordIndex = (draggedMarkerIndex < otherMarkerIndex) ? 0 : newLine.geometry.coordinates.length -1;
                    draggedMarker.markerObj.setLngLat(newLine.geometry.coordinates[coordIndex]);
                    draggedMarker.lngLat = newLine.geometry.coordinates[coordIndex];
                  }
                }
              }
              else if (draggedMarker.associatedLines.length === 0) {
                // Should never happen...
                alert("Error moving point.");
                console.error("Multiple markers exist, but dragged marker had no associated lines. Not sure how that happened...");
              }
              setDist(updateDistanceState())
              map.current.getSource('geojson').setData(geojson);
            }
          });
        }
      }

      // Place a marker on click
      map.current.on('click', async e => {
        await handleLeftRightClick(e, true);
        // Clean up on unmount
        return () => map.remove();
      });

      map.current.on('contextmenu', async e => {
        await handleLeftRightClick(e, false);
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
        <p className="sidebar-distance">Distance: {dist.toFixed(2)} Miles</p>
        <hr/>
        <div>
          <button onClick={() => setClearMap(true) } className="sidebar-btn clear-btn">
            <div>
              <ClearIcon /> 
              <p>Clear</p>
            </div>
            </button>
          <button onClick={()=>{}} className="sidebar-btn undo-btn">
            <div>
              <UndoIcon />
              <p>Undo</p>
            </div>
          </button>
        </div>
      </div>
      <div ref={mapContainer} className="map-container" />
      { loading && <div className="dialog loading-dialog">Loading...</div> }
      { clearMap && <AreYouSureDialog
          open={clearMap}
          onYes={() => { 
            setClearMap(false);
            handleClearMap();
            setDist(updateDistanceState());
            map.current.getSource('geojson').setData(geojson); // Reload UI
          }} 
          onNo={() => setClearMap(false)} 
        /> }
    </div>
  );
}

export default Map;
