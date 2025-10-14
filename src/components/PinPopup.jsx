import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPinPopupOpen } from '../store/slices/displaySlice';
import onPinDelete from '../actions/pinDelete';
import './MarkerPopup.css'; // Reuse the same css as the marker popup

const PinPopup = () => {
  const dispatch = useDispatch();
  const {
    pinPopupData
  } = useSelector((state) => state.display);

  const handleRemovePin = () => {
    onPinDelete(pinPopupData.id);
    dispatch(setPinPopupOpen(false));
  };

  return (
    <div>
      {pinPopupData.name && (
        <div style={{
          color: 'black',
          marginBottom: '8px', 
          fontWeight: 'bold',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {pinPopupData.name}
        </div>
      )}
      <button
        className="marker-popup-btn"
        onClick={handleRemovePin}
      >
        Delete Pin
      </button>
    </div>
  );
};

export default PinPopup;
