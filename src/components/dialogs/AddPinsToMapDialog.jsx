import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setAddPinOnNextClick
} from '../../store/slices/mapSlice';
import {
  setMenuOpen,
  setAddPinsToMapOpen
} from '../../store/slices/displaySlice';
import {
  addPinAtCoordinates,
  removeAllPins
} from '../../controllers/PinController';

import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

function AddPinsToMapDialog() {
  const dispatch = useDispatch();
  const {
    addPinsToMapOpen
  } = useSelector((state) => state.display);

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [useCommaSeparated, setUseCommaSeparated] = useState(false);
  const [commaSeparatedValue, setCommaSeparatedValue] = useState('');

  const handleCancel = () => {
    dispatch(setAddPinsToMapOpen(false));
    dispatch(setMenuOpen(false));
    setLatitude('');
    setLongitude('');
    setCommaSeparatedValue('');
  };

  const handleAddPinOnNextClick = () => {
    dispatch(setAddPinOnNextClick(true));
    handleCancel()
  };

  const handleAddPinAtCoordinates = () => {
    let lat, lon;

    if (useCommaSeparated) {
      const parsed = parseCommaSeparatedCoordinates(commaSeparatedValue);
      if (parsed) {
        lat = parsed.latitude;
        lon = parsed.longitude;
      }
    } else {
      lat = latitude;
      lon = longitude;
    }
    
    if (lat && lon) {
      addPinAtCoordinates(parseFloat(lat), parseFloat(lon));
      handleCancel();
    }
  };

  const handleRemoveAllPins = () => {
    removeAllPins();
    handleCancel();
  };

  // Validate if inputs are valid floats
  const isValidFloat = (value) => {
    if (value === '' || value === '-' || value === '+') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && value === num.toString();
  };

  // Parse comma-separated coordinates (e.g., "40.7128, -74.0060" or "40.7128,-74.0060")
  const parseCommaSeparatedCoordinates = (value) => {
    // Regex to match: optional whitespace, float, optional whitespace, comma, optional whitespace, float, optional whitespace
    const regex = /^\s*([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\s*$/;
    const match = value.match(regex);

    if (match) {
      const lat = match[1];
      const lon = match[2];

      if (isValidFloat(lat) && isValidFloat(lon)) {
        return { latitude: lat, longitude: lon };
      }
    }
    return null;
  };

  const areCoordinatesValid = useCommaSeparated 
    ? parseCommaSeparatedCoordinates(commaSeparatedValue) !== null
    : isValidFloat(latitude) && isValidFloat(longitude);

  return (
    <Dialog
      open={addPinsToMapOpen}
      onClose={handleCancel}
    >
      <DialogTitle>Add pin to map</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Helper pins are separate from your route and will not be used for routing or distance calculations. They just serve as visual guides while routing. They can be deleted by clicking them, or by opening this popup and clicking "Remove All Pins"
        </Typography>

        {/* Row 1: Add pin on next map click */}
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained"
            onClick={handleAddPinOnNextClick}
            fullWidth
          >
            Add pin on next map click
          </Button>
        </Box>

        {/* Row 2: Add pin at coordinates */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Or, add pin at coordinates
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={useCommaSeparated}
                onChange={(e) => setUseCommaSeparated(e.target.checked)}
                size="small"
              />
            }
            label="Comma separated lat/lon"
            sx={{ mb: 1 }}
          />

          {useCommaSeparated ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Latitude, Longitude"
                value={commaSeparatedValue}
                onChange={(e) => setCommaSeparatedValue(e.target.value)}
                size="small"
                placeholder="e.g. 40.7128, -74.0060"
                sx={{ flex: 1 }}
              />
              <Button 
                variant="contained"
                onClick={handleAddPinAtCoordinates}
                disabled={!areCoordinatesValid}
                sx={{ flexShrink: 0 }}
              >
                Add Pin
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                size="small"
                placeholder="e.g. 40.7128"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                size="small"
                placeholder="e.g. -74.0060"
                sx={{ flex: 1 }}
              />
              <Button 
                variant="contained"
                onClick={handleAddPinAtCoordinates}
                disabled={!areCoordinatesValid}
                sx={{ flexShrink: 0 }}
              >
                Add Pin
              </Button>
            </Box>
          )}
        </Box>

        {/* Row 3: Remove all pins */}
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained"
            color="error"
            onClick={handleRemoveAllPins}
            fullWidth
          >
            Remove All Pins
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddPinsToMapDialog;