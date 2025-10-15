import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setAddPinOnNextClick,
  setPendingPinName,
  setPendingPinColor
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
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

const PIN_COLORS = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'orange', label: 'Orange' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' }
];

function AddPinsToMapDialog() {
  const dispatch = useDispatch();
  const {
    addPinsToMapOpen
  } = useSelector((state) => state.display);

  const [pinName, setPinName] = useState('');
  const [pinColor, setPinColor] = useState('red');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [useCommaSeparated, setUseCommaSeparated] = useState(false);
  const [commaSeparatedValue, setCommaSeparatedValue] = useState('');

  const handleCancel = () => {
    dispatch(setAddPinsToMapOpen(false));
    dispatch(setMenuOpen(false));
    setPinName('');
    setPinColor('red');
    setLatitude('');
    setLongitude('');
    setCommaSeparatedValue('');
  };

  const handleAddPinOnNextClick = () => {
    dispatch(setPendingPinName(pinName));
    dispatch(setPendingPinColor(pinColor));
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
      addPinAtCoordinates(parseFloat(lat), parseFloat(lon), pinName, pinColor);
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

        {/* Pin Name and Color inputs */}
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Pin Name (Optional)"
            value={pinName}
            onChange={(e) => setPinName(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1.5 }}
            placeholder="e.g. MyDestination"
          />
          <FormControl fullWidth size="small">
            <InputLabel id="pin-color-label">Pin Color</InputLabel>
            <Select
              labelId="pin-color-label"
              value={pinColor}
              label="Pin Color"
              onChange={(e) => setPinColor(e.target.value)}
            >
              {PIN_COLORS.map((color) => (
                <MenuItem key={color.value} value={color.value}>
                  {color.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

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