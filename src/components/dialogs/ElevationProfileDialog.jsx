import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setElevationProfileOpen } from '../../store/slices/displaySlice';
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
