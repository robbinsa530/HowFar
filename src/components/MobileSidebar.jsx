import React, { useState } from 'react';
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
  setEditInfoOpen,
  setClearEditOpen,
} from '../store/slices/displaySlice';
import {
  setEditSelectingPoints
} from '../store/slices/editRouteSlice';

// Material/MUI
import MenuIcon from '@mui/icons-material/Menu';
import ClearIcon from '@mui/icons-material/Clear';
import UndoIcon from '@mui/icons-material/Undo';
import LoopIcon from '@mui/icons-material/Loop';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';

// Custom Components
import BlueSwitch from './material/BlueSwitch';
import BlueRadio from './material/BlueRadio';
import BlueSlider from './material/BlueSlider';

// Custom other stuff (actions, etc.)
import onOutAndBack from '../actions/outAndBack';
import onUndo from '../actions/undo/undo';
import { resetEditState } from '../controllers/ResetController';
import './MobileSidebar.css';

const MobileSidebar = (props) => {
  const mapRef = props.mapRef;
  const dispatch = useDispatch();
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const {
    geojson
  } = useSelector((state) => state.route);
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
  const { editInfoOpen } = useSelector((state) => state.display);
  const { editRedrawingRoute } = useSelector((state) => state.editRoute);

  const handleUndo = async () => {
    await onUndo(mapRef.current);
  };

  const handleOutAndBack = () => {
    onOutAndBack();
  };

  const handleOpenEditInfo = () => {
    if (editInfoOpen) {
      // If redrawing, we'll make sure they want to, else we'll just reset
      if (editRedrawingRoute) {
        dispatch(setClearEditOpen(true));
      } else {
        resetEditState();
      }
      return;
    }
    if (geojson.features.length === 0) {
      alert("No route to edit.");
      return;
    }
    dispatch(setEditInfoOpen(true));
    dispatch(setEditSelectingPoints(true));
  };

  const handleChangeDirectionsMode = (mode) => {
    dispatch(setDirectionsMode(mode));
  };

  const handleToggleStartEnd = (e) => {
    dispatch(setAddToStartOrEnd(e.target.value));
  };

  const handleChangeWalkwayBias = (_, newValue) => {
    dispatch(setWalkwayBias(newValue));
  };

  return (
    <div className="mobile-controls">
      {/* Floating Menu Button */}
      <div className="menu-btn-div">
        <Tooltip disableInteractive title={<Typography>More Options (Connect to apps, display, etc.)</Typography>}>
          <IconButton onClick={() => dispatch(setMenuOpen(true))} sx={{color:'white', margin:0, padding:0}}>
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </div>

      {/* Action Buttons */}
      <div className="mobile-action-buttons">
        <Tooltip disableInteractive title={<Typography>Clear route and all waypoints from map</Typography>}>
          <IconButton onClick={() => dispatch(setClearMapOpen(true))} sx={{color:'white'}}>
            <ClearIcon />
          </IconButton>
        </Tooltip>

        <Tooltip disableInteractive title={<Typography>Undo last action</Typography>}>
          <IconButton onClick={handleUndo} sx={{color:'white'}}>
            <UndoIcon />
          </IconButton>
        </Tooltip>

        <Tooltip disableInteractive title={<Typography>Out and back (Return to start point along the same route {editInfoOpen ? <b> (Disabled during edit)</b> : ''})</Typography>}>
          <span>
            <IconButton 
              onClick={handleOutAndBack}
              sx={{color:'white'}}
              disabled={editInfoOpen}
              >
              <LoopIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip disableInteractive title={<Typography>{editInfoOpen ? 'Cancel edit' : 'Edit route between two points'}</Typography>}>
          <IconButton onClick={handleOpenEditInfo} sx={{color:'white'}}>
            {editInfoOpen ? <EditOffIcon /> : <EditIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip disableInteractive title={<Typography>Toggle between walk/run and cycling directions</Typography>}>
          <IconButton onClick={() => handleChangeDirectionsMode(directionsMode === "walking" ? "cycling" : "walking")} sx={{color:'white'}}>
            {directionsMode === "walking" ? <DirectionsRunIcon /> : <DirectionsBikeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip disableInteractive title={<Typography>More controls</Typography>}>
          <IconButton onClick={() => setMobileControlsOpen(!mobileControlsOpen)} sx={{color:'white'}}>
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </div>

      {/* Mobile Stats Display */}
      <div className="mobile-stats">
        <div className="mobile-stats-main">
          <div className="mobile-stats-distance">
            {imperialOrMetric === 'imperial'
              ? `${distance.toFixed(2)} mi`
              : `${(distance * 1.60934).toFixed(2)} km`
            }
          </div>
          <div className="mobile-stats-logo">
            <img src="/how_far_logo_complete.png" alt="HowFar Logo" />
          </div>
          <div className="mobile-stats-elevation">
            {imperialOrMetric === 'imperial'
              ? `↑${elevationChange.eleUp.toFixed(0)}/↓${elevationChange.eleDown.toFixed(0)} Ft`
              : `↑${(elevationChange.eleUp / 3.28084).toFixed(0)}/↓${(elevationChange.eleDown / 3.28084).toFixed(0)} m`
            }
          </div>
        </div>
      </div>

      {/* Mobile Controls Popup */}
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
                  <BlueSwitch
                    checked={autoFollowRoadsEnabled}
                    onChange={(e) => dispatch(setAutoFollowRoadsEnabled(e.target.checked))}
                    name="autoFollowRoadsEnabled"
                  />
                }
                label="Auto follow roads"
                labelPlacement="start"
              />
            </Tooltip>
            <Tooltip disableInteractive title={<Typography>When enabled, tap + hold (on desktop, right click) will connect points with straight lines, ignoring any roads or obstacles</Typography>}>
              <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                value="right-click-enabled"
                control={
                  <BlueSwitch
                    checked={rightClickEnabled}
                    onChange={(e) => dispatch(setRightClickEnabled(e.target.checked))}
                    name="rightClickEnabled"
                  />
                }
                label="Tap + hold enabled"
                labelPlacement="start"
              />
            </Tooltip>
            <Tooltip disableInteractive title={<Typography>When enabled, clicking on one of your route's line segments will insert a new waypoint into the middle of that segment instead of at the end/beginning of the route</Typography>}>
              <FormControlLabel sx={{marginLeft:0, justifyContent:'space-between'}}
                value="add-marker-in-line-enabled"
                control={
                  <BlueSwitch
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

        <FormControl>
          <FormLabel sx={{"&.Mui-focused": { color: "white" }, textAlign: "left", color:"white"}}>Add new points to:</FormLabel>
          <Tooltip disableInteractive title={<Typography>Choose whether new waypoints are appended to the end of your route, or placed at the beginning before your start point {editInfoOpen ? <b> (Disabled during edit)</b> : ''}</Typography>}>
            <span>
              <RadioGroup
                row
                aria-labelledby="add-to-start-or-end-radio-group"
                defaultValue="add-to-end"
                name="add-to-start-or-end-radio-buttons-group"
                value={addToStartOrEnd}
                onChange={handleToggleStartEnd}
                sx={{ marginLeft: '-12px' }} // Hack to make radio buttons align with label
              >
                <FormControlLabel value="start" control={<BlueRadio disabled={editInfoOpen}/>} label="Beginning" />
                <FormControlLabel value="end" control={<BlueRadio disabled={editInfoOpen}/>} label="End" />
              </RadioGroup>
            </span>
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
  );
};

export default MobileSidebar;
