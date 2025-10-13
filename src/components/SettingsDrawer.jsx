import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setMapType
} from '../store/slices/mapSlice';
import {
  setImperialOrMetric,
  setDisplayDistancePopupEnabled,
  setDisplayChevronsEnabled,
  setShowUserLocationEnabled
} from '../store/slices/settingsSlice';
import {
  setMenuOpen,
  setPostToStravaOpen,
  setExportActivityOpen,
  setImportActivityOpen,
  setAddPinsToMapOpen
} from '../store/slices/displaySlice';
import {
  setConnectedToStrava
} from '../store/slices/externalSlice';


// Material/MUI
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

// Custom Components/etc
import BlueSwitch from './material/BlueSwitch';
import BlueRadio from './material/BlueRadio';
import BlueSelect from './material/BlueSelect';
import ConnectWithStrava from '../assets/ConnectWithStrava';
import CompatibleWithStrava from '../assets/CompatibleWithStrava';
import { connectToStrava, checkUserHasToken } from '../controllers/StravaController';
import './SettingsDrawer.css';

const SettingsDrawer = () => {
  const dispatch = useDispatch();
  const {
    mapType,
    mapboxToken,
    distance,
    elevationChange
  } = useSelector((state) => state.map);
  const {
    markers,
    geojson
  } = useSelector((state) => state.route);
  const {
    menuOpen,
    editInfoOpen,
    isMobile
  } = useSelector((state) => state.display);
  const {
    imperialOrMetric,
    displayChevronsEnabled,
    displayDistancePopupEnabled,
    showUserLocationEnabled
  } = useSelector((state) => state.settings);
  const {
    connectedToStrava
  } = useSelector((state) => state.external);

  const handleConnectToStrava = () => {
    connectToStrava();
  };

  const handlePostToStravaClick = async () => {
    const checkResp = await checkUserHasToken();
    if (checkResp.ok) {
      const data = await checkResp.json();
      dispatch(setConnectedToStrava(data.hasToken)); // Just in case server has different data than state
      if (data.hasToken) {
        console.info('User has token saved. Allowing post to Strava');
        dispatch(setPostToStravaOpen(true));
      } else {
        alert('You must log into Strava using the "Connect With Strava" button before posting activity');
      }
    }  else {
      console.error("Error checking Strava user status.");
      alert("Failed to authenticate");
    }
  };

  const handle3DVisualizationClick = () => {
    if (geojson.features.length === 0) {
      alert("No route to visualize.");
      return;
    }

    // Prepare route data for 3D visualization
    const routeData = {
      geojson: geojson,
      mapboxAccessToken: mapboxToken,
      totalDistance: distance,
      elevationUp: elevationChange.eleUp,
      elevationDown: elevationChange.eleDown
    };

    // Store route data in localStorage for the new window to access
    localStorage.setItem('howfar_route_3d_data', JSON.stringify(routeData));

    // Open new tab with 3D visualization
    window.open('/3d-visualization.html', '_blank');
  };

  // const handleSaveRouteClick = () => {
  //   console.log('Save & Share Route');
  // };

  const handleImportActivityClick = () => {
    dispatch(setImportActivityOpen(true));
  };

  const handleExportActivityClick = () => {
    if (geojson.features.length === 0) {
      alert("Cannot export blank route.");
      return;
    }
    dispatch(setExportActivityOpen(true));
  };

  useEffect(() => {
    if (isMobile) {
      dispatch(setDisplayDistancePopupEnabled(false));
    }
  }, [dispatch, isMobile]);

  return (
    <Drawer
      open={menuOpen}
      onClose={() => dispatch(setMenuOpen(false))}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "rgb(55 75 95)",
            width: '300px',
            maxWidth: '90vw'
          }
        }
      }}
    >
      <div className="settings-drawer">
        {/* Header with back button */}
        <div className="drawer-header">
          <Button
            variant="outlined"
            onClick={() => dispatch(setMenuOpen(false))}
            sx={{ color: 'white', margin: 0, padding: 0 }}
          >
            <KeyboardBackspaceIcon />
          </Button>
        </div>

        {/* Strava Connection Section */}
        <div className="strava-section">
          <Tooltip disableInteractive title={<Typography>Connect with Strava</Typography>}>
            <Button onClick={handleConnectToStrava} className="strava-connect-button">
              <ConnectWithStrava />
            </Button>
          </Tooltip>

          {connectedToStrava != null && (
            <div className="strava-status">
              <span className="status-text">{!connectedToStrava && "Not "}Connected</span>
              {connectedToStrava ? (
                <CheckCircleIcon className="status-icon connected" />
              ) : (
                <CancelIcon className="status-icon disconnected" />
              )}
            </div>
          )}

          <Tooltip disableInteractive title={<Typography>Post route to connected App(s) {editInfoOpen ? <b> (Disabled during edit)</b> : ''}</Typography>}>
            <span>
              <Button
                className="action-button"
                variant="contained"
                onClick={handlePostToStravaClick}
                disabled={editInfoOpen}
              >
                Post Activity
              </Button>
            </span>
          </Tooltip>
        </div>

        {/* Display Options Section */}
        <div className="settings-section">
          <div className="section-divider" />
          <Typography variant="h6" className="section-title">Display Options:</Typography>

          <FormControl fullWidth className="form-control" sx={{ marginTop: '8px', marginBottom: '8px' }}>
            <InputLabel sx={{ color: "white", fontSize: "1.1em", "&.Mui-focused": { color: "white" } }}>
              Map type
            </InputLabel>
            <BlueSelect
              labelId="select-map-type"
              id="select-map-type"
              label="Map type"
              value={mapType}
              onChange={(e) => dispatch(setMapType(e.target.value))}
            >
              <MenuItem value={0}>Standard</MenuItem>
              <MenuItem value={1}>Outdoors</MenuItem>
              <MenuItem value={2}>Satellite</MenuItem>
              <MenuItem value={3}>Dark Theme</MenuItem>
            </BlueSelect>
          </FormControl>

          <FormControl className="form-control" sx={{ marginTop: '8px', marginBottom: '8px' }}>
            <FormLabel sx={{ "&.Mui-focused": { color: "white" }, textAlign: "left", color: "white" }}>
              Display Distances As:
            </FormLabel>
            <Tooltip disableInteractive title={<Typography>Choose whether to use mi/ft or km/m</Typography>}>
              <RadioGroup
                row
                aria-labelledby="metric-or-imperial-radio-group"
                defaultValue="imperial"
                name="metric-or-imperial-radio-buttons-group"
                value={imperialOrMetric}
                onChange={(e) => dispatch(setImperialOrMetric(e.target.value))}
              >
                <FormControlLabel value="imperial" control={<BlueRadio />} label="Imperial" />
                <FormControlLabel value="metric" control={<BlueRadio />} label="Metric" />
              </RadioGroup>
            </Tooltip>
          </FormControl>

          <Tooltip disableInteractive title={<Typography>When enabled, route lines will show arrows to indicate direction</Typography>}>
            <FormControlLabel
              sx={{ marginLeft: 0, marginRight: 0, width: "100%", justifyContent: 'space-between' }}
              value="display-chevrons"
              control={
                <BlueSwitch
                  checked={displayChevronsEnabled}
                  onChange={(e) => dispatch(setDisplayChevronsEnabled(e.target.checked))}
                  name="displayChevrons"
                />
              }
              label="Route Arrows"
              labelPlacement="start"
            />
          </Tooltip>

          <Tooltip disableInteractive title={<Typography>Show your current location dot on the map after clicking the find my location button on the map</Typography>}>
            <FormControlLabel
              sx={{ marginLeft: 0, marginRight: 0, width: "100%", justifyContent: 'space-between' }}
              value="display-user-location"
              control={
                <BlueSwitch
                  checked={showUserLocationEnabled}
                  onChange={(e) => dispatch(setShowUserLocationEnabled(e.target.checked))}
                  name="displayUserLocation"
                />
              }
              label={
                <div>
                  <Typography  component="span">
                    Show My Location
                  </Typography>
                  <Typography 
                      component="span" 
                      sx={{ 
                        display: 'block', 
                        fontSize: '0.75rem', 
                      }}
                    >
                      (On "Find My Location" Click)
                    </Typography>
                </div>
              }
              labelPlacement="start"
            />
          </Tooltip>

          <Tooltip disableInteractive title={<Typography>When enabled, hovering over your route will display the distance along the route of the point under your mouse {isMobile ? <b> (Unavailable on mobile)</b> : ''}</Typography>}>
            <FormControlLabel
              sx={{ marginLeft: 0, marginRight: 0, width: "100%", justifyContent: 'space-between' }}
              value="display-distance-popup"
              disabled={isMobile}
              control={
                <BlueSwitch
                  disabled={isMobile}
                  checked={displayDistancePopupEnabled}
                  onChange={(e) => dispatch(setDisplayDistancePopupEnabled(e.target.checked))}
                  name="displayDistancePopup"
                />
              }
              label={
                <div>
                  <Typography 
                    component="span"
                    sx={{ color: isMobile ? '#88888899' : 'inherit' }}
                  >
                    Distance on Hover
                  </Typography>
                  {isMobile && (
                    <Typography 
                      component="span" 
                      sx={{ 
                        display: 'block', 
                        fontSize: '0.75rem', 
                        color: '#88888899' 
                      }}
                    >
                      (Unavailable on mobile)
                    </Typography>
                  )}
                </div>
              }
              labelPlacement="start"
            />
          </Tooltip>
        </div>

        {/* Extras Section */}
        <div className="settings-section">
          <div className="section-divider" />
          <Typography variant="h6" className="section-title">Extras:</Typography>

          <Tooltip disableInteractive title={<Typography>Add helper pins to the map. These pins are managed separately from your route</Typography>}>
            <Button
              className="action-button"
              variant="contained"
              onClick={() => dispatch(setAddPinsToMapOpen(true))}
            >
              Add/Remove Pins
            </Button>
          </Tooltip>
        </div>

        {/* Visualize Section */}
        <div className="settings-section">
          <div className="section-divider" />
          <Typography variant="h6" className="section-title">Visualize:</Typography>

          {markers.length > 1 ? (
            <Tooltip disableInteractive title={<Typography>View 3D cinematic animation of your route {editInfoOpen ? <b> (Disabled during edit)</b> : ''}</Typography>}>
              <span>
                <Button
                  className="action-button"
                  variant="contained"
                  onClick={handle3DVisualizationClick}
                  startIcon={<ThreeDRotationIcon />}
                  disabled={editInfoOpen}
                >
                  View 3D Visualization
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Typography className="placeholder-text">
              Add a route first by clicking on the map
            </Typography>
          )}
        </div>

        {/* TODO: Save & Share Section */}
        {/* <div className="settings-section">
          <div className="section-divider" />
          <Typography variant="h6" className="section-title">Save & Share:</Typography>

          <div className="button-group">
            <Tooltip disableInteractive title={<Typography>Save route and get a shareable link</Typography>}>
              <Button
                className="action-button"
                variant="contained"
                onClick={handleSaveRouteClick}
              >
                Save Route
              </Button>
            </Tooltip>
          </div>
        </div> */}

        {/* Import / Export Section */}
        <div className="settings-section">
          <div className="section-divider" />
          <Typography variant="h6" className="section-title">Import / Export:</Typography>

          <div className="button-group">
            <Tooltip disableInteractive title={<Typography>Import a route from a .gpx file</Typography>}>
              <Button
                className="action-button"
                variant="contained"
                onClick={handleImportActivityClick}
              >
                Import Activity
              </Button>
            </Tooltip>

            <Tooltip disableInteractive title={<Typography>Export route as a .gpx file {editInfoOpen ? <b> (Disabled during edit)</b> : ''}</Typography>}>
              <span>
                <Button
                  className="action-button"
                  variant="contained"
                  onClick={handleExportActivityClick}
                  disabled={editInfoOpen}
                >
                  Export Activity
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <div className="footer-links">
            <a
              href="/help.html"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              How-To
            </a>
            <a
              href="/FAQ.html"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              FAQ
            </a>
            <a
              href="https://github.com/robbinsa530/HowFar"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              Source Code
            </a>
            <a
              href="https://www.paypal.me/AlexRobbins662"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              Donate
            </a>
          </div>

          <div className="copyright">
            <small>&copy; Copyright 2024-{new Date().getFullYear()}</small>
            <small>Alex Robbins</small>
            <small>All Rights Reserved.</small>
          </div>

          {/* Show CompatibleWithStrava on mobile only - at the very bottom */}
          {isMobile && (
            <div className="mobile-strava-compatible" style={{ textAlign: 'center', margin: '4px 0' }}>
              <CompatibleWithStrava />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default SettingsDrawer;
