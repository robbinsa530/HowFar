import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Map,
  NavigationControl,
  GeolocateControl,
  useControl,
  Source,
  Layer,
  Popup,
  Marker
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import cloneDeep from 'lodash.clonedeep';

// Custom components/controls/actions/layers
import SearchBoxControl from "./mapbox-controls/SearchBoxControl";
import ElevationControl from "./mapbox-controls/ElevationControl";
import MarkerPopup from "./MarkerPopup";
import PinPopup from "./PinPopup";
import MarkerIcon from "./MarkerIcon";
import PinIcon from "./PinIcon";
import AddPointInLineMarkerIcon from "./AddPointInLineMarkerIcon";
import { getErrorMsgFromPositionError } from '../utils/location';
import { getMouseToMarkerSqDistance } from '../utils/mouseMath';
import { getPinDisplayPosition } from '../utils/pinEdgePosition';
import {
  markersAreCloseEnough,
  getElevationDataForRoute,
  getElevationChange,
} from '../controllers/GeoController';
import { addPinAtCoordinates } from '../controllers/PinController';
import { measureLinesLayer, editingMeasureLinesLayer } from '../layers/measureLines';
import { chevronsLayer1, chevronsLayer2 } from '../layers/chevrons';
import onMapLoad from '../actions/mapLoad';
import { onMapClick, onFinishMarkerClick } from '../actions/mapClick';
import {
  onMarkerDragStart,
  onMarkerDrag,
  onMarkerDragEnd
} from '../actions/markerDrag'
import onMouseOverRouteLine from '../actions/mouseOverRouteLine';
import onInlineMarkerClick from '../actions/inlineMarkerClick';

// Redux slices
import {
  setLocation,
  setDistance,
  setElevationProfile,
  setElevationChange,
  setNewDistance,
  setJustEditingDistance,
  setNewElevationChange,
  setNewElevationProfile,
  setNewElevationProfileExtraData,
  setAddPinOnNextClick
} from '../store/slices/mapSlice';
import {
  editMarkerInPlace
} from '../store/slices/routeSlice';
import {
  setLoading,
  setLocating,
  setMarkerPopupOpen,
  setMarkerPopupData,
  setPinPopupOpen,
  setPinPopupData,
  setElevationProfileOpen,
  setElevationLoading,
  setNewElevationLoading
} from '../store/slices/displaySlice';
import {
  setMouseDownCoords
} from '../store/slices/markerDragSlice';
import {
  setDistancesToDisplay
} from '../store/slices/distancePopupSlice';
import {
  resetAddPointInLineState
} from '../store/slices/addPointInLineSlice';
import {
  setEditGapClosed
} from '../store/slices/editRouteSlice';

// We have a "custom" search box control we inject into the map
function SearchBoxControlWrapper(args) {
  const controlRef = useRef(null);
  const control = useControl(() => {
    controlRef.current = new SearchBoxControl(args);
    return controlRef.current;
  }, { position: "top-right" });

  // Update search box location when args.currentLocation changes
  useEffect(() => {
    if (controlRef.current && args.currentLocation) {
      controlRef.current.updateLocation(args.currentLocation);
    }
  }, [args.currentLocation]);

  return null; // nothing to render in React tree
}

// Elevation control wrapper
function ElevationControlWrapper() {
  const controlRef = useRef(null);
  const dispatch = useDispatch();
  const { elevationProfileOpen } = useSelector((state) => state.display);

  const control = useControl(() => {
    controlRef.current = new ElevationControl();
    return controlRef.current;
  }, { position: "top-right" });

  // Listen for elevation control clicks
  useEffect(() => {
    const handleElevationControlClick = () => {
      dispatch(setElevationProfileOpen(!elevationProfileOpen));
    };

    window.addEventListener('elevationControlClick', handleElevationControlClick);
    return () => {
      window.removeEventListener('elevationControlClick', handleElevationControlClick);
    };
  }, [dispatch, elevationProfileOpen]);

  return null; // nothing to render in React tree
}

////////////////////////////////////////////////////////////////////////////////////
const MapComponent = (props) => {
  const dispatch = useDispatch();
  const mapRef = props.mapRef;

  // Get all the redux state we need for the map
  const {
    mapboxToken,
    location,
    mapType,
    mapTypes,
    pins,
    addPinOnNextClick,
    pendingPinName,
    pendingPinColor,
    elevationProfile,
    newElevationProfileExtraData,
  } = useSelector((state) => state.map);
  const {
    rightClickEnabled,
    addMarkerInLineEnabled,
    displayChevronsEnabled,
    showUserLocationEnabled
  } = useSelector((state) => state.settings);
  const {
    geojson,
    markers,
  } = useSelector((state) => state.route);
  const {
    markerPopupOpen,
    markerPopupData,
    pinPopupOpen,
    pinPopupData,
    editInfoOpen
  } = useSelector((state) => state.display);
  const {
    mouseDownCoords
  } = useSelector((state) => state.markerDrag);
  const {
    addPointInLineMarkerVisible,
    addPointInLineMarkerLocation
  } = useSelector((state) => state.addPointInLine);
  const {
    editSelectingPoints,
    editRedrawingRoute,
    editingMarkers,
    editFinishMarker,
    editingGeojson,
    startEndMarkerIndices
  } = useSelector((state) => state.editRoute);

  // Random refs/local state
  const touchTimeoutRef = useRef(null); // For touch events
  let idledOnce = false;

  // Update the map location when the map is moved
  const handleMapMove = (event) => {
    dispatch(setLocation({
      longitude: event.viewState.longitude,
      latitude: event.viewState.latitude,
      zoom: event.viewState.zoom
    }));
  };

  // Place a marker on click
  const handleMapClick = (event, rightClick=false) => {
    if (!rightClick || rightClickEnabled) {
      onMapClick(event, mapRef.current, rightClick);
    }
  };

  // Handle touch start event (for long tap ("right click" on mobile))
  const handleMapTouchStart = (event) => {
    // Only trigger for single-finger touch (prevent triggering on pinch-to-zoom)
    if (event.originalEvent.touches.length === 1) {
      touchTimeoutRef.current = setTimeout(async () => {
        if (rightClickEnabled) {
          onMapClick(event, mapRef.current, true/*rightClick*/);
        }
      }, 333);
    }
  };

  // Handle navigating map screen/etc. on map load
  const handleLoad = (event) => {
    dispatch(setLoading(false));
    const map = event.target; // This is the raw mapboxgl.Map instance

    // Set these here because react-map-gl doesn't expose these in the Map component
    // These are all to help prevent accidental marker placement on pinch for mobile
    map.on('pointerdrag', (e) => { clearTimeout(touchTimeoutRef.current); });
    map.on('pointermove', (e) => { clearTimeout(touchTimeoutRef.current); });
    map.on('gesturestart', (e) => { clearTimeout(touchTimeoutRef.current); });
    map.on('gesturechange', (e) => { clearTimeout(touchTimeoutRef.current); });
    map.on('gestureend', (e) => { clearTimeout(touchTimeoutRef.current); });

    // The rest of the on load behavior
    onMapLoad(map, (bool) => dispatch(setLocating(bool)));
  };

  // (onIdle) Wait a sec so the control is added to the DOM
  const handleIdle = (event) => {
    if (idledOnce) {
      return;
    }
    idledOnce = true;
    // Add a click listener to the geolocate button
    // Will trigger the "Locating..." popup while locating
    const geolocateButton = document.querySelector('.mapboxgl-ctrl-geolocate');
    if (geolocateButton) {
      geolocateButton.addEventListener('click', () => {
        dispatch(setLocating(true));
      });
    }
  };

  // Handle map mouse move (over route lines)
  const handleMapMouseMove = (event) => {
    // Used to fix an issue where the add-new-marker sometimes doesn't get removed
    if (addPointInLineMarkerVisible) {
      // Calculate distance between mouse and add-new-marker.
      // If dist > radius of marker, "remove on mouseleave" has failed. Remove manually.
      // Fixes an issue where mouseleave isn't fired on the marker when the mouse is moving too fast
      const markerLngLat = [addPointInLineMarkerLocation.longitude, addPointInLineMarkerLocation.latitude];
      const dist = getMouseToMarkerSqDistance(event.point, mapRef.current, markerLngLat);
      if (dist > 64) { // 64 is sorta made up. Roughly the radius of the rendered marker squared
        dispatch(resetAddPointInLineState());
      }
    }

    if (event.features && event.features.length > 0) { // If mouse is over a route line
      onMouseOverRouteLine(event, mapRef.current);
    }
  };

  // Handle map mouse leave over route (remove distance popup)
  const handleMapMouseLeave = (event) => {
    if (event.features && event.features.length > 0) { // If mouse is leaving a route line
      dispatch(setDistancesToDisplay([]));
    }
  };

  // Handle marker click
  const handleMarkerClick = (event, marker, index) => {
    event.originalEvent.stopPropagation();
    // Only allow click if mouse down coords match mouse up coords (to prevent accidental clicks while dragging)
    try {
      if ((mouseDownCoords.x === null && mouseDownCoords.y === null)
        || (mouseDownCoords.x === event.originalEvent.clientX && mouseDownCoords.y === event.originalEvent.clientY)) {
        // If we are editing the route, just select the marker. Otherwise, open the popup.
        if (editInfoOpen && editSelectingPoints) {
          let markerCopy = cloneDeep(marker); // Clone but leave id intact so we can edit
          const numPointsSelected = markers.filter(m => m.selectedForEdit).length;
          if (numPointsSelected === 2 && !marker.selectedForEdit) { // Don't let more than 2 points be selected
            return;
          }
          // Don't let the first or last point be selected
          if (index === 0) {
            alert("To edit the beginning of the route, delete the first point(s), set \"Add new points to\" to \"Beginning\", and draw route normally.");
            return;
          } else if (index === markers.length - 1) {
            alert("To edit the end of the route, delete the last point(s), set \"Add new points to\" to \"End\", and draw route normally.");
            return;
          }
          markerCopy.selectedForEdit = !markerCopy.selectedForEdit;
          dispatch(editMarkerInPlace(markerCopy));
        } else {
          dispatch(setMarkerPopupOpen(true));
          dispatch(setMarkerPopupData({
            id: marker.id,
            longitude: marker.lngLat[0],
            latitude: marker.lngLat[1],
          }));
        }
      }
    } finally {
      // This is a hacky way to ensure this gets called regardless of when the function returns
      dispatch(setMouseDownCoords({ x: null, y: null })); // Reset after each click for cleanliness
    }
  };

  // Handle clicking on a helper pin (to delete it)
  const handlePinClick = (event, pin) => {
    event.originalEvent.stopPropagation();
    dispatch(setPinPopupOpen(true));
    dispatch(setPinPopupData({
      id: pin.id,
      longitude: pin.lngLat[0],
      latitude: pin.lngLat[1],
      name: pin.name || '',
    }));
  };

  // If a pin is off screen and is clicked, fly to it
  const flyToPin = (event, pin) => {
    event.originalEvent.stopPropagation();
    mapRef.current.flyTo({center: pin.lngLat, duration: 500});
  };

  // Allow clicking map to add a pin just once, then go back to normal click behavior
  const handleAddPinOnNextClick = (event) => {
    dispatch(setAddPinOnNextClick(false));
    addPinAtCoordinates(event.lngLat.lat, event.lngLat.lng, pendingPinName, pendingPinColor);
  };

  // For finishing an edit of a route section
  const handleEditFinishMarkerClick = (event) => {
    event.originalEvent.stopPropagation();
    onFinishMarkerClick(event.originalEvent, editFinishMarker, mapRef.current, false);
  };

  // Handle marker drag start
  const handleMarkerDragStart = (index) => {
    onMarkerDragStart(index);
  };

  // Handle marker drag
  const handleMarkerDrag = (event, index) => {
    onMarkerDrag(event, index);
  };

  // Handle marker drag end
  const handleMarkerDragEnd = (event, index) => {
    onMarkerDragEnd(event, index);
  };

  // Handle add point in line marker click (for splitting a line with a new point)
  const handleAddPointInLineMarkerClick = (event) => {
    onInlineMarkerClick();
    dispatch(resetAddPointInLineState());
  };

  // Update distance and elevation state when geojson changes
  useEffect(() => {
    // Add up distance first...
    let distTotal = 0.0;
    geojson.features.forEach(line => {
      distTotal += line.properties.distance;
    });
    dispatch(setDistance(distTotal));

    // Then set the elevation profile and change
    if (geojson.features.length === 0) {
      dispatch(setElevationProfile([]));
      dispatch(setElevationChange({
        eleUp: 0.0,
        eleDown: 0.0
      }));
      dispatch(setElevationLoading(false));
      return;
    }

    dispatch(setElevationLoading(true));
    getElevationDataForRoute(geojson, distTotal).then(elevationData => {
      // Set the profile
      dispatch(setElevationProfile(elevationData));

      // Calculate and set the change
      const [eleUpTotal, eleDownTotal] = getElevationChange(elevationData);
      dispatch(setElevationChange({
        eleUp: eleUpTotal,
        eleDown: eleDownTotal
      }));
    }).catch(error => {
      console.error('Error fetching elevation data:', error);
    }).finally(() => {
      dispatch(setElevationLoading(false));
    });
  }, [dispatch, geojson]);

  // Update distance and elevation state OF NEW MEASUREMENTS (when editing) when geojson changes
  useEffect(() => {
    if (!editRedrawingRoute) {
      return;
    }

    // (segs)     0       1       2       3       4       5       6       7       8       9
    // (mrkrs) 0------1-------2-------3-------4-------5-------6-------7-------8-------9-------10
    //                        X                       X
    // In this case we want segs [0, 1], [5, 6, 7, 8, 9]
    // Add up distance before and after the editing section
    let distBefore = 0.0;
    let distAfter = 0.0;
    let newDistTotal = 0.0;
    geojson.features.filter((_, index) => index < startEndMarkerIndices.start).forEach(line => {
      distBefore += line.properties.distance;
    });
    geojson.features.filter((_, index) => index >= startEndMarkerIndices.end).forEach(line => {
      distAfter += line.properties.distance;
    });
    // Add up distance for the editing section
    editingGeojson.features.forEach(line => {
      newDistTotal += line.properties.distance;
    });
    dispatch(setNewDistance(distBefore + distAfter + newDistTotal));
    dispatch(setJustEditingDistance(newDistTotal));

    // Calculate elevation change and new profile
    dispatch(setNewElevationLoading(true));
    getElevationDataForRoute(editingGeojson, newDistTotal).then(elevationData => {
      // Set the new profile (make sure to adjust for distance before edit section)
      dispatch(setNewElevationProfile(elevationData.map(elArr => [elArr[0] + distBefore, elArr[1]])));

      // Calculate the new change
      const [eleUpTotal, eleDownTotal] = getElevationChange(elevationData);

      // Set the new change
      // Make sure to factor in the change in elevation from the old geojson before and after the editing section
      dispatch(setNewElevationChange({
        eleUp: eleUpTotal + newElevationProfileExtraData.elevationChangeBefore.eleUp + newElevationProfileExtraData.elevationChangeAfter.eleUp,
        eleDown: eleDownTotal + newElevationProfileExtraData.elevationChangeBefore.eleDown + newElevationProfileExtraData.elevationChangeAfter.eleDown
      }));
    }).catch(error => {
      console.error('Error fetching elevation data:', error);
    }).finally(() => {
      dispatch(setNewElevationLoading(false));
    });
  }, [
    dispatch,
    geojson,
    editingGeojson,
    startEndMarkerIndices,
    editRedrawingRoute,
    newElevationProfileExtraData
  ]);

  // Once points are selected for editing, calcualte a few helpful things for displaying a fun, split elevation profile chart
  useEffect(() => {
    if (startEndMarkerIndices.start === -1 || startEndMarkerIndices.end === -1) {
      return;
    }

    // Calculate split indices (where the selected markers line up with the elevationProfile)
    // Step 1: Calculate distance to start and end edit markers
    const distanceToEditStartMarker = geojson.features.filter((_, index) => index < startEndMarkerIndices.start).reduce((acc, line) => acc + line.properties.distance, 0);
    const distanceToEditEndMarker = geojson.features.filter((_, index) => index < startEndMarkerIndices.end).reduce((acc, line) => acc + line.properties.distance, 0);

    // Step 2: Find locations of points in elevationProfile that are closest to the start and end edit markers
    // findIndex will find the points just AFTER the point we want
    const closestPointStartIndex = elevationProfile.findIndex((point) => point[0] >= distanceToEditStartMarker);
    const closestPointEndIndex = elevationProfile.findIndex((point) => point[0] >= distanceToEditEndMarker);

    // Step 3: Calculate the interpolated point before and after the edit section
    // Because we found first point AFTER the points we want, we'll interpolate between the previous point and the found point
    if (closestPointStartIndex === -1 || closestPointEndIndex === -1) {
      console.error('Error finding closest points in elevation profile. Could not calculate new elevation profile.');
      return;
    }

    let interpolatedStartPtEle;
    let interpolatedEndPtEle;
    if (closestPointStartIndex === 0) { // Technically impossible because we don't allow selecting start marker for edit
      interpolatedStartPtEle = elevationProfile[closestPointStartIndex][1];
    } else {
      const nextStartPt = elevationProfile[closestPointStartIndex];
      const prevStartPt = elevationProfile[closestPointStartIndex - 1];
      const ratioStart = (distanceToEditStartMarker - prevStartPt[0]) / (nextStartPt[0] - prevStartPt[0]);
      interpolatedStartPtEle = prevStartPt[1] + (nextStartPt[1] - prevStartPt[1]) * ratioStart;
    }

    if (closestPointEndIndex === 0) { // Technically impossible because we don't allow selecting start marker for edit (and end edit marker can't be before start edit marker...)
      interpolatedEndPtEle = elevationProfile[closestPointEndIndex][1];
    } else {
      const nextEndPt = elevationProfile[closestPointEndIndex];
      const prevEndPt = elevationProfile[closestPointEndIndex - 1];
      const ratioEnd = (distanceToEditEndMarker - prevEndPt[0]) / (nextEndPt[0] - prevEndPt[0]);
      interpolatedEndPtEle = prevEndPt[1] + (nextEndPt[1] - prevEndPt[1]) * ratioEnd;
    }

    // Step 4: Add up the elevation change before and after the edit section (this only needs to be done once so we do it here instead of the other useEffect)
    let [eleUpTotalBefore, eleDownTotalBefore] = getElevationChange(elevationProfile.slice(0, closestPointStartIndex)); // Need to factor in interpolated point AFTER
    let [eleUpTotalAfter, eleDownTotalAfter] = getElevationChange(elevationProfile.slice(closestPointEndIndex)); // Need to factor in interpolated point BEFORE
    if (closestPointStartIndex > 0) { // Should always be true
      const diff1 = interpolatedStartPtEle - elevationProfile[closestPointStartIndex - 1][1];
      if (diff1 > 0) {
        eleUpTotalBefore += diff1;
      } else {
        eleDownTotalBefore += diff1;
      }
    }
    const diff2 = elevationProfile[closestPointEndIndex][1] - interpolatedEndPtEle;
    if (diff2 > 0) {
      eleUpTotalAfter += diff2;
    } else {
      eleDownTotalAfter += diff2;
    }

    // Step 5: Set new elevation profile data to help the elevation profile chart display correctly
    dispatch(setNewElevationProfileExtraData({
      splitIndexStart: closestPointStartIndex,
      splitIndexEnd: closestPointEndIndex,
      interpolatedPointBefore: [distanceToEditStartMarker, interpolatedStartPtEle],
      interpolatedPointAfter: [distanceToEditEndMarker, interpolatedEndPtEle],
      elevationChangeBefore: {
        eleUp: eleUpTotalBefore,
        eleDown: eleDownTotalBefore
      },
      elevationChangeAfter: {
        eleUp: eleUpTotalAfter,
        eleDown: eleDownTotalAfter
      }
    }));
  }, [
    dispatch,
    geojson,
    elevationProfile,
    startEndMarkerIndices
  ]);

  // Handle gap closed check: Seeing if we're ready to finish the edit
  useEffect(() => {
    if (!editRedrawingRoute) {
      return;
    }
    // True if markers are on top of each other, false if not
    dispatch(setEditGapClosed(markersAreCloseEnough(editingMarkers[editingMarkers.length - 1], editFinishMarker, 1e-7)));
  }, [
    dispatch,
    editRedrawingRoute,
    editFinishMarker,
    editingMarkers
  ]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        ref={mapRef}
        onLoad={handleLoad}
        onIdle={handleIdle}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        onMove={handleMapMove}
        onClick={addPinOnNextClick ? handleAddPinOnNextClick : handleMapClick}
        onContextMenu={(event) => handleMapClick(event, true)}
        onRightClick={(event) => handleMapClick(event, true)}

        // All of these are to avoid accidental marker placement on pinch for mobile
        onTouchStart={handleMapTouchStart}
        onTouchEnd={(e) => clearTimeout(touchTimeoutRef.current) }
        onTouchCancel={(e) => clearTimeout(touchTimeoutRef.current) }
        onTouchMove={(e) => clearTimeout(touchTimeoutRef.current) }
        onMoveEnd={(e) => clearTimeout(touchTimeoutRef.current) }
        // No pointerdrag, pointermove, gesturestart, gesturechange, gestureend available? (set in onload instead)

        pitchWithRotate={false} // Prevents changing pitch with ctrl + drag
        mapboxAccessToken={mapboxToken}
        initialViewState={location}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapTypes[mapType]}
        interactiveLayerIds={[editRedrawingRoute ? 'editing-measure-lines' : 'measure-lines']} // Lets us detect when the mouse is over the route line(s)
        // terrain={{source: 'mapbox-dem', exaggeration: 0}} // Removed terrain for now because I think I don't need it? TODO: Fully remove
        cursor="crosshair"
        maxZoom={20}
        projection="mercator" // Force the flat view, not the globe view
      >
        {/* Map sources/layers (elevation data, route source) - TODO remove this source */}
        {/* <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        /> */}

        <Source type="geojson" data={geojson} lineMetrics={true}>
          <Layer {...measureLinesLayer}/>
          { displayChevronsEnabled && <Layer {...chevronsLayer1}/> }
        </Source>

        {editingGeojson.features.length > 0 && <Source type="geojson" data={editingGeojson} lineMetrics={true}>
          <Layer {...editingMeasureLinesLayer}/>
          { displayChevronsEnabled && <Layer {...chevronsLayer2}/> }
        </Source>}

        {/* Route markers */}
        {markers.map((marker, index) => (
          !marker.hidden && (
          <Marker
            key={marker.id}
            anchor="center"
            longitude={marker.lngLat[0]}
            latitude={marker.lngLat[1]}
            clickTolerance={0}
            // Need to allow click when selecting points, but disallow when redrawing route
            onClick={
              editRedrawingRoute ?
              (marker.id === editFinishMarker.id ? handleEditFinishMarkerClick : null)
              : (e) => handleMarkerClick(e, marker, index)} // Always allow click when not redrawing route
            // Disable all dragging functionality on old markers while editing
            draggable={!editInfoOpen}
            onDragStart={editInfoOpen ? null : (_) => handleMarkerDragStart(index)}
            onDrag={editInfoOpen ? null : (e) => handleMarkerDrag(e, index)}
            onDragEnd={editInfoOpen ? null : (e) => handleMarkerDragEnd(e, index)}
          >
            <MarkerIcon
              marker={marker}
              isFirst={index === 0}
              isLast={index === markers.length - 1}
              glow={marker.selectedForEdit}
              mapRef={mapRef}
            />
          </Marker> )
        ))}

        { /* Special editing markers */}
        {editInfoOpen && editRedrawingRoute &&
          editingMarkers.map((marker, index) => (
            // We hide first marker once another one has been placed so user knows they can't edit it.
            // I don't love this UX... I do this out of sheer laziness. It would be a huge pain in the ass
            //  to allow moving around the first marker (or any of the old ones). It would require a bunch of
            //  custom logic to handle all actions when the lines connected to the point may be spread between
            //  the `geojson` list and the `editingGeojson` list...
            (editingMarkers.length === 1 || index > 0) && (
            <Marker
              key={marker.id}
              anchor="center"
              draggable={index > 0}
              longitude={marker.lngLat[0]}
              latitude={marker.lngLat[1]}
              clickTolerance={0}
              onClick={index > 0 ? (e) => handleMarkerClick(e, marker, index) : null}
              onDragStart={index > 0 ? (_) => handleMarkerDragStart(index) : null}
              onDrag={index > 0 ? (e) => handleMarkerDrag(e, index) : null}
              onDragEnd={index > 0 ? (e) => handleMarkerDragEnd(e, index) : null}
            >
              <MarkerIcon
                marker={marker}
                isFirst={false}
                isLast={false}
                glow={index === editingMarkers.length - 1}
                mapRef={mapRef}
              />
            </Marker>
        )))}

        {/* Add point in line marker (for splitting a line with a new point) */}
        {addMarkerInLineEnabled && addPointInLineMarkerVisible && (
          <Marker
            key="add-point-in-line-marker"
            anchor="center"
            draggable={false}
            longitude={addPointInLineMarkerLocation.longitude}
            latitude={addPointInLineMarkerLocation.latitude}
            onClick={handleAddPointInLineMarkerClick}
          >
            <AddPointInLineMarkerIcon />
          </Marker>
        )}

        {/* Helper pins */}
        {pins.map((pin) => {
          const displayPos = getPinDisplayPosition(mapRef.current, pin);
          return (
            <Marker
              key={pin.id}
              anchor="center"
              longitude={displayPos.longitude}
              latitude={displayPos.latitude}
              onClick={displayPos.isOnEdge ?
                (e) => flyToPin(e, pin) // If pin is off screen, fly to it
                : (e) => handlePinClick(e, pin)} // If pin is on screen, open popup (for delete)
            >
              <PinIcon pinId={pin.id} isOnEdge={displayPos.isOnEdge} color={pin.color} />
            </Marker>
          );
        })}

        {/* Marker popup (just one that will be used for all markers) */}
        {markerPopupOpen && (
          <Popup
            anchor="bottom"
            longitude={markerPopupData.longitude}
            latitude={markerPopupData.latitude}
            onClose={() => dispatch(setMarkerPopupOpen(false))}
            focusAfterOpen={false}
          >
            <MarkerPopup/>
          </Popup>
        )}

        {/* Pin popup (just one that will be used for all pins) */}
        {pinPopupOpen && (
          <Popup
            anchor="bottom"
            longitude={pinPopupData.longitude}
            latitude={pinPopupData.latitude}
            onClose={() => dispatch(setPinPopupOpen(false))}
            focusAfterOpen={false}
          >
            <PinPopup/>
          </Popup>
        )}

        {/* Map controls */}
        <SearchBoxControlWrapper mapboxToken={mapboxToken} currentLocation={location} />
        <NavigationControl position="top-right" />
        <GeolocateControl
          key={showUserLocationEnabled ? 'show' : 'hide'} // Hack to re-render the control when showUserLocationEnabled changes. Only way to allow changing showUserLocation prop
          showAccuracyCircle={false}
          showUserLocation={showUserLocationEnabled}
          positionOptions={{
            maximumAge: 1000*60*60, // Can return cached location if < 1hr old
            timeout: 7000 // 7 Seconds. 5 seems short but 10 seems long. idk
          }}
          onError={(error) => {
            dispatch(setLocating(false));
            const errMsg = getErrorMsgFromPositionError(error);
            alert(errMsg + " Try searching your location in the search bar.")
          }}
          onGeolocate={() => {
            dispatch(setLocating(false));
          }}
          position="top-right"
        />
        <ElevationControlWrapper />
      </Map>
    </div>
  );
};

export default MapComponent;
