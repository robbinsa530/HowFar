import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPinPopupOpen } from '../store/slices/displaySlice';
import onPinDelete from '../actions/pinDelete';
import { useEditableRoute } from '../context/EditableRouteContext';
import './MarkerPopup.css'; // Reuse the same css as the marker popup

const PinPopup = () => {
  const dispatch = useDispatch();
  const editableRoute = useEditableRoute();
  const {
    pinPopupData
  } = useSelector((state) => state.display);

  const handleRemovePin = () => {
    onPinDelete(pinPopupData.id);
    dispatch(setPinPopupOpen(false));
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {pinPopupData.name && (
        <div style={{
          color: 'black',
          marginBottom: '8px', 
          fontWeight: 'bold',
          fontSize: '14px',
          textAlign: 'center',
          wordWrap: 'break-word',
          maxWidth: '200px'
        }}>
          {pinPopupData.name}
        </div>
      )}
      {editableRoute && (
      <button
        className="marker-popup-btn"
        onClick={handleRemovePin}
      >
        Delete Pin
      </button>
      )}
    </div>
  );
};

export default PinPopup;
