/*
 DEPRECATED. MOBILE NOW USES THE ELEVATION PROFILE FLOATER. (12/21/2025)
 TODO: Remove this file once we're sure the other method is working well.
*/

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setElevationProfileOpen } from '../../store/slices/displaySlice';
import {
  setElevationProfileHoverMarker,
  setRemovedElevationProfileHoverMarker
} from '../../store/slices/elevationSlice';
import ElevationProfileChart from '../ElevationProfileChart';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import './ElevationProfileDialog.css';

function ElevationProfileDialog() {
  const dispatch = useDispatch();
  const { elevationProfileOpen } = useSelector((state) => state.display);

  const handleClose = () => {
    dispatch(setElevationProfileOpen(false));
    dispatch(setElevationProfileHoverMarker({ display: false, longitude: -1, latitude: -1 }));
    dispatch(setRemovedElevationProfileHoverMarker({ display: false, longitude: -1, latitude: -1 }));
  };

  return (
    <Dialog
      open={elevationProfileOpen}
      onClose={handleClose}
      className="elevation-profile-dialog"
    >
      <DialogTitle>Elevation Profile</DialogTitle>
      <DialogContent>
        <div className="elevation-profile-chart">
          <ElevationProfileChart/>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ElevationProfileDialog;
