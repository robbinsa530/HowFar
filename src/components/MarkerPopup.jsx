import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addUndoActionToList } from '../store/slices/routeSlice';
import { setMarkerPopupOpen } from '../store/slices/displaySlice';
import onMarkerDelete from '../actions/markerDelete';
import './MarkerPopup.css';

const MarkerPopup = (props) => {
  const mapRef = props.mapRef;
  const dispatch = useDispatch();
  const {
    markerPopupData
  } = useSelector((state) => state.display);

  const handleRemoveMarker = async () => {
    const undoActionInfo = await onMarkerDelete(mapRef.current, markerPopupData.id);

    // Allows for undo of 'delete' action
    dispatch(addUndoActionToList({
      type: 'delete',
      info: undoActionInfo
    }));
    dispatch(setMarkerPopupOpen(false));
  };

  return (
    <div>
      <button
        className="marker-popup-btn"
        onClick={handleRemoveMarker}
      >
        Delete Point
      </button>
    </div>
  );
};

export default MarkerPopup;
