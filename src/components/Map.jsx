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

// Custom components/controls/actions/layers
import SearchBoxControl from "./SearchBoxControl";
import MarkerPopup from "./MarkerPopup";
import MarkerIcon from "./MarkerIcon";
import AddPointInLineMarkerIcon from "./AddPointInLineMarkerIcon";
import { getErrorMsgFromPositionError } from '../utils/location';
import { getMouseToMarkerSqDistance } from '../utils/mouseMath';
import { measureLinesLayer } from '../layers/measureLines';
import { chevronsLayer } from '../layers/chevrons';
import onMapLoad from '../actions/mapLoad';
import onMapClick from '../actions/mapClick';
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
  setElevationChange
} from '../store/slices/mapSlice';
import {
  setLoading,
  setLocating,
  setMarkerPopupOpen,
  setMarkerPopupData
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

// We have a "custom" search box control we inject into the map
function SearchBox(args) {
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

////////////////////////////////////////////////////////////////////////////////////
const MapComponent = (props) => {
  const dispatch = useDispatch();
  const mapRef = props.mapRef;

  // Get all the redux state we need for the map
  const {
    mapboxToken,
    location,
    mapType,
    mapTypes
  } = useSelector((state) => state.map);
  const {
    rightClickEnabled,
    addMarkerInLineEnabled,
    displayChevronsEnabled
  } = useSelector((state) => state.settings);
  const {
    geojson,
    markers,
  } = useSelector((state) => state.route);
  const {
    markerPopupOpen,
    markerPopupData
  } = useSelector((state) => state.display);
  const {
    mouseDownCoords
  } = useSelector((state) => state.markerDrag);
  const {
    addPointInLineMarkerVisible,
    addPointInLineMarkerLocation
  } = useSelector((state) => state.addPointInLine);

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
    if (!idledOnce) {
      idledOnce = true;
      return;
    }
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
      const dist = getMouseToMarkerSqDistance(event, mapRef.current, markerLngLat);
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
  const handleMarkerClick = (event, marker) => {
    event.originalEvent.stopPropagation();
    // Only allow click if mouse down coords match mouse up coords (to prevent accidental clicks while dragging)
    if ((mouseDownCoords.x === null && mouseDownCoords.y === null)
        || (mouseDownCoords.x === event.originalEvent.clientX && mouseDownCoords.y === event.originalEvent.clientY)) {
      dispatch(setMarkerPopupOpen(true));
      dispatch(setMarkerPopupData({
        id: marker.id,
        longitude: marker.lngLat[0],
        latitude: marker.lngLat[1],
      }));
    }
    dispatch(setMouseDownCoords({ x: null, y: null })); // Reset after each click for cleanliness
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
    onMarkerDragEnd(event, mapRef.current, index);
  };

  // Handle add point in line marker click (for splitting a line with a new point)
  const handleAddPointInLineMarkerClick = (event) => {
    onInlineMarkerClick(mapRef.current);
    dispatch(resetAddPointInLineState());
  };

  // Update distance and elevation state when geojson or markers change
  useEffect(() => {
    let distTotal = 0.0;
    let eleUpTotal = 0.0;
    let eleDownTotal = 0.0;
    geojson.features.forEach(line => {
      distTotal += line.properties.distance;
      eleUpTotal += line.properties.eleUp;
      eleDownTotal += line.properties.eleDown;
    });
    dispatch(setDistance(distTotal));
    dispatch(setElevationChange({
      eleUp: eleUpTotal * 3.28084,
      eleDown: eleDownTotal * 3.28084
    }));
  }, [dispatch, geojson, markers]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        ref={mapRef}
        onLoad={handleLoad}
        onIdle={handleIdle}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        onMove={handleMapMove}
        onClick={handleMapClick}
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
        interactiveLayerIds={['measure-lines']} // Lets us detect when the mouse is over the route line(s)
        /* Note: exaggeration 0 means that for the purposes of displaying elevation, the 3D terrain
        will be converted to a flat 2D plane. react-map-gl has a weird bug (?) where if exaggeration
        is set and you zoom in too far, panning/zooming the map will cause markers to move around
        unnaturally and the map to jerk. Luckily, we don't want to ever even display 3D elevation.
        We just need the terrain loaded so we can use the queryTerrainElevation function to get the
        elevation at specific points. And that function lets us ignore exaggeration. So this is safe.
        But if we ever want to display 3D elevation, we'll have to find a better way around this...
        */
        terrain={{source: 'mapbox-dem', exaggeration: 0}}
        cursor="crosshair"
        maxZoom={20}
      >
        {/* Map sources/layers (elevation data, route source) */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />

        <Source type="geojson" data={geojson} lineMetrics={true}>
          <Layer {...measureLinesLayer}/>
          { displayChevronsEnabled && <Layer {...chevronsLayer}/> }
        </Source>

        {/* Route markers
          marker:
            {
              id:,
              lngLat:,
              associatedLines,
              isDragging,
              snappedToRoad,
              elevation,
              originalLngLat (only while dragging)
            } */}
        {markers.map((marker, index) => (
          <Marker
            key={marker.id}
            anchor="center"
            draggable
            longitude={marker.lngLat[0]}
            latitude={marker.lngLat[1]}
            clickTolerance={0}
            onClick={(e) => handleMarkerClick(e, marker)}
            onDragStart={(_) => handleMarkerDragStart(index)}
            onDrag={(e) => handleMarkerDrag(e, index)}
            onDragEnd={(e) => handleMarkerDragEnd(e, index)}
          >
            <MarkerIcon id={marker.id} />
          </Marker>
        ))}

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

        {/* Marker popup (just one that will be used for all markers) */}
        {markerPopupOpen && (
          <Popup
            anchor="bottom"
            longitude={markerPopupData.longitude}
            latitude={markerPopupData.latitude}
            onClose={() => dispatch(setMarkerPopupOpen(false))}
            focusAfterOpen={false}
          >
            <MarkerPopup mapRef={mapRef} />
          </Popup>
        )}

        {/* Map controls */}
        <SearchBox mapboxToken={mapboxToken} currentLocation={location} />
        <NavigationControl position="top-right" />
        <GeolocateControl
          showAccuracyCircle={false}
          showUserLocation={false}
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
      </Map>
    </div>
  );
};

export default MapComponent;
