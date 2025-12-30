import React from 'react';
import './MarkerIcon.css';

const ElevationProfileHoverMarkerIcon = ({ transparent = false }) => {
  let classes = 'gray-marker-pulse';
  if (transparent) {
    classes += ' transparent-elevation-profile-hover-marker';
  } else {
    classes += ' elevation-profile-hover-marker';
  }
  return (
    <div
      className={classes}
    />
  );
};

export default ElevationProfileHoverMarkerIcon;
