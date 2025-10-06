/*
  For handling when the save or clear default location button is clicked
  Will either save current map location/zoom into a cookie, or clear the cookie
*/
import store from '../store/store';
import { setHasDefaultLocation } from '../store/slices/mapSlice';

function onClearDefaultLocation() {
  fetch('/clearDefaultLocation', {
    method: 'POST',
  })
  .then(response => {
    if (response.ok) {
      store.dispatch(setHasDefaultLocation(false));
      alert("Home location cleared!");
    } else {
      // Don't set hasDefaultLocation to false here because we don't know what state its in. Leave it up to the universe
      console.error("Failed to clear default location");
      alert("Failed to clear default location");
    }
  })
  .catch(error => {
    console.error("Error clearing default location:", error);
    alert("Error clearing default location");
  });
}

function onSaveDefaultLocation() {
  const state = store.getState();
  const location = state.map.location; // No need to copy

  const locationData = {
    lng: location.longitude,
    lat: location.latitude,
    zoom: location.zoom
  };

  fetch('/saveDefaultLocation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(locationData)
  })
  .then(response => {
    if (response.ok) {
      store.dispatch(setHasDefaultLocation(true));
      alert("Home location saved! HowFar will load your map to this location next time you open the app.");
    } else {
      store.dispatch(setHasDefaultLocation(false));
      console.error("Failed to save default location");
      alert("Failed to save default location");
    }
  })
  .catch(error => {
    store.dispatch(setHasDefaultLocation(false));
    console.error("Error saving default location:", error);
    alert("Error saving default location");
  });
}

async function checkForDefaultLocationAndFlyTo(map) {
  const response = await fetch('/getDefaultLocation');
  if (response.ok) {
    const data = await response.json();
    if (data && data.location) {
      store.dispatch(setHasDefaultLocation(true));
      if (map) {
        map.flyTo({
          center: [data.location.lng, data.location.lat],
          zoom: data.location.zoom,
          essential: true,
          animate: false
        });
        return true;
      }
    }
  }
  return false;
}

export {
  onClearDefaultLocation,
  onSaveDefaultLocation,
  checkForDefaultLocationAndFlyTo
};
