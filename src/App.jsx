import { useRef, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
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

import MapComponent from './components/Map'
import Sidebar from './components/Sidebar'
import MobileSidebar from './components/MobileSidebar'
import ClearMapAreYouSureDialog from './components/dialogs/ClearMapAreYouSureDialog'
import SimpleDialog from './components/dialogs/SimpleDialog'
import PopupDistances from './components/PopupDistances'
import BottomFloater from './components/BottomFloater'
import EditInfoBox from './components/EditInfoBox'
import SettingsDrawer from './components/SettingsDrawer'
import PostToStravaDialog from './components/dialogs/PostToStravaDialog'
import ExportActivityDialog from './components/dialogs/ExportActivityDialog'
import ImportActivityDialog from './components/dialogs/ImportActivityDialog'
import './App.css'

function AppContent() {
  const dispatch = useDispatch();
  const { mapboxToken } = useSelector((state) => state.map);
  const {
    loading,
    locating,
    uploading,
    uploadedMessage,
    isMobile,
    editInfoOpen
  } = useSelector((state) => state.display);
  const { displayDistancePopupEnabled } = useSelector((state) => state.settings);
  const { distancesToDisplay } = useSelector((state) => state.distancePopup);
  const { stravaLoginWindowWasOpened } = useSelector((state) => state.external);

  // Random refs/local state
  const mapRef = useRef(null); // Needed to access some mapboxgl methods (like queryTerrainElevation) from map/sidebar functions
  let stravaLoginWindowWasOpenedRef = useRef(stravaLoginWindowWasOpened); // Ugly. needed b/c addEventListener won't listen to state changes
  let appSetupStarted = false;
  let onFocusEventListenerAdded = false;

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
      console.debug('Window size is desktop');
      dispatch(setIsMobile(false));
    }
    else {
      console.debug('Window size is mobile');
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

  return (
    <div className="App">
      { /* Map will wait for mapboxToken to be fetched/set before loading */ }
      { mapboxToken && <MapComponent mapRef={mapRef} /> }
      {/* Only one of the sidebars will be shown, but the display is controlled in their css files */}
      <Sidebar mapRef={mapRef} />
      <MobileSidebar mapRef={mapRef} />
      <SettingsDrawer />
      { !editInfoOpen && <BottomFloater /> }
      { editInfoOpen && <EditInfoBox /> }
      <ClearMapAreYouSureDialog />
      <PostToStravaDialog />
      <ExportActivityDialog />
      <ImportActivityDialog mapRef={mapRef} />
      { !isMobile && !editInfoOpen && displayDistancePopupEnabled && distancesToDisplay.length > 0 && <PopupDistances /> }
      { loading && <SimpleDialog open={loading} text="Loading..." /> }
      { locating && <SimpleDialog open={locating} text="Locating..." /> }
      { uploading && <SimpleDialog open={uploading} text="Uploading..." /> }
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

export default App
