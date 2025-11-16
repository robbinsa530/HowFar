import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setEditRedrawingRoute,
} from '../store/slices/editRouteSlice';
import { setClearEditOpen } from '../store/slices/displaySlice';
import { resetEditState } from '../controllers/ResetController';
import {
  beginEditRouteBetweenPoints,
  finishEditRouteBetweenPoints
} from '../controllers/EditController';
import './EditInfoBox.css';

// MUI
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';

const EditInfoBox = () => {
  const dispatch = useDispatch();
  let [ numPointsSelected, setNumPointsSelected ] = useState(0);
  const {
    markers
  } = useSelector((state) => state.route);
  const {
    editInfoOpen,
    newElevationLoading
  } = useSelector((state) => state.display);
  const {
    editSelectingPoints,
    editRedrawingRoute,
    editGapClosed
  } = useSelector((state) => state.editRoute);
  const {
    newDistance,
    newElevationChange
  } = useSelector((state) => state.map);
  const {
    imperialOrMetric
  } = useSelector((state) => state.settings);

  function onClose() {
    // If redrawing, we'll make sure they want to, else we'll just reset
    if (editRedrawingRoute) {
      dispatch(setClearEditOpen(true));
    } else {
      resetEditState();
    }
  }

  function onBegin() {
    beginEditRouteBetweenPoints();
    dispatch(setEditRedrawingRoute(true));
  }

  function onFinish() {
    finishEditRouteBetweenPoints();
  }

  useEffect(() => {
    setNumPointsSelected(markers.filter(m => m.selectedForEdit).length);
  }, [markers]);


  if (!editInfoOpen) return null;

  return (
    <Paper elevation={6} className={"edit-info-box"}>
      <div className="edit-info-header">
        <Typography variant="h7" component="div" className="edit-info-title">Edit route between 2 points</Typography>
        <IconButton
          sx={{color: 'white'}}
          size="small"
          onClick={onClose}
          className="edit-info-close"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <div className={`edit-step edit-step-1 ${editSelectingPoints ? 'active' : 'inactive'}`}>
        <Typography variant="body2" className="edit-step-text">1. Select 2 waypoints to begin</Typography>
        <Button
          variant="contained"
          size="small"
          onClick={onBegin}
          disabled={!editSelectingPoints || numPointsSelected !== 2}
          className="edit-step-button"
        >
          Begin
        </Button>
      </div>

      <div className={`edit-step edit-step-2 ${editRedrawingRoute ? 'active' : 'inactive'}`}>
        <Typography variant="body2" className="edit-step-text">2. Redraw section, then click the other glowing waypoint to close the gap</Typography>
        <Button
          variant="contained"
          size="small"
          onClick={onFinish}
          disabled={!editRedrawingRoute || !editGapClosed}
          className="edit-step-button"
        >
          Finish
        </Button>
      </div>

      {editRedrawingRoute && (
        <div className="edit-info-stats">
          <Typography variant="body2" className="edit-stat-text">
            New: {imperialOrMetric === 'imperial'
              ? `${newDistance.toFixed(2)} mi`
              : `${(newDistance * 1.609344).toFixed(2)} km`
            }
          </Typography>
          <Typography variant="body2" className="edit-stat-text">
            Elev: { newElevationLoading ? '↑.../↓...' :
              (imperialOrMetric === 'imperial'
                ? `↑${newElevationChange.eleUp.toFixed(0)} / ↓${newElevationChange.eleDown.toFixed(0)} ft`
                : `↑${(newElevationChange.eleUp / 3.28084).toFixed(0)} / ↓${(newElevationChange.eleDown / 3.28084).toFixed(0)} m`
              )
            }
          </Typography>
        </div>
      )}
    </Paper>
  );
};

export default EditInfoBox;

