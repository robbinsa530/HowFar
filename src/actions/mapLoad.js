/*
  For handling when the map is fully loaded
*/

import { getErrorMsgFromPositionError } from '../utils/location';
import { checkForDefaultLocationAndFlyTo } from './defaultLocation';

function addChevronImageToMap(map) {
  if (!map.hasImage("chevron")) {
    map.loadImage("/wider_chevron.png", (err, img) => {
      if (err) {
        console.error("Error loading sprite, no arrows will be displayed", err);
      }
      else {
        // Might happen out of sync, but doesn't matter
        // Once it loads, if the user drew a route line, the chevrons will appear retroactively
        // And this usually finishes way faster than a human could start drawing a line
        map.addImage("chevron", img);
      }
    });
  }
}

async function onMapLoad(map, setLocating) {
  // Prevents zooming on double click/tap + drag
  map.touchZoomRotate._tapDragZoom.disable();
  map.doubleClickZoom.disable();
  map.touchPitch.disable();

  // Add chevron image to map for route direction indicators
  // Set it to re-add each time style (map type) changes
  addChevronImageToMap(map);
  map.on("style.load", () => {
    addChevronImageToMap(map);
  });

  // Check for default location first
  const hasDefault = await checkForDefaultLocationAndFlyTo(map);

  // If no default location, try to use geolocation
  if (import.meta.env.PROD && !hasDefault) {
    setLocating(true);
    // Dummy call, which according to the internet will make the second call work better? Who knows
    navigator.geolocation.getCurrentPosition(function () {}, function () {}, {});
    navigator.geolocation.getCurrentPosition(position => {
      map.flyTo({
        center: [position.coords.longitude, position.coords.latitude],
        zoom: 14,
        essential: true,
        animate: false
      });
      setLocating(false);
    }, async err => {
      console.error("Failed to locate using navigator.geolocation.getCurrentPosition");
      setLocating(false);
      let errMsg = getErrorMsgFromPositionError(err);
      alert(errMsg + "\n\nYou can also search your location in the search bar.");
    }, {
      maximumAge: 1000*60*60, // Can return cached location if < 1hr old
      timeout: 7000, // 7 Seconds. 5 seems short but 10 seems long. idk
      enableHighAccuracy: false // Default anyways, but makes me feel good
    });
  }
  console.info("Map loaded.");
}

export default onMapLoad;