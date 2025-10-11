import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { onFinishMarkerClick } from '../actions/mapClick';
import { setMouseDownCoords } from '../store/slices/markerDragSlice';
import { setMouseOnMarker } from '../store/slices/mapSlice';
import './MarkerIcon.css';

const MarkerIcon = ({ marker, isFirst, isLast, glow, mapRef }) => {
  const dispatch = useDispatch();
  const {
    editFinishMarker,
  } = useSelector((state) => state.editRoute);
  const {
    rightClickEnabled
  } = useSelector((state) => state.settings);
  const finishMarkerTouchTimeoutRef = useRef(null); // For touch events on the finish edit marker

  const getMarkerIconClassName = () => {
    // Find the index of this marker in the markers array
    let extraClass = '';
    if (glow) {
      extraClass += ' marker-glow';
    }

    // If this is the first marker in the array, it's a start marker
    if (isFirst) {
      return 'start-marker' + extraClass;
    }

    // If this is the last marker in the array, it's an end marker
    // Technically don't want this when markers length === 1, but that
    // will be handled by the start-marker case above
    if (isLast) {
      return 'end-marker' + extraClass;
    }

    // Otherwise, it's a regular marker
    return 'marker' + extraClass;
  };

  // Handle touch start event (for long tap ("right click" on mobile) on finish marker)
  const handleFinishMarkerTouchStart = (event) => {
    // Only trigger for single-finger touch (prevent triggering on pinch-to-zoom)
    if (event.touches.length === 1) {
      finishMarkerTouchTimeoutRef.current = setTimeout(async () => {
        if (rightClickEnabled) {
          onFinishMarkerClick(event, editFinishMarker, mapRef.current, true/*rightClick*/)
        }
      }, 333);
    }
  };

  const handleFinishMarkerRightClick = (event) => {
    if (rightClickEnabled) {
      onFinishMarkerClick(event, editFinishMarker, mapRef.current, true/*rightClick*/)
    }
  };

  return (
    <div
      onMouseDown={(e) => { dispatch(setMouseDownCoords({ x: e.clientX, y: e.clientY })); }}
      // onMouseUp={(e) => { ... }} // We shouldn't need this one
      onMouseEnter={(e) => { dispatch(setMouseOnMarker(true)); }}
      onMouseLeave={(e) => { dispatch(setMouseOnMarker(false)); }}

      /*
        I hate that I have to do this here, but I need to monitor right click/long press on the
        final marker when in edit mode in case the user wants to finish their edit with a straight line,
        and the react-map-gl Marker object doesn't expose these, so I have to put them on the inner object 
      */
      onContextMenu={editFinishMarker && marker.id === editFinishMarker.id ? handleFinishMarkerRightClick : null}
      onTouchStart={editFinishMarker && marker.id === editFinishMarker.id ? handleFinishMarkerTouchStart : null}
      onTouchEnd={editFinishMarker && marker.id === editFinishMarker.id ? (e) => { clearTimeout(finishMarkerTouchTimeoutRef.current); } : null}
      onTouchCancel={editFinishMarker && marker.id === editFinishMarker.id ? (e) => { clearTimeout(finishMarkerTouchTimeoutRef.current); } : null}
      onTouchMove={editFinishMarker && marker.id === editFinishMarker.id ? (e) => { clearTimeout(finishMarkerTouchTimeoutRef.current); } : null}
      onPointerCancel={editFinishMarker && marker.id === editFinishMarker.id ? (e) => { clearTimeout(finishMarkerTouchTimeoutRef.current); } : null}

      style={{cursor: 'pointer'}}
      className={getMarkerIconClassName()}
    />
  );
};

export default MarkerIcon;
