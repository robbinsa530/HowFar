import React from 'react';
import { useSelector } from 'react-redux';
import './PopupDistances.css';

const PopupDistances = () => {
  const {
    imperialOrMetric
  } = useSelector((state) => state.settings);
  const {
    distancesToDisplay
  } = useSelector((state) => state.distancePopup);

  return (
    <div className="distance-popup">
      {
        imperialOrMetric === "imperial"
        ? <p>{distancesToDisplay.toReversed().map(d => d.toFixed(2)).join("mi, ") + "mi"}</p>
        : <p>{distancesToDisplay.toReversed().map(d => (d*1.609344).toFixed(2)).join("km, ") + "km"}</p>
      }
    </div>
  );
};

export default PopupDistances;
