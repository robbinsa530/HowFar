import { useRef, useEffect, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { store } from './store/store';
import { setTokens } from './store/slices/mapSlice';
import {
  setStravaLoginWindowWasOpened
} from './store/slices/externalSlice';
import { setIsMobile, setLoading } from './store/slices/displaySlice';
import {
  setUploadedMessage
} from './store/slices/displaySlice';
import { updateConnectedStatus } from './controllers/StravaController';
import { fetchRouteByUuid, loadSavedRoute } from './controllers/ImportExportController';
import { resetRouteState, resetEditState } from './controllers/ResetController';
import { setSavedRouteMeta, clearSavedRouteMeta } from './store/slices/savedRouteSlice';

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
import AppTopBar from './components/AppTopBar'
import { HowFarLoginProvider } from './context/HowFarLoginContext'
import PostToStravaDialog from './components/dialogs/PostToStravaDialog'
import ExportActivityDialog from './components/dialogs/ExportActivityDialog'
import ImportActivityDialog from './components/dialogs/ImportActivityDialog'
import SaveRouteDialog from './components/dialogs/SaveRouteDialog'
import AddPinHelperPopup from './components/AddPinHelperPopup'
import ElevationProfileFloater from './components/ElevationProfileFloater'
import { EditableRouteContext } from './context/EditableRouteContext'
import { useSupabaseAuth } from './context/SupabaseAuthContext'
import ResetPasswordPage from './pages/ResetPasswordPage'
import './App.css'

function AppContent({ editableRoute = true }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { session, loading: authLoading } = useSupabaseAuth();
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
  const editingRouteUuid = useSelector((state) => state.savedRoute.editingRouteUuid);

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

  useEffect(() => {
    if (!routeUuid) {
      // Preserve meta while editing an existing saved route on `/`.
      if (!editingRouteUuid) {
        dispatch(clearSavedRouteMeta());
      }
    }
  }, [routeUuid, editingRouteUuid, dispatch]);

  // Load route from URL when navigating to /route/:uuid (once map is ready).
  // Wait for auth so private routes can be loaded with the user's JWT.
  useEffect(() => {
    if (!routeUuid || !mapReady || authLoading) return;
    const map = mapRef?.current;
    if (!map) return;
    if (routeUuidLoadedRef.current === routeUuid) return;

    routeUuidLoadedRef.current = routeUuid;
    (async () => {
      try {
        // Keep loading dialog visible throughout map-ready -> fetch -> draw flow on /route/:uuid.
        dispatch(setLoading(true));
        dispatch(clearSavedRouteMeta());
        const token = session?.access_token ?? null;
        const data = await fetchRouteByUuid(routeUuid, token);
        if (!data) {
          dispatch(setLoading(false));
          routeUuidLoadedRef.current = null;
          alert('Could not load this route. It may be invalid or the server is unavailable.');
          navigate('/', { replace: true });
          return;
        }
        resetRouteState();
        resetEditState();
        dispatch(
          setSavedRouteMeta({
            name: data.name ?? '',
            isPrivate: Boolean(data.isPrivate),
            shareUuid: routeUuid,
            canEdit: Boolean(data.canEdit),
          })
        );
        await loadSavedRoute(data, map);
      } catch (err) {
        dispatch(setLoading(false));
        console.error('Failed to load route from URL', err);
        routeUuidLoadedRef.current = null;
        alert('Could not load this route. It may be invalid or the server is unavailable.');
        navigate('/', { replace: true });
      }
    })();
  }, [routeUuid, mapReady, authLoading, session?.access_token, navigate, dispatch]);

  return (
    <EditableRouteContext.Provider value={editableRoute}>
    <div className="App">
      <AppTopBar />
      <div className="app-main-area">
        { /* Map will wait for mapboxToken to be fetched/set before loading */ }
        { mapboxToken && <MapComponent mapRef={mapRef} onMapReady={() => setMapReady(true)} /> }
        {/* Only one of the sidebars will be shown, but the display is controlled in their css files */}
        <Sidebar mapRef={mapRef} />
        <MobileSidebar mapRef={mapRef} />
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
        <SaveRouteDialog />
        { !isMobile && !editInfoOpen && displayDistancePopupEnabled && distancesToDisplay.length > 0 && <PopupDistances /> }
        { loading && <SimpleDialog open={loading} text="Loading..." /> }
        { locating && <SimpleDialog open={locating} text="Locating..." /> }
        { uploading && <SimpleDialog open={uploading} text="Uploading..." /> }
        { addPinOnNextClick && <AddPinHelperPopup /> }
      </div>
    </div>
    </EditableRouteContext.Provider>
  );
}

// Because I can be stupid sometimes :)
function RedirectRoutesUuidToRoute() {
  const { uuid } = useParams();
  return <Navigate to={`/route/${encodeURIComponent(uuid)}`} replace />;
}

function App() {
  return (
    <Provider store={store}>
      <HowFarLoginProvider>
        <Routes>
          <Route path="/" element={<AppContent editableRoute />} />
          <Route path="/route/:uuid" element={<AppContent editableRoute={false} />} />
          <Route path="/routes/:uuid" element={<RedirectRoutesUuidToRoute />} />
          <Route path="/resetpassword" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HowFarLoginProvider>
    </Provider>
  )
}

export default App
