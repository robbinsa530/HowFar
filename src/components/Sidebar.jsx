import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setDirectionsMode,
  setAddToStartOrEnd,
  setWalkwayBias,
  setAutoFollowRoadsEnabled,
  setRightClickEnabled,
  setAddMarkerInLineEnabled
} from '../store/slices/settingsSlice';
import {
  setMenuOpen,
  setClearMapOpen,
} from '../store/slices/displaySlice';

// Material/MUI
import MenuIcon from '@mui/icons-material/Menu';
import ClearIcon from '@mui/icons-material/Clear';
import UndoIcon from '@mui/icons-material/Undo';
import LoopIcon from '@mui/icons-material/Loop';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Custom Components
import BlueSwitch from './material/BlueSwitch';
import BlueRadio from './material/BlueRadio';
import BlueSlider from './material/BlueSlider';
import DirectionModeButton from './material/DirectionModeButton';

// Custom other stuff (actions, etc.)
import onOutAndBack from '../actions/outAndBack';
import onUndo from '../actions/undo/undo';
import './Sidebar.css';

const Sidebar = (props) => {
  const mapRef = props.mapRef;
  const dispatch = useDispatch();
  const {
    distance,
    elevationChange
  } = useSelector((state) => state.map);
  const {
    directionsMode,
    autoFollowRoadsEnabled,
    rightClickEnabled,
    addMarkerInLineEnabled,
    addToStartOrEnd,
    walkwayBias,
    imperialOrMetric
  } = useSelector((state) => state.settings);

  const handleUndo = async () => {
    await onUndo(mapRef.current);
  };

  const handleOutAndBack = () => {
    onOutAndBack();
  };

  return (
    <div id="sidebar-content" className="sidebar-content desktop-controls">
      <div id="sidebar" className="sidebar">
        {/* Menu Button */}
        <div className="menu-btn-div">
          <Tooltip disableInteractive title={<Typography>More Options (Connect to apps, display, etc.)</Typography>}>
            <IconButton onClick={() => dispatch(setMenuOpen(true))} sx={{color:'white', margin:0, padding:0}}>
              <MenuIcon />
            </IconButton>
          </Tooltip>
        </div>

        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src="/how_far_logo_complete.png"
            alt="HowFar Logo"
            width="225px"
            onLoad={() => {
              // Prevents area below sidebar from blocking map clicks
              // Has to be tied to this img b/c sidebar height isn't calculated fully until this img loads
              const sidebar = document.getElementById("sidebar");
              const sidebarContent = document.getElementById("sidebar-content");
              let sidebarHeight = sidebar.offsetHeight;
              if (sidebarHeight) {
                sidebarContent.style.maxHeight = sidebarHeight.toString() + "px";
              }
              // No else, would rather not hardcode any px values
            }}
          />
        </div>

        {/* Distance Display */}
        <div className="sidebar-distance">
          Distance: {imperialOrMetric === 'imperial' 
            ? `${distance.toFixed(2)} Miles`
            : `${(distance * 1.60934).toFixed(2)} km`
          }
        </div>

        {/* Elevation Display */}
        <div className="elevation-container">
          <div className="sidebar-elevation">Elevation Gain/Loss:</div>
          <div className="sidebar-elevation">
            {imperialOrMetric === 'imperial'
              ? `${elevationChange.eleUp.toFixed(2)}/${elevationChange.eleDown.toFixed(2)} Ft`
              : `${(elevationChange.eleUp / 3.28084).toFixed(2)}/${(elevationChange.eleDown / 3.28084).toFixed(2)} m`
            }
          </div>
        </div>

        {/* Action Buttons */}
        <Stack className="sidebar-btn-container" spacing={2} direction="row">
          <Tooltip disableInteractive title={<Typography>Clear route and all waypoints from map</Typography>}>
            <Button variant="contained" onClick={() => dispatch(setClearMapOpen(true))} startIcon={<ClearIcon />}>
              Clear
            </Button>
          </Tooltip>
          <Tooltip disableInteractive title={<Typography>Undo last action</Typography>}>
            <Button variant="contained" onClick={handleUndo} startIcon={<UndoIcon />}>
              Undo
            </Button>
          </Tooltip>
        </Stack>

        <Stack className="sidebar-btn-container" spacing={2} direction="row">
          <Tooltip disableInteractive title={<Typography>Return to start point along the same route</Typography>}>
            <Button variant="contained" onClick={handleOutAndBack} startIcon={<LoopIcon />}>
              Out & Back
            </Button>
          </Tooltip>
        </Stack>

        <hr className="sidebar-hr" />

        {/* Direction Mode Toggle */}
        <Stack className="sidebar-btn-container direction-mode-stack" spacing={0} direction="row">
          <Tooltip disableInteractive title={<Typography>Walk/run directions</Typography>}>
            <DirectionModeButton
              variant="contained"
              value="walking"
              onClick={() => dispatch(setDirectionsMode('walking'))}
              className={`direction-mode-button-left ${
                directionsMode === "walking"
                  ? "direction-mode-button-selected"
                  : "direction-mode-button-unselected"
              }`}
            >
              <DirectionsRunIcon />
            </DirectionModeButton>
          </Tooltip>
          <Tooltip disableInteractive title={<Typography>Cycling directions</Typography>}>
            <DirectionModeButton
              variant="contained"
              value="cycling"
              onClick={() => dispatch(setDirectionsMode('cycling'))}
              className={`direction-mode-button-right ${
                directionsMode === "cycling"
                  ? "direction-mode-button-selected"
                  : "direction-mode-button-unselected"
              }`}
            >
              <DirectionsBikeIcon />
            </DirectionModeButton>
          </Tooltip>
        </Stack>

        <hr className="sidebar-hr" />

        {/* Toggle Controls */}
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormGroup aria-label="boolean-switches">
            <Tooltip disableInteractive title={<Typography>When enabled, routes between points will follow streets and pathways</Typography>}>
              <FormControlLabel
                value="auto-follow-roads"
                control={
                  <BlueSwitch 
                    sx={{marginRight:'10px'}}
                    checked={autoFollowRoadsEnabled}
                    onChange={(e) => dispatch(setAutoFollowRoadsEnabled(e.target.checked))} 
                    name="autoFollowRoadsEnabled"
                  />
                }
                label="Auto follow roads"
                labelPlacement="start"
              />
            </Tooltip>
            <Tooltip disableInteractive title={<Typography>When enabled, right clicks (on mobile, tap + hold) will connect points with straight lines, ignoring any roads or obstacles</Typography>}>
              <FormControlLabel
                value="right-click-enabled"
                control={
                  <BlueSwitch
                    sx={{marginRight:'10px'}}
                    checked={rightClickEnabled} 
                    onChange={(e) => dispatch(setRightClickEnabled(e.target.checked))} 
                    name="rightClickEnabled"
                  />
                }
                label="Right click enabled"
                labelPlacement="start"
              />
            </Tooltip>
            <Tooltip disableInteractive title={<Typography>When enabled, clicking on one of your route's line segments will insert a new waypoint into the middle of that segment instead of at the end/beginning of the route</Typography>}>
              <FormControlLabel
                value="add-marker-in-line-enabled"
                control={
                  <BlueSwitch
                    sx={{marginRight:'10px'}}
                    checked={addMarkerInLineEnabled}
                    onChange={(e) => dispatch(setAddMarkerInLineEnabled(e.target.checked))} 
                    name="addMarkerInLineEnabled"
                  />
                }
                label="Edit lines on click"
                labelPlacement="start"
              />
            </Tooltip>
          </FormGroup>
        </FormControl>

        <hr className="sidebar-hr" />

        {/* Add new points to */}
        <FormControl sx={{ width: '100%' }}>
          <FormLabel sx={{"&.Mui-focused": { color: "white" }, textAlign: "center", color:"white", marginBottom: "0px"}}>
            Add new points to:
          </FormLabel>
          <Tooltip disableInteractive title={<Typography>Choose whether new waypoints are appended to the end of your route, or placed at the beginning before your start point</Typography>}>
            <RadioGroup
              row
              aria-labelledby="add-to-start-or-end-radio-group"
              defaultValue="add-to-end"
              name="add-to-start-or-end-radio-buttons-group"
              value={addToStartOrEnd}
              onChange={(e) => dispatch(setAddToStartOrEnd(e.target.value))}
            >
              <FormControlLabel value="start" control={<BlueRadio />} label="Beginning" />
              <FormControlLabel value="end" control={<BlueRadio />} label="End" />
            </RadioGroup>
          </Tooltip>
        </FormControl>

        <hr className="sidebar-hr" />

        {/* Walkway Bias Slider */}
        <FormControl fullWidth>
          <FormLabel sx={{textAlign: "center", color:"white"}}>When routing, favor:</FormLabel>
          <BlueSlider
            aria-label="Walkway-Bias"
            value={walkwayBias}
            onChange={(_, newValue) => dispatch(setWalkwayBias(newValue))}
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
  );
};

export default Sidebar;
