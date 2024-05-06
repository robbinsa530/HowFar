import React, { useRef, useCallback, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import length from '@turf/length'
import lineChunk from '@turf/line-chunk'
import { v4 as uuidv4 } from 'uuid';
import UndoIcon from '@mui/icons-material/Undo';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import MenuIcon from '@mui/icons-material/Menu';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
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
import Drawer from '@mui/material/Drawer';

import './Map.css';
import AreYouSureDialog from './components/AreYouSureDialog'
import LoadingDialog from './components/LoadingDialog'
import PostToStravaDialog from './components/PostToStravaDialog'
import BlueSwitch from './components/BlueSwitch'
import BlueRadio from './components/BlueRadio'
import BlueSelect from './components/BlueSelect'
import BlueSlider from './components/BlueSlider'
import ConnectWithStrava from './assets/ConnectWithStrava';
import CompatibleWithStrava from './assets/CompatibleWithStrava';
import { 
  handleLeftRightClick,
  removeMarker,
  addMarkerBack,
  moveMarkerBack } from './controllers/MapActionController';
import { getRouteBetweenPoints } from './controllers/DirectionsController';
import { checkUserHasToken } from './controllers/StravaController';

const PORT = process.env.PORT || 3001;
const SERVER_ADDR = process.env.REACT_APP_SERVER_ADDR || "http://127.0.0.1"
let STRAVA_CLIENT_ID;

const mapTypes = [
  'mapbox://styles/mapbox/streets-v12',
  'mapbox://styles/mapbox/outdoors-v12',
  'mapbox://styles/mapbox/satellite-streets-v12',
  'mapbox://styles/mapbox/dark-v11'
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

// Hold onto previous states to allow undo
let undoActionList = [];

// No-React flag for when window listener gets added. Avoids using state which may cause unnecessary renders
let onFocusEventListenerAdded = false;

function handleClearMap() {
  // Clear markers/lines
  undoActionList = [];
  markers.forEach(m => m.markerObj.remove());
  markers = [];
  geojson.features = [];
}

async function postToStrava(postData) {
  // Calculate start/end times in current time zone
  let baseDate = new Date(Date.parse(postData.date + 'T' + postData.time + ':00.000Z'));
  const offset = baseDate.getTimezoneOffset();
  const startTime = new Date(baseDate.getTime() + (offset*60*1000));
  const durationInSeconds = (parseInt(postData.hours) * 3600) +
                            (parseInt(postData.minutes) * 60) +
                            (parseInt(postData.seconds));
  const endTime = new Date(startTime.getTime() + (durationInSeconds*1000));

  // Calculate points array from route
  let points = geojson.features.reduce((accum, currLine) => {
    // All but the last pt (last pt of each line is 1st pt of next line)
    const currLinePts = currLine.geometry.coordinates.slice(0, -1);
    accum.push(...currLinePts);
    return accum;
  }, []);
  const lastLineGeomArrayLength = geojson.features[geojson.features.length -1].geometry.coordinates.length;
  points.push(geojson.features[geojson.features.length -1].geometry.coordinates[lastLineGeomArrayLength - 1]); // Cuz we missed the actual last point

  let tempLine = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  };

  // Gotta do some weird math because summing geometry distances never quite matches up to total route distance.
  // I suspect this has to do with how so many numbers are being rounded along the way, there is probably a small
  // loss of precision. Regardless, this algorithm almost always ends up producing a GPX file with the correct
  // distance and time. However, on strava the pace graph always ends up super jumpy (by ~10-20s/mile). This is because
  // (it seems) Strava ignores milliseconds of timestamps associated with route points, so some segments will have their 
  // time altered by up to a whole second (which for small segments will alter pace drastically). 
  //
  // I tried a different strategy where I broke up the route into 2 second waypoint intervals based on pace. This mostly
  // worked, but any time there was a 90-180 degree turn in the route, the pace was very wrong again. Additionally with
  // this method the distance and time was sometimes off by a small amount.
  //
  // In the end I've chosen (for now) to keep this method which produces correct times/distances but an ugly pace graph.
  let clock = startTime.getTime();
  const totalDist = postData.distance;
  let runningDist = 0.0;
  for (const [i, pt] of points.entries()) {
    let dist = 0.0;
    if (i > 0) {
      tempLine.geometry.coordinates = [points[i-1], pt];
      dist = length(tempLine, {units: 'miles'});
      runningDist += dist;
    }
    points[i].push(dist);
  }
  const ratio = runningDist / totalDist;
  for (const [i, pt] of points.entries()) {
    let segDuration = ((pt[2]/totalDist) * durationInSeconds) / ratio;
    clock += (segDuration*1000);
    points[i][2] = (new Date(clock)).toISOString();
  }
  // Usually its off by like 0.001-0.01ms
  points[points.length - 1][2] = (new Date(Math.round(clock))).toISOString();

  const postResp = await fetch("/uploadToStrava",
    {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        points,
        title: postData.title,
        description: postData.description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        sportType: postData.sportType
      })
    }
  );
  if (postResp.ok) {
    console.log("Successfully uploaded activity to Strava");
    alert("Successfully uploaded activity to Strava");
  } else {
    console.error("Failed to upload activity to Strava.", postResp.status);
    alert("Failed to upload activity to Strava");
  }
}

function Map() {
  const [loading, setLoading] = useState(true);
  const [clearMap, setClearMap] = useState(false);
  const [connectedToStrava, setConnectedToStrava] = useState(null);
  const [stravaDialogOpen, setStravaDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoFollowRoads, setAutoFollowRoads] = useState(true);
  const [rightClickEnabled, setRightClickEnabled] = useState(true);
  const [addToStartOrEnd, setAddToStartOrEnd] = useState("add-to-end");
  const [mapType, setMapType] = useState(0);
  const [walkwayBias, setWalkwayBias] = useState(0);
  const mapSetupStartedRef = React.useRef(false);
  const stravaLoginWindowWasOpenedRef = React.useRef(false);
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

  const updateConnectedStatus = useCallback(async () => {
    const checkResp = await checkUserHasToken();
    if (checkResp.ok) {
      const data = await checkResp.json();
      setConnectedToStrava(data.hasToken);
    }  else {
      console.error("Error checking Strava user status.");
    }
  }, []);

  const handleConnectToStrava = useCallback(async () => {
    const checkResp = await checkUserHasToken();
    if (checkResp.ok) {
      const data = await checkResp.json();
      if (data.hasToken) {
        console.info('User has token saved. Can now allow post to Strava');
        setConnectedToStrava(true);
      } else {
        // Force Strava sign-in
        stravaLoginWindowWasOpenedRef.current = true;
        window.open(`https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${SERVER_ADDR}:${PORT}/saveToken&response_type=code&approval_prompt=auto&scope=read,activity:write`, "_blank");
      }
    }  else {
      console.error("Error checking Strava user status.");
      alert("Failed to authenticate");
    }
  }, []);

  const handlePostToStravaClick = useCallback(async () => {
    const checkResp = await checkUserHasToken();
    if (checkResp.ok) {
      const data = await checkResp.json();
      setConnectedToStrava(data.hasToken); // Just in case server has different data than state
      if (data.hasToken) {
        console.info('User has token saved. Allowing post to Strava');
        setStravaDialogOpen(true);
      } else {
        alert('You must log into Strava using the "Connect With Strava" button before posting activity');
      }
    }  else {
      console.error("Error checking Strava user status.");
      alert("Failed to authenticate");
    }
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

  const handleUndo = useCallback(async () => {
    if (undoActionList.length === 0) {
      return;
    }
    // Undo last add/move/delete
    const lastAction = undoActionList.pop();
    if (lastAction.type === 'add') {
      await removeMarker(lastAction.marker.id, markers, geojson, getDirections);
    }
    else if (lastAction.type === 'move') {
      moveMarkerBack(lastAction.info);
    }
    else if (lastAction.type === 'delete') {
      addMarkerBack(lastAction.info, markers, geojson, map);
    }
  }, []);

  // This gets attached to the focus changed listener of the window.
  // It lets the connected bool be updated when the user switches back
  // to this page after logging in in a separate window/tab
  const handlePageGotFocus = useCallback(async (event) => {
    if (stravaLoginWindowWasOpenedRef.current) {
      stravaLoginWindowWasOpenedRef.current = false;
      await updateConnectedStatus();
    }
  }, []);

  useEffect(()=>{ // Set connected status on first load
    if (!onFocusEventListenerAdded) {
      window.addEventListener('focus', handlePageGotFocus);
      onFocusEventListenerAdded = true;
    }
    updateConnectedStatus();
  }, []);

  useEffect(() => {
    if (!mapSetupStartedRef.current && !map.current) { // initialize map only once
      mapSetupStartedRef.current = true;
      // Get API codes for Strava and Mapbox
      fetch("/getApiTokens").then(apiCodesResp => {
        if (apiCodesResp.ok) {
          apiCodesResp.json().then(data => {
            STRAVA_CLIENT_ID = data.STRAVA_CLIENT_ID;
            mapboxgl.accessToken = data.MAPBOX_PUB_KEY;

            map.current = new mapboxgl.Map({
              container: mapContainer.current,
              style: mapTypes[0],
              center: [-104.959730, 39.765733], // Default location, super zoomed out over CO
              zoom: 3
            });
        
            // Default cursor should be pointer
            map.current.getCanvas().style.cursor = 'crosshair';
        
            // Add zoom control and geolocate
            map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
            map.current.addControl(new mapboxgl.GeolocateControl({showAccuracyCircle: false, showUserLocation: false}), "top-right");

            map.current.on('style.load', () => {
              applyMapStyles();
            });

            map.current.on('load', () => {
              setLoading(false);
              // Snap to users location if allowed
              navigator.geolocation.getCurrentPosition(function(position) {
                map.current.flyTo({
                  center: [position.coords.longitude, position.coords.latitude],
                  zoom: 14,
                  essential: true,
                  animate: false
                });
              });
              console.info("Map loaded. Adding routing functionality.");
            });
      
            // Place a marker on click
            map.current.on('click', async e => {
              await handleLeftRightClick(
                e,
                markers,
                geojson,
                undoActionList,
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
                  undoActionList,
                  map,
                  updateDistanceAndEleState,
                  getDirections,
                  true, // rightClick bool
                  (addToStartOrEndRef.current === "add-to-end") // Else, adding to start
                );
              }
            });
          });
        }  else {
          console.error("Error getting API codes. App will not work.");
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
        <div className="menu-btn-div">
          <Tooltip disableInteractive title={<Typography>More Options</Typography>}>
          <IconButton onClick={() => setMenuOpen(true)} sx={{color:'white', margin:0, padding:0}}>
            <MenuIcon />
          </IconButton>
          </Tooltip>
        </div>
        <img src="how_far_logo_complete.png" width="225px"/>
        <br/>
        <p className="sidebar-distance">Distance: {dist.toFixed(2)} Miles</p>
        <div className="elevation-container">
          <p className="sidebar-elevation">Elevation Gain/Loss:</p>
          <p className="sidebar-elevation">{eleUp.toFixed(2)}/{eleDown.toFixed(2)} Ft</p>
        </div>
        <br/>

        <Stack className="sidebar-btn-container" spacing={2} direction="row">
          <Tooltip disableInteractive title={<Typography>Clear route and all waypoints from map</Typography>}>
            <Button variant="contained" onClick={() => setClearMap(true) } startIcon={<ClearIcon />}>Clear</Button>
          </Tooltip>
          <Tooltip disableInteractive title={<Typography>Undo last action</Typography>}>
            <Button variant="contained" onClick={() => {
              handleUndo();
              updateDistanceAndEleState();
              map.current.getSource('geojson').setData(geojson); // Reload UI
            }} startIcon={<UndoIcon />}>Undo</Button>
          </Tooltip>
        </Stack>

        <br/><hr/><br/>
        <FormControl component="fieldset">
          <FormGroup aria-label="boolean-switches">
            <Tooltip disableInteractive title={<Typography>When enabled, routes between points will follow streets and pathways</Typography>}>
              <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                value="auto-follow-roads"
                control={
                  <BlueSwitch checked={autoFollowRoads} onChange={handleSwitchAutoFollowRoads} name="autoFollowRoads"/>
                }
                label="Auto follow roads"
                labelPlacement="start"
              />
            </Tooltip>
            <Tooltip disableInteractive title={<Typography>When enabled, right clicks will connect points with straight lines, bypassing any roads or obstacles</Typography>}>
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
          <FormLabel sx={{"&.Mui-focused": { color: "white" }, textAlign: "left", color:"white"}}>Add new points to:</FormLabel>
          <Tooltip disableInteractive title={<Typography>Choose whether new waypoints are appended to the end of your route, or placed at the beginning before your start point</Typography>}>
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
            <MenuItem value={3}>Dark Theme</MenuItem>
          </BlueSelect>
        </FormControl>

        <br/><br/><hr/><br/>
        <FormControl fullWidth>
          <FormLabel sx={{textAlign: "left", color:"white"}}>When routing, favor:</FormLabel>
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
      
      <div className="bottom-sidebar">
        <CompatibleWithStrava />
        <br/>
        <small>&copy; Copyright {new Date().getFullYear()} Alex Robbins</small>
        <br/>
        <small>All Rights Reserved.</small>
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
        { stravaDialogOpen && <PostToStravaDialog
          distance={dist}
          open={stravaDialogOpen}
          onPost={(data) => {
            postToStrava(data);
            setMenuOpen(false);
          }}
          onCancel={() => {
            setStravaDialogOpen(false);
            setMenuOpen(false);
          }}
        />}
        <Drawer 
          open={menuOpen} 
          onClose={() => setMenuOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: "rgb(55 75 95)",
              padding: '10px'
            }
          }}
        >
          <div className="menu-back-btn-div">
            <Button variant="outlined" onClick={() => setMenuOpen(false)} sx={{color:'white', margin:0, padding:0}}>
              <KeyboardBackspaceIcon />
            </Button>
          </div>
          <Tooltip disableInteractive title={<Typography>Connect with Strava</Typography>}>
            <Button onClick={handleConnectToStrava}>
              <ConnectWithStrava />
            </Button>
          </Tooltip>
          { (connectedToStrava != null) &&
            <div className="strava-connected-div">
              <p className="strava-connected-p">{!connectedToStrava && "Not "}Connected</p>
              {connectedToStrava ? <CheckCircleIcon sx={{color: '#53e327'}} /> : <CancelIcon sx={{color: "#d6392d"}} />}
          </div>}
          <br/>
          <Tooltip disableInteractive title={<Typography>Post route to connected App(s)</Typography>}>
            <Button variant="contained" onClick={handlePostToStravaClick}>Post Activity</Button>
          </Tooltip>

          <a href="https://github.com/robbinsa530/HowFar/blob/main/README.md" target="_blank" rel="noreferrer" className="help-footer">Help</a>
        </Drawer>
    </div>
  );
}

export default Map;
