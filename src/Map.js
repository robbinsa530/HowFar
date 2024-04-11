import React, { useRef, useCallback, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import length from '@turf/length'
import lineChunk from '@turf/line-chunk'
import { v4 as uuidv4 } from 'uuid';
import UndoIcon from '@mui/icons-material/Undo';
import ClearIcon from '@mui/icons-material/Clear';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

import './Map.css';
import AreYouSureDialog from './components/AreYouSureDialog'
import LoadingDialog from './components/LoadingDialog'
import BlueSwitch from './components/BlueSwitch'
import BlueRadio from './components/BlueRadio'
import BlueSelect from './components/BlueSelect'
import BlueSlider from './components/BlueSlider'
import { handleLeftRightClick } from './controllers/MapActionController';
import { getRouteBetweenPoints } from './controllers/DirectionsController';

import publicKey from './secrets/mapbox.public';
mapboxgl.accessToken = publicKey;

const mapTypes = [
  'mapbox://styles/mapbox/streets-v12',
  'mapbox://styles/mapbox/outdoors-v12',
  'mapbox://styles/mapbox/satellite-streets-v12'
];

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
  const [addToStartOrEnd, setAddToStartOrEnd] = useState("add-to-end");
  const [mapType, setMapType] = useState(0);
  const [walkwayBias, setWalkwayBias] = useState(0);
  const autoFollowRoadsRef = React.useRef(autoFollowRoads);
  const rightClickEnabledRef = React.useRef(rightClickEnabled);
  const addToStartOrEndRef = React.useRef(addToStartOrEnd);
  const walkwayBiasRef = React.useRef(walkwayBias);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [dist, setDist] = useState(0.0);
  const [eleUp, setEleUp] = useState(0.0);
  const [eleDown, setEleDown] = useState(0.0);

  const handleSwitchAutoFollowRoads = useCallback((event) => {
    setAutoFollowRoads(event.target.checked);
    autoFollowRoadsRef.current = event.target.checked;
  }, []);

  const handleSwitchRightClickEnabled = useCallback((event) => {
    setRightClickEnabled(event.target.checked);
    rightClickEnabledRef.current = event.target.checked;
  }, []);

  const handleToggleStartEnd = useCallback((event) => {
    setAddToStartOrEnd(event.target.value);
    addToStartOrEndRef.current = event.target.value;
  }, []);

  const handleSelectMapType = useCallback((event) => {
    setMapType(event.target.value);
    map.current.setStyle(mapTypes[event.target.value]);
  }, []);

  const handleChangeWalkwayBias = useCallback((_, newValue) => {
    setWalkwayBias(newValue);
    walkwayBiasRef.current = newValue;
  }, []);

  const updateDistanceAndEleState = useCallback(() => {
    let distTotal = 0.0;
    let eleUpTotal = 0.0;
    let eleDownTotal = 0.0;
    geojson.features.forEach(line => {
      distTotal += line.properties.distance;
      eleUpTotal += line.properties.eleUp;
      eleDownTotal += line.properties.eleDown;
    });
    setDist(distTotal);
    setEleUp(eleUpTotal * 3.28084);
    setEleDown(eleDownTotal * 3.28084);
  }, []);

  const applyMapStyles = useCallback(() => {
    // Elevation Data
    map.current.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14
    });
    map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1 });

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
        walkwayBiasRef.current,
        mapboxgl.accessToken
      );
    }
    let newLine = { // To be returned
      type: 'Feature',
      properties: {
        id: uuidv4(),
        // distance: (Needs to be added)
        // eleUp: (Needs to be added)
        // eleDown: (Needs to be added)
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
    //Calculate elevation gain/loss
    const chunks = lineChunk(newLine, 0.02/*km*/).features;
    const elevations = [ // In meters
      ...chunks.map((feature) => {
          return map.current.queryTerrainElevation(
              feature.geometry.coordinates[0]
          );
      }),
      // do not forget the last coordinate
      map.current.queryTerrainElevation(
          chunks[chunks.length - 1].geometry.coordinates[1]
      )
    ];
    let up = 0.0;
    let down = 0.0;
    let prevEle;
    elevations.forEach((ele,i) => {
      if (i > 0) {
        const change = ele - prevEle;
        if (change < 0) {
          down += change;
        } else {
          up += change;
        }
      }
      prevEle = ele;
    });
    newLine.properties.eleUp = up;
    newLine.properties.eleDown = down;

    return newLine;
  }

  useEffect(() => {
    if (!map.current) { // initialize map only once
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapTypes[0],
        center: [-104.959730, 39.765733],
        zoom: 14
      });
  
      // Default cursor should be pointer
      map.current.getCanvas().style.cursor = 'crosshair';
  
      // Add zoom control and geolocate
      map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");
      map.current.addControl(new mapboxgl.GeolocateControl({showAccuracyCircle: false, showUserLocation: false}), "bottom-right");
    
      map.current.on('style.load', () => {
        applyMapStyles();
      });

      map.current.on('load', () => {
        setLoading(false);
        console.info("Map loaded. Adding routing functionality.");
      });

      // Place a marker on click
      map.current.on('click', async e => {
        await handleLeftRightClick(
          e,
          markers,
          geojson,
          map,
          updateDistanceAndEleState,
          getDirections,
          false, // rightClick bool
          (addToStartOrEndRef.current === "add-to-end") // Else, adding to start
        );
      });

      map.current.on('contextmenu', async e => {
        if (rightClickEnabledRef.current) {
          await handleLeftRightClick(
            e,
            markers,
            geojson,
            map,
            updateDistanceAndEleState,
            getDirections,
            true, // rightClick bool
            (addToStartOrEndRef.current === "add-to-end") // Else, adding to start
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
        <div className="elevation-container">
          <p className="sidebar-elevation">Elevation Gain/Loss:</p>
          <p className="sidebar-elevation">{eleUp.toFixed(2)}/{eleDown.toFixed(2)} Ft</p>
        </div>
        <br/>

        <Stack className="sidebar-btn-container" spacing={2} direction="row">
          <Tooltip title={<Typography>Clear route and all waypoints from map</Typography>}>
            <Button variant="contained" onClick={() => setClearMap(true) } startIcon={<ClearIcon />}>Clear</Button>
          </Tooltip>
          <Tooltip title={<Typography>Undo last action</Typography>}>
            <Button variant="contained" onClick={()=>{}} startIcon={<UndoIcon />}>Undo</Button>
          </Tooltip>
        </Stack>

        <br/><hr/><br/>
        <FormControl component="fieldset">
          <FormGroup aria-label="boolean-switches">
            <Tooltip title={<Typography>When enabled, routes between points will follow streets and pathways</Typography>}>
              <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                value="auto-follow-roads"
                control={
                  <BlueSwitch checked={autoFollowRoads} onChange={handleSwitchAutoFollowRoads} name="autoFollowRoads"/>
                }
                label="Auto follow roads"
                labelPlacement="start"
              />
            </Tooltip>
            <Tooltip title={<Typography>When enabled, right clicks will connect points with straight lines, bypassing any roads or obstacles</Typography>}>
              <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                value={"right-click-enabled"}
                control={
                  <BlueSwitch checked={rightClickEnabled} onChange={handleSwitchRightClickEnabled} name="rightClickEnabled"/>
                }
                label="Right click enabled"
                labelPlacement="start"
              />
            </Tooltip>
          </FormGroup>
        </FormControl>

        <br/><br/><hr/><br/>
        <FormControl>
          <FormLabel sx={{"&.Mui-focused": { color: "white" }, textAlign: "left", color:"white"}}>Add new points to...</FormLabel>
          <Tooltip title={<Typography>Choose whether new waypoints are appended to the end of your route, or placed at the beginning before your start point</Typography>}>
            <RadioGroup
              row
              aria-labelledby="add-to-start-or-end-radio-group"
              defaultValue="add-to-end"
              name="add-to-start-or-end-radio-buttons-group"
              value={addToStartOrEnd}
              onChange={handleToggleStartEnd}
            >
              <FormControlLabel value="add-to-start" control={<BlueRadio />} label="Beginning" />
              <FormControlLabel value="add-to-end" control={<BlueRadio />} label="End" />
            </RadioGroup>
          </Tooltip>
        </FormControl>
        
        <br/><hr/><br/>
        <FormControl fullWidth>
          <InputLabel sx={{color:"white", fontSize:"1.1em", "&.Mui-focused": {color: "white"}}}>Map type</InputLabel>
          <BlueSelect
            labelId="select-map-type"
            id="select-map-type"
            label="Map type"
            value={mapType}
            onChange={handleSelectMapType}
          >
            <MenuItem value={0}>Standard</MenuItem>
            <MenuItem value={1}>Outdoors</MenuItem>
            <MenuItem value={2}>Satellite</MenuItem>
          </BlueSelect>
        </FormControl>

        <br/><br/><hr/><br/>
        <FormControl fullWidth>
          <FormLabel sx={{textAlign: "left", color:"white"}}>When routing, favor...</FormLabel>
          <BlueSlider
            aria-label="Walkway-Bias"
            value={walkwayBias}
            onChange={handleChangeWalkwayBias}
            defaultValue={0}
            shiftStep={0.5}
            step={0.1}
            min={-1}
            max={1}
            tooltip={<><b>Advanced:</b> Routing bias towards/against walkways (e.g. sidewalks, walking paths). Favoring
                    roads can help keep routes straighter and simpler, favoring walkways can make routes look more jumpy,
                    as they'll hop between roads & sidewalks more, but can keep them more true to life. <i>Default</i> is to 
                    favor both equally</>}
          />
        </FormControl>

      </div>
      <div ref={mapContainer} className="map-container" />
      { loading && <LoadingDialog open={loading} /> }
      { clearMap && <AreYouSureDialog
          open={clearMap}
          onYes={() => {
            setClearMap(false);
            handleClearMap();
            updateDistanceAndEleState();
            map.current.getSource('geojson').setData(geojson); // Reload UI
          }} 
          onNo={() => setClearMap(false)} 
        /> }
    </div>
  );
}

export default Map;
