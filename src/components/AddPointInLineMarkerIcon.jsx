import React from 'react';
import { useDispatch } from 'react-redux';
import { setAddPointInLineMarkerVisible } from '../store/slices/addPointInLineSlice';
import './MarkerIcon.css';

const AddPointInLineMarkerIcon = ({ id }) => {
  const dispatch = useDispatch();

  return (
    <div
      style={{cursor: 'pointer'}}
      className="add-point-in-line-marker"
      onMouseLeave={() => {
        dispatch(setAddPointInLineMarkerVisible(false));
      }}
    >
      <div className="marker-line-h" />
      <div className="marker-line-v" />
    </div>
  );
};

export default AddPointInLineMarkerIcon;
