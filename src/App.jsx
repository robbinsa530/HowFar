import { useRef, useEffect, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { store } from './store/store';
import { setTokens } from './store/slices/mapSlice';
import {
  setStravaLoginWindowWasOpened
} from './store/slices/externalSlice';
import { setIsMobile } from './store/slices/displaySlice';
import {
  setUploadedMessage
} from './store/slices/displaySlice';
import { updateConnectedStatus } from './controllers/StravaController';
import { fetchRouteByUuid, loadSavedRoute } from './controllers/ImportExportController';
import { resetRouteState, resetEditState } from './controllers/ResetController';

import MapComponent from './components/Map'
import Sidebar from './components/Sidebar'
import MobileSidebar from './components/MobileSidebar'
import ClearMapAreYouSureDialog from './components/dialogs/ClearMapAreYouSureDialog'
import ClearEditAreYouSureDialog from './components/dialogs/ClearEditAreYouSureDialog'
import AddPinsToMapDialog from './components/dialogs/AddPinsToMapDialog'
import SimpleDialog from './components/dialogs/SimpleDialog'
import PopupDistances from './components/PopupDistances'
import BottomFloater from './components/BottomFloater'
import EditInfoBox from './components/EditInfoBox'
import SettingsDrawer from './components/SettingsDrawer'
import PostToStravaDialog from './components/dialogs/PostToStravaDialog'
import ExportActivityDialog from './components/dialogs/ExportActivityDialog'
import ImportActivityDialog from './components/dialogs/ImportActivityDialog'
import AddPinHelperPopup from './components/AddPinHelperPopup'
import ElevationProfileFloater from './components/ElevationProfileFloater'
import { EditableRouteContext } from './context/EditableRouteContext'
import './App.css'

function AppContent({ editableRoute = true }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    mapboxToken,
    addPinOnNextClick
  } = useSelector((state) => state.map);
  const {
    loading,
    locating,
    uploading,
    uploadedMessage,
    isMobile,
    editInfoOpen,
    elevationProfileOpen
  } = useSelector((state) => state.display);
  const { displayDistancePopupEnabled } = useSelector((state) => state.settings);
  const { distancesToDisplay } = useSelector((state) => state.distancePopup);
  const { stravaLoginWindowWasOpened } = useSelector((state) => state.external);

  // Random refs/local state
  const mapRef = useRef(null); // Needed to access some mapboxgl methods
  const routeUuidLoadedRef = useRef(null); // Track which uuid we've already loaded to avoid re-running
  const [mapReady, setMapReady] = useState(false);
  let stravaLoginWindowWasOpenedRef = useRef(stravaLoginWindowWasOpened); // Ugly. needed b/c addEventListener won't listen to state changes
  let appSetupStarted = false;
  let onFocusEventListenerAdded = false;
  const { uuid: routeUuid } = useParams();
  if (!routeUuid) routeUuidLoadedRef.current = null;

  useEffect(() => {
    stravaLoginWindowWasOpenedRef.current = stravaLoginWindowWasOpened;
  }, [stravaLoginWindowWasOpened]);

  useEffect(() => {
    // Only show alert when uploading has finished and we have a pending message
    if (!uploading && uploadedMessage) {
      const message = uploadedMessage;
      dispatch(setUploadedMessage(''));

      // Small timeout to ensure the uploading dialog closes first
      setTimeout(() => {
        alert(message);
      }, 100);
    }
  }, [uploading, uploadedMessage]);

  useEffect(() => {
    if (appSetupStarted) return; // Make sure we only fetch API codes once
    appSetupStarted = true;

    // Get API codes for Strava and Mapbox
    fetch("/getApiTokens").then(apiCodesResp => {
      if (apiCodesResp.ok) {
        apiCodesResp.json().then(data => {
          dispatch(setTokens({
            mapboxToken: data.MAPBOX_PUB_KEY,
            stravaClientId: data.STRAVA_CLIENT_ID
          }));
        });
      }
      else {
        console.error('Failed to fetch API tokens. Mapbox/Strava APIs will not work!');
      }
    });

    // Set strava connected status on page load, and setup a focus listener that lets us update the
    // connected status when the page gets focus (e.g. when the user comes back from Strava's login window)
    // (Not reliant on the tokens above, so ok to do while that's fetching)
    if (!onFocusEventListenerAdded) { // Redundant but whatever
      window.addEventListener('focus', handlePageGotFocus);
      onFocusEventListenerAdded = true;
    }
    updateConnectedStatus();
  }, []);

  // This gets attached to the focus changed listener of the window.
  // It lets the Strava connected bool be updated when the user switches back from
  // Strava's login window to this page after logging in
  const handlePageGotFocus = async (event) => {
    if (stravaLoginWindowWasOpenedRef.current) {
      dispatch(setStravaLoginWindowWasOpened(false));
      await updateConnectedStatus();
    }
  };

  const handleWindowSizeChange = () => {
    if (window.innerWidth > 480) {
      dispatch(setIsMobile(false));
    }
    else {
      dispatch(setIsMobile(true));
    }
  };

  useEffect(() => {
    handleWindowSizeChange();
    window.addEventListener('resize', handleWindowSizeChange);
    return () => {
      window.removeEventListener('resize', handleWindowSizeChange);
  }
  }, []);

  // Load route from URL when navigating to /route/:uuid (once map is ready)
  useEffect(() => {
    if (!routeUuid || !mapReady || routeUuidLoadedRef.current === routeUuid) return;
    const map = mapRef?.current;
    if (!map) return;

    routeUuidLoadedRef.current = routeUuid;
    (async () => {
      try {
        const data = await fetchRouteByUuid(routeUuid);
        if (!data) {
          alert('Route not found');
          navigate('/', { replace: true });
          return;
        }
        resetRouteState();
        resetEditState();
        await loadSavedRoute(data, map);
      } catch (err) {
        console.error('Failed to load route from URL', err);
        routeUuidLoadedRef.current = null;
      }
    })();
  }, [routeUuid, mapReady]);

  return (
    <EditableRouteContext.Provider value={editableRoute}>
    <div className="App">
      { /* Map will wait for mapboxToken to be fetched/set before loading */ }
      { mapboxToken && <MapComponent mapRef={mapRef} onMapReady={() => setMapReady(true)} /> }
      {/* Only one of the sidebars will be shown, but the display is controlled in their css files */}
      <Sidebar />
      <MobileSidebar />
      <BottomFloater />
      { elevationProfileOpen && <ElevationProfileFloater /> }
      {/* Dialogs and overlays that should be on top of everything */}
      <SettingsDrawer />
      { editInfoOpen && <EditInfoBox /> }
      <ClearMapAreYouSureDialog />
      <ClearEditAreYouSureDialog />
      <AddPinsToMapDialog />
      <PostToStravaDialog />
      <ExportActivityDialog />
      <ImportActivityDialog mapRef={mapRef} />
      { !isMobile && !editInfoOpen && displayDistancePopupEnabled && distancesToDisplay.length > 0 && <PopupDistances /> }
      { loading && <SimpleDialog open={loading} text="Loading..." /> }
      { locating && <SimpleDialog open={locating} text="Locating..." /> }
      { uploading && <SimpleDialog open={uploading} text="Uploading..." /> }
      { addPinOnNextClick && <AddPinHelperPopup /> }
    </div>
    </EditableRouteContext.Provider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Routes>
        <Route path="/" element={<AppContent editableRoute />} />
        <Route path="/route/:uuid" element={<AppContent editableRoute={false} />} />
      </Routes>
    </Provider>
  )
}

export default App
