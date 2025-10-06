import React from 'react';
import { useSelector } from 'react-redux';

// Material/MUI
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Custom Components/etc.
import CompatibleWithStrava from '../assets/CompatibleWithStrava';
import {
  onClearDefaultLocation,
  onSaveDefaultLocation
} from '../actions/defaultLocation';
import './BottomFloater.css';

const BottomFloater = () => {
  const {
    hasDefaultLocation
  } = useSelector((state) => state.map);

  return (
    <div className="bottom-floater-container">
      <div className={"default-location-button"}>
        <Tooltip disableInteractive title={<Typography>
          {hasDefaultLocation ? "Clear saved default start location" : "Save current view as default start location when the map loads"}
        </Typography>}>
          <Button
            variant="contained"
            onClick={hasDefaultLocation ? onClearDefaultLocation : onSaveDefaultLocation}
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
      <div className="bottom-floater">
        <CompatibleWithStrava />
      </div>
    </div>
  );
};

export default BottomFloater;
