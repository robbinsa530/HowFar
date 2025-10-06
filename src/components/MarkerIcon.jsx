import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setMouseDownCoords } from '../store/slices/markerDragSlice';
import { setMouseOnMarker } from '../store/slices/mapSlice';
import './MarkerIcon.css';

const MarkerIcon = ({ id }) => {
  const { markers } = useSelector((state) => state.route);
  const dispatch = useDispatch();

  const getMarkerIconClassName = () => {
    // Find the index of this marker in the markers array
    const markerIndex = markers.findIndex(marker => marker.id === id);

    // If marker not found, return default class
    // This should never happen
    if (markerIndex === -1) {
      return 'marker';
    }

    // If this is the first marker in the array, it's a start marker
    if (markerIndex === 0) {
      return 'start-marker';
    }

    // If this is the last marker in the array, it's an end marker
    // Technically don't want this when markers length === 1, but that
    // will be handled by the start-marker case above
    if (markerIndex === markers.length - 1) {
      return 'end-marker';
    }

    // Otherwise, it's a regular marker
    return 'marker';
  };

  return (
    <div
      onMouseDown={(e) => { dispatch(setMouseDownCoords({ x: e.clientX, y: e.clientY })); }}
      // onMouseUp={(e) => { ... }} // We shouldn't need this one
      onMouseEnter={(e) => { dispatch(setMouseOnMarker(true)); }}
      onMouseLeave={(e) => { dispatch(setMouseOnMarker(false)); }}
      style={{cursor: 'pointer'}}
      className={getMarkerIconClassName()}
    />
  );
};

export default MarkerIcon;
