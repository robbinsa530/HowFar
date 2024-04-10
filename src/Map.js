import React, { useRef, useCallback, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import length from '@turf/length'
import { v4 as uuidv4 } from 'uuid';
import UndoIcon from '@mui/icons-material/Undo';
import ClearIcon from '@mui/icons-material/Clear';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';

import './Map.css';
import AreYouSureDialog from './components/AreYouSureDialog'
import LoadingDialog from './components/LoadingDialog'
import BlueSwitch from './components/BlueSwitch'
import { handleLeftRightClick } from './controllers/MapActionController';
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
  const [autoFollowRoads, setAutoFollowRoads] = useState(true);
  const [rightClickEnabled, setRightClickEnabled] = useState(true);
  const autoFollowRoadsRef = React.useRef(autoFollowRoads);
  const rightClickEnabledRef = React.useRef(rightClickEnabled);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [dist, setDist] = useState(0.0);

  const handleSwitchAutoFollowRoads = useCallback((event) => {
    setAutoFollowRoads(event.target.checked);
    autoFollowRoadsRef.current = event.target.checked;
  }, []);

  const handleSwitchRightClickEnabled = useCallback((event) => {
    setRightClickEnabled(event.target.checked);
    rightClickEnabledRef.current = event.target.checked;
  }, []);

  async function getDirections(lngLatStart, lngLatEnd, calculateDirectionsOverride=undefined) {
    const calculateDirections = (calculateDirectionsOverride !== undefined) ?
                                  calculateDirectionsOverride
                                  : autoFollowRoadsRef.current;
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

      /* There's a fun bug where if you're not auto-following roads and have the last point of
          your route going through a field or something (anywhere off road/path), then enable
          auto-follow roads and click on a road, the directions API will give you a route starting
          at the nearest point on a road/path and ignore the distance in between that start and your
          last point. MapMyRun has this issue too actually. This fixes that for sufficiently large gaps.
      */
      let tempLine = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [lngLatStart, newLine.geometry.coordinates[0]]
        }
      }
      const distBtwn = length(tempLine, {units: 'miles'});
      if (distBtwn > 0.01) {
        // Add segment to lineString and update distance
        newLine.geometry.coordinates.unshift(lngLatStart);
        newLine.properties.distance += distBtwn;
      }
    }
    return newLine;
  }

  useEffect(() => {
    if (!map.current) { // initialize map only once
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        // style: 'mapbox://styles/mapbox/satellite-streets-v12',
        // style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-104.959730, 39.765733],
        zoom: 14
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
      });

      // Place a marker on click
      map.current.on('click', async e => {
        await handleLeftRightClick(
          e,
          markers,
          geojson,
          map,
          () => {setDist(updateDistanceState())},
          getDirections,
          false // rightClick bool
        );
      });

      map.current.on('contextmenu', async e => {
        if (rightClickEnabledRef.current) {
          await handleLeftRightClick(
            e,
            markers,
            geojson,
            map,
            () => {setDist(updateDistanceState())},
            getDirections,
            true // rightClick bool
          );
        }
      });
    }

    // Clean up
    // * I think b/c of all the re-renders in react, this breaks stuff
    // return () =>  map.current.remove(); 
  }, []);

  return (
    <div className="Map">
      <div className="sidebar">
        <p className="sidebar-distance">Distance: {dist.toFixed(2)} Miles</p>
        <hr/>

        <Stack className="sidebar-btn-container" spacing={2} direction="row">
          <Button variant="contained" onClick={() => setClearMap(true) } startIcon={<ClearIcon />}>Clear</Button>
          <Button variant="contained" onClick={()=>{}} startIcon={<UndoIcon />}>Undo</Button>
        </Stack>


        <FormControl component="fieldset">
          <FormGroup aria-label="boolean-switches">
            <FormControlLabel
              value="auto-follow-roads"
              control={
                <BlueSwitch checked={autoFollowRoads} onChange={handleSwitchAutoFollowRoads} name="autoFollowRoads"/>
              }
              label="Auto follow roads"
              labelPlacement="start"
            />
            <FormControlLabel
              value={"right-click-enabled"}
              control={
                <BlueSwitch checked={rightClickEnabled} onChange={handleSwitchRightClickEnabled} name="rightClickEnabled"/>
              }
              label="Right click enabled"
              labelPlacement="start"
            />
          </FormGroup>
        </FormControl>

      </div>
      <div ref={mapContainer} className="map-container" />
      { loading && <LoadingDialog open={loading} /> }
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
