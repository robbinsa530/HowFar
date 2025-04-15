import React, { useRef, useCallback, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import { MapboxSearchBox } from '@mapbox/search-js-web';

import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { v4 as uuidv4 } from 'uuid';
import UndoIcon from '@mui/icons-material/Undo';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import MenuIcon from '@mui/icons-material/Menu';
import LoopIcon from '@mui/icons-material/Loop';
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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocationOffIcon from '@mui/icons-material/LocationOff';

import './Map.css';
import AreYouSureDialog from './components/AreYouSureDialog'
import SimpleDialog from './components/SimpleDialog'
import PostToStravaDialog from './components/PostToStravaDialog'
import ExportActivityDialog from './components/ExportActivityDialog';
import ImportActivityDialog from './components/ImportActivityDialog';
import BlueSwitch from './components/BlueSwitch'
import BlueRadio from './components/BlueRadio'
import BlueSelect from './components/BlueSelect'
import BlueSlider from './components/BlueSlider'
import ConnectWithStrava from './assets/ConnectWithStrava';
import CompatibleWithStrava from './assets/CompatibleWithStrava';
import { 
  handleLeftRightClick,
  addNewMarkerInLine,
  undoAddMarkerInLine,
  handleOutAndBack,
  undoOutAndBack,
  removeMarker,
  addMarkerBack,
  moveMarkerBack } from './controllers/MapActionController';
import { getRouteBetweenPoints } from './controllers/DirectionsController';
import { 
  checkUserHasToken,
  createManualActivityOnStrava,
  uploadActivityToStrava
} from './controllers/StravaController';
import { 
  downloadActivityGpx,
  importRouteFromGpx
} from './controllers/ImportExportController';
import { getErrorMsgFromPositionError } from './utils/location';
import {
  getElevationChange,
  splitLineWithPoint
} from './controllers/GeoController';

const SERVER_ADDR = process.env.REACT_APP_SERVER_ADDR || "http://127.0.0.1:3001"
let STRAVA_CLIENT_ID;

const mapTypes = [
  'mapbox://styles/mapbox/streets-v12',
  'mapbox://styles/mapbox/outdoors-v12',
  'mapbox://styles/mapbox/satellite-streets-v12',
  'mapbox://styles/mapbox/dark-v11'
];

const chevronLayer = {
  id: 'arrow-overlay',
  type: 'line',
  source: 'geojson',
  layout: {},
  paint: {
      'line-pattern': 'chevron',
      'line-width': 7,
      'line-opacity': 1.0
  },
  filter: ['in', '$type', 'LineString']
};

/*
marker:
{
  id:,
  element:,
  lngLat:,
  markerObj:,
  associatedLines,
  isDragging,
  snappedToRoad,
  elevation,
}
*/
let markers = [];

// Used as a display when hovering over line segment to add new marker
let addNewMarker = null;
let addNewMarkerDiv = null;
let newMarkerLineToSplit = null;

const geojson = {
  'type': 'FeatureCollection',
  'features': []
};

// Hold onto previous states to allow undo
let undoActionList = [];

// No-React flag for when window listener gets added. Avoids using state which may cause unnecessary renders
let onFocusEventListenerAdded = false;

// Prevents multiple clicks in quick succession from re-firing handleLeftRightClick before it's returned
let mutex = false;

function handleClearMap() {
  // Clear markers/lines
  undoActionList = [];
  markers.forEach(m => m.markerObj.remove());
  markers = [];
  geojson.features = [];
}

async function postToStrava(postData) {
  if (postData.uploadMap) {
    uploadActivityToStrava(postData, geojson);
  }
  // Ssshhhhhhhh
  // TODO: Remove
  else if (postData.description.trimEnd().toLowerCase().endsWith("/map")) {
    postData.description = postData.description.slice(0, -4);
    uploadActivityToStrava(postData, geojson);
  }
  else {
    createManualActivityOnStrava(postData);
  }
}

function Map() {
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [clearMap, setClearMap] = useState(false);
  const [connectedToStrava, setConnectedToStrava] = useState(null);
  const [stravaDialogOpen, setStravaDialogOpen] = useState(false);
  const [exportActivityDialogOpen, setExportActivityDialogOpen] = useState(false);
  const [importActivityDialogOpen, setImportActivityDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoFollowRoads, setAutoFollowRoads] = useState(true);
  const [rightClickEnabled, setRightClickEnabled] = useState(true);
  const [addMarkerInLineEnabled, setAddMarkerInLineEnabled] = useState(false);
  const [addToStartOrEnd, setAddToStartOrEnd] = useState("add-to-end");
  const [imperialOrMetric, setImperialOrMetric] = useState("imperial");
  const [mapType, setMapType] = useState(0);
  const [walkwayBias, setWalkwayBias] = useState(0);
  const [displayChevrons, setDisplayChevrons] = useState(true);
  const [displayDistancePopup, setDisplayDistancePopup] = useState(true);
  const [distancePopupVisible, setDistancePopupVisible] = useState(false);
  const [popupDistances, setPopupDistances] = useState([]);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const mapSetupStartedRef = React.useRef(false);
  const stravaLoginWindowWasOpenedRef = React.useRef(false);
  const autoFollowRoadsRef = React.useRef(autoFollowRoads);
  const rightClickEnabledRef = React.useRef(rightClickEnabled);
  const addMarkerInLineEnabledRef = React.useRef(addMarkerInLineEnabled);
  const displayDistancePopupRef = React.useRef(displayDistancePopup);
  const addToStartOrEndRef = React.useRef(addToStartOrEnd);
  const walkwayBiasRef = React.useRef(walkwayBias);
  const touchTimeoutRef = React.useRef(null);

  const searchBoxTimerIdRef = React.useRef(0);
  const searchBoxLastTextRef = React.useRef("");

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [dist, setDist] = useState(0.0);
  const [eleUp, setEleUp] = useState(0.0);
  const [eleDown, setEleDown] = useState(0.0);
  const [hasDefaultLocation, setHasDefaultLocation] = useState(false);

  const handleSwitchDisplayChevrons = useCallback((event) => {
    setDisplayChevrons(event.target.checked);
    // Turning layer on
    if (event.target.checked) {
      // If layer is not already present (should not be)
      if (!map.current.getLayer('arrow-overlay')) {
        // If chevron image is loaded
        if (map.current.hasImage('chevron')) {
          map.current.addLayer(chevronLayer);
        }
      }
    }
    // Turning layer off
    else {
      map.current.removeLayer('arrow-overlay');
    }
  }, []);

  const handleSwitchDisplayDistancePopup = useCallback((event) => {
    setDisplayDistancePopup(event.target.checked);
    displayDistancePopupRef.current = event.target.checked;

    if (!event.target.checked) {
      setDistancePopupVisible(false);
      setPopupDistances([]);
    }
  }, []);

  const handleSwitchAutoFollowRoads = useCallback((event) => {
    setAutoFollowRoads(event.target.checked);
    autoFollowRoadsRef.current = event.target.checked;
  }, []);

  const handleSwitchRightClickEnabled = useCallback((event) => {
    setRightClickEnabled(event.target.checked);
    rightClickEnabledRef.current = event.target.checked;
  }, []);

  const handleSwitchAddMarkerInLineEnabled = useCallback((event) => {
    setAddMarkerInLineEnabled(event.target.checked);
    addMarkerInLineEnabledRef.current = event.target.checked;

    if (!event.target.checked) {
      removeAddNewMarker();
    }
  }, []);

  const handleToggleStartEnd = useCallback((event) => {
    setAddToStartOrEnd(event.target.value);
    addToStartOrEndRef.current = event.target.value;
  }, []);

  const handleToggleImpOrMetric = useCallback((event) => {
    setImperialOrMetric(event.target.value);
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
        window.open(`https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${SERVER_ADDR}/saveToken&response_type=code&approval_prompt=auto&scope=read,profile:read_all,activity:write`, "_blank");
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

  const handleExportActivityClick = useCallback(() => {
    if (geojson.features.length === 0) {
      alert("Cannot export blank route.");
      return;
    }
    setExportActivityDialogOpen(true);
  }, []);

  const handleImportActivityClick = useCallback(() => {
    setImportActivityDialogOpen(true);
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

    map.current.loadImage("sprite_long.png", (err, img) => {
      if (err) {
        console.error("Error loading sprite, no arrows will be displayed", err);
      }
      else {
        map.current.addImage("chevron", img);
        map.current.addLayer(chevronLayer);
      }
    });
  }, []);

  async function getDirections(startMarker, endMarker, connectDisjoint, calculateDirectionsOverride=undefined) {
    const calculateDirections = (calculateDirectionsOverride !== undefined) ?
                                  calculateDirectionsOverride
                                  : autoFollowRoadsRef.current;
    let lngLatStart = startMarker.lngLat;
    let lngLatEnd = endMarker.lngLat;
    let elevStart = startMarker.elevation
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
      const [connectDisjointStart, connectDisjointEnd] = connectDisjoint;
      if (connectDisjointStart) {
        let tempLine = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [lngLatStart, newLine.geometry.coordinates[0]]
          }
        }
        const distBtwn = length(tempLine, {units: 'miles'});
        if (distBtwn > 0.005) {
          // Add segment to lineString and update distance
          newLine.geometry.coordinates.unshift(lngLatStart);
          newLine.properties.distance += distBtwn;
        }
      }
      if (connectDisjointEnd) {
        let tempLine = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [newLine.geometry.coordinates[newLine.geometry.coordinates.length -1], lngLatEnd]
          }
        }
        const distBtwn = length(tempLine, {units: 'miles'});
        if (distBtwn > 0.005) {
          // Add segment to lineString and update distance
          newLine.geometry.coordinates.push(lngLatEnd);
          newLine.properties.distance += distBtwn;
        }
      }
    }
    //Calculate elevation gain/loss
    const [up, down] = getElevationChange(map, newLine, elevStart);
    newLine.properties.eleUp = up;
    newLine.properties.eleDown = down;

    return [calculateDirections, newLine];
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
    else if (lastAction.type === 'out-and-back') {
      undoOutAndBack(lastAction.info, markers, geojson)
    }
    else if (lastAction.type === 'add-marker-in-line') {
      undoAddMarkerInLine(lastAction.info, markers, geojson)
    }
  }, []);

  // Return distance between a mouse event and the add-new-markrt
  // Returns squared distance for faster computing
  const getMouseToMarkerSqDistance = useCallback((e, markerObj) => {
    const markerPt = map.current.project(markerObj.getLngLat()); // LngLat -> X/Y
    const xDist = (e.point.x - markerPt.x);
    const yDist = (e.point.y - markerPt.y);
    return (xDist*xDist) + (yDist*yDist);
  }, []);

  // Used to remove add-new-marker
  const removeAddNewMarker = useCallback(() => {
    map.current.getCanvas().style.cursor = 'crosshair';
    if (addNewMarker) {
      addNewMarker.remove();
      addNewMarker = null;
      newMarkerLineToSplit = null;
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

  const saveDefaultLocation = useCallback(() => {
    if (!map.current) return;
    
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    const locationData = {
      lng: center.lng,
      lat: center.lat,
      zoom: zoom
    };
    
    fetch('/saveDefaultLocation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData)
    })
    .then(response => {
      if (response.ok) {
        setHasDefaultLocation(true);
        alert("Home location saved! HowFar will load your map to this location next time you open the app.");
      } else {
        console.error("Failed to save default location");
        alert("Failed to save default location");
      }
    })
    .catch(error => {
      console.error("Error saving default location:", error);
      alert("Error saving default location");
    });
  }, []);

  const clearDefaultLocation = useCallback(() => {
    fetch('/clearDefaultLocation', {
      method: 'POST',
    })
    .then(response => {
      if (response.ok) {
        setHasDefaultLocation(false);
        alert("Home location cleared!");
      } else {
        console.error("Failed to clear default location");
        alert("Failed to clear default location");
      }
    })
    .catch(error => {
      console.error("Error clearing default location:", error);
      alert("Error clearing default location");
    });
  }, []);

  const checkForDefaultLocationAndFlyTo = useCallback(async () => {
    const response = await fetch('/getDefaultLocation');
    if (response.ok) {
      const data = await response.json();
      if (data && data.location) {
        setHasDefaultLocation(true);
        if (map.current) {
          map.current.flyTo({
            center: [data.location.lng, data.location.lat],
            zoom: data.location.zoom,
            essential: true,
            animate: false
          });
          return true;
        }
      }
    }
    return false;
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
              zoom: process.env.NODE_ENV === 'production' ? 3 : 14,
              pitchWithRotate: false,
              doubleClickZoom: false
            });
            map.current.touchZoomRotate['_tapDragZoom']['_enabled'] = false;
        
            // Default cursor should be pointer
            map.current.getCanvas().style.cursor = 'crosshair';
        
            // Add search box
            const search = new MapboxSearchBox();
            search.accessToken = mapboxgl.accessToken;
            search.map = map.current;
            search.mapboxgl = mapboxgl;
            search.placeholder = "Search a location"
            search.marker = false;
            search.options = {
              limit: 5,
              proximity: [-104.959730, 39.765733],
              types: "country,region,postcode,district,place,street,address,poi"
            };
            // Only search when the user stops typing for 0.5s (avoids too many API calls)
            search.interceptSearch = (text) => {
              if (text === "" || searchBoxLastTextRef.current === text) {
                searchBoxLastTextRef.current = "";
                return text;
              } else {
                searchBoxLastTextRef.current = text;
                clearTimeout(searchBoxTimerIdRef.current)
                searchBoxTimerIdRef.current = setTimeout(() => {
                  // Don't use text here b/c when deleting search string to empty,
                  // text will contain last deleted character
                  search.search(search.value);
                }, 500);
                return "";
              }
            };
            search.popoverOptions = {
              flip: true
            };
            map.current.addControl(search);

            // Add zoom control and geolocate
            map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
            const mapboxGeolocateControl = new mapboxgl.GeolocateControl({
              showAccuracyCircle: false,
              showUserLocation: false,
              positionOptions: {
                maximumAge: 1000*60*60, // Can return cached location if < 1hr old
                timeout: 7000 // 7 Seconds. 5 seems short but 10 seems long. idk
              }
            });
            map.current.addControl(mapboxGeolocateControl, "top-right");
            mapboxGeolocateControl.on("error", err => {
              let errMsg = getErrorMsgFromPositionError(err);
              alert(errMsg + " Try searching your location in the search bar.")
            });

            map.current.on('style.load', () => {
              applyMapStyles();

              // Marker used to show user they can add a new marker on an existing line
              addNewMarkerDiv = React.createRef();
              addNewMarkerDiv.current = document.createElement('div');
              const markerHLineDiv = document.createElement('div');
              const markerVLineDiv = document.createElement('div');
              markerHLineDiv.className = "marker-line-h";
              markerVLineDiv.className = "marker-line-v";
              addNewMarkerDiv.current.appendChild(markerHLineDiv);
              addNewMarkerDiv.current.appendChild(markerVLineDiv);

              addNewMarkerDiv.current.addEventListener('mouseleave', (e) => {
                removeAddNewMarker();
              });

              // Remove distance popup when mouse leaves route line
              map.current.on('mouseleave', 'measure-lines', (e) => {
                setDistancePopupVisible(false);
                setPopupDistances([]);
              });

              map.current.on('mousemove', 'measure-lines', (e) => {
                /*
                  The code in this event handler takes care of two things:
                  1. Showing/hiding the temporary marker used to show a user when they can "split" a line on their route.
                     This is also called the "edit line on click" feature.
                  2. Showing/hiding the little popup box to show the distance along the route under the mouse when the user
                     hovers their mouse over a line segment on the route.
                */
               let snapped;
               let lineUnderMouse;
               let linesAndIndicesUnderMouse = [];
                if (e.features.length > 0) {
                  // Do what both things will need
                  if (addMarkerInLineEnabledRef.current || displayDistancePopupRef.current) {
                    e.features.forEach((mouse_f,i) => {
                      // Use this b/c e.features[0] only returns rendered geometry, not complete
                      const idx = geojson.features.findIndex(f => f.properties.id === mouse_f.properties.id);
                      const ln = geojson.features[idx];
                      linesAndIndicesUnderMouse.push([idx, ln]);

                      // Save info of top most feature (line)
                      if (i === 0) {
                        newMarkerLineToSplit = mouse_f.properties.id;
                        lineUnderMouse = ln;
                      }
                    });

                    // Happens for a split second right after line is split, geojson has new ids, but rendered map still has old ones
                    if (!lineUnderMouse) {
                      removeAddNewMarker();
                      setDistancePopupVisible(false);
                      setPopupDistances([]);
                      return;
                    }

                    // Calculate point centered on line closest to mouse
                    // Prevents marker from moving along the width of the line as the mouse moves
                    const mousePt = {
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: [e.lngLat.lng, e.lngLat.lat]
                      }
                    }
                    snapped = nearestPointOnLine(lineUnderMouse, mousePt);
                  }

                  // Handle showing distance under mouse
                  if (displayDistancePopupRef.current) {
                    let partialDistances = [];
                    let idsChecked = []; // Sometimes the same line is returned twice
                    linesAndIndicesUnderMouse.forEach(value => {
                      const [idx, ln] = value;
                      if (idsChecked.includes(ln.properties.id)) {
                        return; // continue
                      }

                      // Calculate distance from start of route to segment mouse is in
                      let partialDist = 0.0;
                      for (let i = 0; i < idx; i++) {
                        partialDist += geojson.features[i].properties.distance;
                      }

                      // Calculate distance from start of split segment to mouse
                      const [lCoords, _] = splitLineWithPoint(ln, snapped.geometry.coordinates);
                      let partialLine = {
                        type: 'Feature',
                        geometry: {
                          type: 'LineString',
                          coordinates: lCoords
                        }
                      };
                      partialDist += length(partialLine, {units: 'miles'});

                      // Usually returns double of the same when hovering over junction between segments
                      if (partialDistances.length === 0 || Math.abs(partialDist - partialDistances[partialDistances.length - 1]) > 0.005) {
                        partialDistances.push(partialDist);
                      }
                      idsChecked.push(ln.properties.id);
                    });
                    setDistancePopupVisible(true);
                    setPopupDistances(partialDistances);
                  }

                  // Handle the "add new/edit line on click" marker
                  if (addMarkerInLineEnabledRef.current) {
                    // If over real marker, don't show
                    const idsUnderMouse = e.features.map(f => f.properties.id);
                    const lineEndPtMarkers = markers.filter(m => m.associatedLines.some(l => idsUnderMouse.includes(l)));
                    for (const m of lineEndPtMarkers) {
                      if (getMouseToMarkerSqDistance(e, m.markerObj) < 64) {
                        removeAddNewMarker();
                        return;
                      }
                    }

                    // Set cursor to pointer finger
                    map.current.getCanvas().style.cursor = 'pointer'

                    // Add or move marker
                    if (addNewMarker) {
                      addNewMarker.setLngLat(snapped.geometry.coordinates);
                    }
                    else {
                      addNewMarker = new mapboxgl.Marker({
                        className: "add-new-marker",
                        element: addNewMarkerDiv.current
                      }).setLngLat(snapped.geometry.coordinates)
                        .addTo(map.current);
                    }
                  }
                }
              });
            });

            map.current.on('load', async () => {
              setLoading(false);

              // Check for default location first
              const hasDefault = await checkForDefaultLocationAndFlyTo();

              // If no default location, try to use geolocation
              if (process.env.NODE_ENV === 'production' && !hasDefault) {
                setLocating(true);
                // Dummy call, which according to the internet will make the second call work better? Who knows
                navigator.geolocation.getCurrentPosition(function () {}, function () {}, {});
                navigator.geolocation.getCurrentPosition(position => {
                  map.current.flyTo({
                    center: [position.coords.longitude, position.coords.latitude],
                    zoom: 14,
                    essential: true,
                    animate: false
                  });
                  setLocating(false);
                }, async err => {
                  console.error("Failed to locate using navigator.geolocation.getCurrentPosition");
                  setLocating(false);
                  let errMsg = getErrorMsgFromPositionError(err);
                  alert(errMsg + "\n\nYou can also search your location in the search bar.");
                }, {
                  maximumAge: 1000*60*60, // Can return cached location if < 1hr old
                  timeout: 7000, // 7 Seconds. 5 seems short but 10 seems long. idk
                  enableHighAccuracy: false // Default anyways, but makes me feel good
                });
              }
              console.info("Map loaded.");
            });

            // Used to fix an issue where the add-new-marker sometimes doesn't get removed
            map.current.on('mousemove', (e) => {
              if (addNewMarker) {
                // Calculate distance between mouse and add-new-marker.
                // If dist > radius of marker, "remove on mouseleave" has failed. Remove manually.
                // Fixes an issue where mouseleave isn't fired on the marker when the mouse is moving too fast
                const dist = getMouseToMarkerSqDistance(e, addNewMarker);
                if (dist > 64) { // 64 is sorta made up. Roughly the radius of the rendered marker squared
                  removeAddNewMarker();
                }
              }
            });

            // Place a marker on click
            map.current.on('click', async e => {
              if (!mutex) {
                mutex = true;

                // If the add-new-marker was clicked, add a new marker in the middle of selected line
                if (addMarkerInLineEnabledRef.current && addNewMarker && (getMouseToMarkerSqDistance(e, addNewMarker) < 64)) {
                  await addNewMarkerInLine(
                    e,
                    addNewMarker.getLngLat(),
                    markers,
                    geojson,
                    newMarkerLineToSplit,
                    undoActionList,
                    map,
                    updateDistanceAndEleState,
                    getDirections);
                  removeAddNewMarker();
                }
                else {
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
                }
                mutex = false;
              }
            });

            map.current.on("touchstart", (e) => {
              // Only trigger for single-finger touch (prevent triggering on pinch-to-zoom)
              if (e.originalEvent.touches.length === 1) {
                touchTimeoutRef.current = setTimeout(async () => {
                  if (rightClickEnabledRef.current) {
                    if (!mutex) {
                      mutex = true;
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
                      mutex = false;
                    }
                  }
                }, 333);
              }
            });
            map.current.on("touchend", (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on("touchcancel", (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on("touchmove", (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on('pointerdrag', (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on('pointermove', (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on('moveend', (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on('gesturestart', (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on('gesturechange', (e) => { clearTimeout(touchTimeoutRef.current); });
            map.current.on('gestureend', (e) => { clearTimeout(touchTimeoutRef.current); });

            map.current.on('contextmenu', async e => {
              if (rightClickEnabledRef.current) {
                if (!mutex) {
                  mutex = true;
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
                  mutex = false;
                }
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
      <div id="sidebar-content" className='sidebar-content'>
        <div id="sidebar" className="sidebar">
          <div className="mobile-controls">
            <div className="menu-btn-div">
              <Tooltip disableInteractive title={<Typography>More Options (Connect to apps, display, etc.)</Typography>}>
                <IconButton onClick={() => setMenuOpen(true)} sx={{color:'white', margin:0, padding:0}}>
                  <MenuIcon />
                </IconButton>
              </Tooltip>
            </div>
            
            <div className="mobile-action-buttons">
              <Tooltip disableInteractive title={<Typography>Clear route</Typography>}>
                <IconButton onClick={() => setClearMap(true)} sx={{color:'white'}}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip disableInteractive title={<Typography>Undo last action</Typography>}>
                <IconButton onClick={() => {
                  handleUndo();
                  updateDistanceAndEleState();
                  map.current.getSource('geojson').setData(geojson);
                }} sx={{color:'white'}}>
                  <UndoIcon />
                </IconButton>
              </Tooltip>

              <Tooltip disableInteractive title={<Typography>Out and back</Typography>}>
                <IconButton onClick={async () => {
                  await handleOutAndBack(
                    markers,
                    geojson,
                    undoActionList,
                    map,
                    getDirections,
                    updateDistanceAndEleState
                  );
                  updateDistanceAndEleState();
                  map.current.getSource('geojson').setData(geojson);
                }} sx={{color:'white'}}>
                  <LoopIcon />
                </IconButton>
              </Tooltip>

              <Tooltip disableInteractive title={<Typography>More controls</Typography>}>
                <IconButton onClick={() => setMobileControlsOpen(!mobileControlsOpen)} sx={{color:'white'}}>
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            </div>

            <div className={`mobile-controls-popup ${mobileControlsOpen ? 'open' : ''}`}>
              <div className="mobile-controls-popup-header">
                <IconButton
                  onClick={() => setMobileControlsOpen(false)}
                  sx={{color:'white', padding: '4px'}}
                >
                  <CloseIcon />
                </IconButton>
              </div>
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
                  <Tooltip disableInteractive title={<Typography>When enabled, tap + hold (on desktop, right click) will connect points with straight lines, bypassing any roads or obstacles</Typography>}>
                    <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                      value={"right-click-enabled"}
                      control={
                        <BlueSwitch checked={rightClickEnabled} onChange={handleSwitchRightClickEnabled} name="rightClickEnabled"/>
                      }
                      label="Tap + hold enabled"
                      labelPlacement="start"
                    />
                  </Tooltip>
                  <Tooltip disableInteractive title={<Typography>When enabled, clicking on one of your route's line segments will insert a new waypoint into the middle of that segment instead of at the end/beginning of the route</Typography>}>
                    <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                      value={"add-marker-in-line-enabled"}
                      control={
                        <BlueSwitch checked={addMarkerInLineEnabled} onChange={handleSwitchAddMarkerInLineEnabled} name="addMarkerInLineEnabled"/>
                      }
                      label="Edit lines on click"
                      labelPlacement="start"
                    />
                  </Tooltip>
                </FormGroup>
              </FormControl>

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
                    sx={{ marginLeft: '-12px' }} // Hack to make radio buttons align with label
                  >
                    <FormControlLabel value="add-to-start" control={<BlueRadio />} label="Beginning" />
                    <FormControlLabel value="add-to-end" control={<BlueRadio />} label="End" />
                  </RadioGroup>
                </Tooltip>
              </FormControl>

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
          </div>

          <div className="desktop-controls">
            <div className="menu-btn-div">
              <Tooltip disableInteractive title={<Typography>More Options (Connect to apps, display, etc.)</Typography>}>
              <IconButton onClick={() => setMenuOpen(true)} sx={{color:'white', margin:0, padding:0}}>
                <MenuIcon />
              </IconButton>
              </Tooltip>
            </div>
            <img src="how_far_logo_complete.png" width="225px" onLoad={() => {
              // Prevents area below sidebar from blocking map clicks
              // Has to be tied to this img b/c sidebar height isn't calculated fully until this img loads
              const sidebar = document.getElementById("sidebar");
              const sidebarContent = document.getElementById("sidebar-content");
              let sidebarHeight = sidebar.offsetHeight;
              if (sidebarHeight) {
                sidebarContent.style.maxHeight = sidebarHeight.toString() + "px";
              }
              // No else, would rather not hardcode any px values
            }}/>
            <br/>
            {
              imperialOrMetric === "imperial"
              ? <p className="sidebar-distance">Distance: {dist.toFixed(2)} Miles</p>
              : <p className="sidebar-distance">Distance: {(dist * 1.60934).toFixed(2)} km</p>
            }

            <div className="elevation-container">
              <p className="sidebar-elevation">Elevation Gain/Loss:</p>
              {
                imperialOrMetric === "imperial"
                ? <p className="sidebar-elevation">{eleUp.toFixed(2)}/{eleDown.toFixed(2)} Ft</p>
                : <p className="sidebar-elevation">{(eleUp / 3.28084).toFixed(2)}/{(eleDown / 3.28084).toFixed(2)} m</p>
              }
            </div>

            <Stack className="sidebar-btn-container" spacing={2} direction="row">
              <Tooltip disableInteractive title={<Typography>Clear route and all waypoints from map</Typography>}>
                <Button variant="contained" onClick={() => setClearMap(true) } startIcon={<ClearIcon />}>Clear</Button>
              </Tooltip>
              <Tooltip disableInteractive title={<Typography>Undo last action</Typography>}>
                <Button variant="contained" onClick={() => {
                  handleUndo();
                  updateDistanceAndEleState();
                  map.current.getSource('geojson').setData(geojson);
                }} startIcon={<UndoIcon />}>Undo</Button>
              </Tooltip>
            </Stack>
            <Stack className="sidebar-btn-container" spacing={2} direction="row">
              <Tooltip disableInteractive title={<Typography>Return to start point along the same route</Typography>}>
                <Button variant="contained" onClick={async () => {
                  await handleOutAndBack(
                    markers,
                    geojson,
                    undoActionList,
                    map,
                    getDirections,
                    updateDistanceAndEleState
                  );
                  updateDistanceAndEleState();
                  map.current.getSource('geojson').setData(geojson);
                }} startIcon={<LoopIcon />}>Out & Back</Button>
              </Tooltip>
            </Stack>

            <hr/>
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
                <Tooltip disableInteractive title={<Typography>When enabled, right clicks (on mobile, tap + hold) will connect points with straight lines, bypassing any roads or obstacles</Typography>}>
                  <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                    value={"right-click-enabled"}
                    control={
                      <BlueSwitch checked={rightClickEnabled} onChange={handleSwitchRightClickEnabled} name="rightClickEnabled"/>
                    }
                    label="Right click enabled"
                    labelPlacement="start"
                  />
                </Tooltip>

                <Tooltip disableInteractive title={<Typography>When enabled, clicking on one of your route's line segments will insert a new waypoint into the middle of that segment instead of at the end/beginning of the route</Typography>}>
                  <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                    value={"add-marker-in-line-enabled"}
                    control={
                      <BlueSwitch checked={addMarkerInLineEnabled} onChange={handleSwitchAddMarkerInLineEnabled} name="addMarkerInLineEnabled"/>
                    }
                    label="Edit lines on click"
                    labelPlacement="start"
                  />
                </Tooltip>
              </FormGroup>
            </FormControl>

            <br/><hr/>
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

            <br/><hr/>
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
        </div>
      </div>

      <div className="bottom-sidebar-container">
        <div className="default-location-button">
          <Tooltip disableInteractive title={<Typography>
            {hasDefaultLocation ? "Clear saved default start location" : "Save current view as default start location when the map loads"}
          </Typography>}>
            <Button
              variant="contained" 
              onClick={hasDefaultLocation ? clearDefaultLocation : saveDefaultLocation}
              sx={{
                fontSize: '0.85rem',
                borderRadius: '4px',
                padding: '8px',
              }}
            >
              {hasDefaultLocation ? "Clear Home" : "Save As Home"}
              {hasDefaultLocation ? <LocationOffIcon /> : <LocationOnIcon />}
            </Button>
          </Tooltip>
        </div>
        <div className="bottom-sidebar">
          <CompatibleWithStrava />
        </div>
      </div>

      {displayDistancePopup && distancePopupVisible && popupDistances.length > 0 && <div className="distance-popup">
        {
          imperialOrMetric === "imperial"
          ? <p>{popupDistances.toReversed().map(d => d.toFixed(2)).join("mi, ") + "mi"}</p>
          : <p>{popupDistances.toReversed().map(d => (d*1.60934).toFixed(2)).join("km, ") + "km"}</p>
        }
      </div> }

      <div ref={mapContainer} className="map-container" />
      { loading && <SimpleDialog open={loading} text="Loading..." /> }
      { locating && <SimpleDialog open={locating} text="Locating..." /> }
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
          units={imperialOrMetric}
          onPost={(data) => {
            postToStrava(data);
            setMenuOpen(false);
          }}
          onCancel={() => {
            setStravaDialogOpen(false);
            setMenuOpen(false);
          }}
        />}
        { exportActivityDialogOpen && <ExportActivityDialog
          open={exportActivityDialogOpen}
          onExport={(data) => {
            downloadActivityGpx(data, geojson);
            setMenuOpen(false);
          }}
          onCancel={() => {
            setExportActivityDialogOpen(false);
            setMenuOpen(false);
          }}
        />}
        { importActivityDialogOpen && <ImportActivityDialog
          open={importActivityDialogOpen}
          onImport={(file) => {
            handleClearMap();
            importRouteFromGpx(file, markers, geojson, map, undoActionList, getDirections, updateDistanceAndEleState, setLoading);
            setMenuOpen(false);
          }}
          onCancel={() => {
            setImportActivityDialogOpen(false);
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

          <div className="post-to-strava-drawer-div">
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
              <Button className="drawer-button" variant="contained" onClick={handlePostToStravaClick}>Post Activity</Button>
            </Tooltip>
          </div>

          <br/>
          <div className="sidebar-options-div">
            <hr/><br/>
            <Typography variant="h6">Display Options:</Typography>
            <br/>
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
            <br/><br/>
            <FormControl>
              <FormLabel sx={{"&.Mui-focused": { color: "white" }, textAlign: "left", color:"white"}}>Display Distances As:</FormLabel>
              <Tooltip disableInteractive title={<Typography>Choose whether to use mi/ft or km/m</Typography>}>
                <RadioGroup
                  row
                  aria-labelledby="metric-or-imperial-radio-group"
                  defaultValue="imperial"
                  name="metric-or-imperial-radio-buttons-group"
                  value={imperialOrMetric}
                  onChange={handleToggleImpOrMetric}
                >
                  <FormControlLabel value="imperial" control={<BlueRadio />} label="Imperial" />
                  <FormControlLabel value="metric" control={<BlueRadio />} label="Metric" />
                </RadioGroup>
              </Tooltip>
            </FormControl>
            <br/>
            <Tooltip disableInteractive title={<Typography>When enabled, route lines will show arrows to indicate direction</Typography>}>
              <FormControlLabel sx={{marginLeft:0, marginRight:0, width:"100%", justifyContent:'space-between'}}
                value="display-chevrons"
                control={
                  <BlueSwitch checked={displayChevrons} onChange={handleSwitchDisplayChevrons} name="displayChevrons"/>
                }
                label="Route Arrows"
                labelPlacement="start"
              />
            </Tooltip>
            <br/>
            <Tooltip disableInteractive title={<Typography>When enabled, hovering over your route will display the distance along the route of the point under your mouse</Typography>}>
              <FormControlLabel sx={{marginLeft:0, marginRight:0, width:"100%", justifyContent:'space-between'}}
                value="display-chevrons"
                control={
                  <BlueSwitch checked={displayDistancePopup} onChange={handleSwitchDisplayDistancePopup} name="displayDistancePopup"/>
                }
                label="Distance on Hover"
                labelPlacement="start"
              />
            </Tooltip>

            <br/><br/><hr/><br/>
            <Typography variant="h6">Import / Export:</Typography>
            <br/>
            <div className="import-export-drawer-div">
              <Tooltip disableInteractive title={<Typography>Import a route from a .gpx file</Typography>}>
                <Button className="drawer-button" variant="contained" onClick={handleImportActivityClick}>Import Activity</Button>
              </Tooltip>
              <br/>
              <br/>

              <Tooltip disableInteractive title={<Typography>Export route as a .gpx file</Typography>}>
                <Button className="drawer-button" variant="contained" onClick={handleExportActivityClick}>Export Activity</Button>
              </Tooltip>
            </div>
          </div>

          <div className='drawer-help-buttons-div'>
            <div className="footer-link-div top-footer-link-div">
              <a href="https://github.com/robbinsa530/HowFar/blob/main/README.md" target="_blank" rel="noreferrer" className="footer-link">Help</a>
            </div>
            <div className="footer-link-div">
              <a href="https://github.com/robbinsa530/HowFar/blob/main/FAQ.md" target="_blank" rel="noreferrer" className="footer-link">FAQ</a>
            </div>
            <div className="footer-link-div">
              <a href="https://www.paypal.me/AlexRobbins662" target="_blank" rel="noreferrer" className="footer-link">Donate</a>
            </div>

            <div style={{display:'flex', flexDirection:'column', alignItems:'center', color:'lightgray'}}>
              <small><small>&copy; Copyright 2024-{new Date().getFullYear()}</small></small>
              <small><small>Alex Robbins</small></small>
              <small><small>All Rights Reserved.</small></small>
            </div>
          </div>
        </Drawer>

        <div className="mobile-stats">
          <div className="mobile-stats-distance">
            {imperialOrMetric === "imperial" 
              ? <span>{dist.toFixed(2)} mi</span>
              : <span>{(dist * 1.60934).toFixed(2)} km</span>
            }
          </div>
          <div className="mobile-stats-logo">
            <img src="how_far_logo_complete.png" alt="HowFar Logo" />
          </div>
          <div className="mobile-stats-elevation">
            {imperialOrMetric === "imperial"
              ? <span>↑{eleUp.toFixed(0)}/↓{eleDown.toFixed(0)} ft</span> 
              : <span>↑{(eleUp / 3.28084).toFixed(0)}/↓{(eleDown / 3.28084).toFixed(0)} m</span>
            }
          </div>
        </div>
    </div>
  );
}

export default Map;
