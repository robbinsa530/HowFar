import React from 'react';
import { useDispatch } from 'react-redux';
import { setElevationProfileOpen } from '../store/slices/displaySlice';
import ElevationProfileChart from './ElevationProfileChart';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import './ElevationProfileFloater.css';

const ElevationProfileFloater = () => {
  const dispatch = useDispatch();

  const handleClose = () => {
    dispatch(setElevationProfileOpen(false));
  };

  return (
    <div className="elevation-profile-container">
      <div className="elevation-profile-header">
        <span className="elevation-profile-title">Elevation Profile</span>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'rgba(255, 255, 255, 1.0)',
            padding: '4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
      <ElevationProfileChart/>
    </div>
  );
};

export default ElevationProfileFloater;
