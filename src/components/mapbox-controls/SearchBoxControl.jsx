import { MapboxSearchBox } from '@mapbox/search-js-web';
import mapboxgl from 'mapbox-gl'; // I don't think this is actually needed

class SearchBoxControl {
  _mapboxToken;
  _container;
  _searchBox;
  _searchBoxLastText = "";
  _searchBoxTimerId = null;
  _currentLocation = null;
  _onLocationUpdate = null;

  constructor(args) {
    this._mapboxToken = args.mapboxToken;
    this._currentLocation = args.currentLocation;
    this._onLocationUpdate = args.onLocationUpdate;
  }

  onAdd(map) {
    this._map = map;

    // Create main container
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl';

    // Create and configure the MapboxSearchBox
    this._searchBox = new MapboxSearchBox();
    this._searchBox.accessToken = this._mapboxToken;
    this._searchBox.map = map;
    this._searchBox.mapboxgl = mapboxgl; // I don't think this is actually needed
    this._searchBox.placeholder = "Search a location";
    this._searchBox.marker = false;
    this._searchBox.options = {
      limit: 5,
      proximity: this._currentLocation ? [this._currentLocation.longitude, this._currentLocation.latitude] : [-104.959730, 39.765733],
      types: "country,region,postcode,district,place,street,address,poi"
    };

    // Implement search debouncing to avoid too many API calls
    this._searchBox.interceptSearch = (text) => {
      if (text === "" || this._searchBoxLastText === text) {
        this._searchBoxLastText = "";
        return text;
      } else {
        this._searchBoxLastText = text;
        clearTimeout(this._searchBoxTimerId);
        this._searchBoxTimerId = setTimeout(() => {
          // Don't use text here b/c when deleting search string to empty,
          // text will contain last deleted character
          this._searchBox.search(this._searchBox.value);
        }, 500);
        return "";
      }
    };

    this._searchBox.popoverOptions = {
      flip: true
    };

    // Handle result selection - fly to the selected location
    this._searchBox.addEventListener('retrieve', (event) => {
      const result = event.detail;
      if (result?.features && result.features.length > 0) {
        const feature = result.features[0];
        const [lng, lat] = feature.geometry.coordinates;
        // Fly to the selected location
        map.flyTo({
          center: [lng, lat],
          zoom: 14, // Adjust the zoom level as needed
          essential: true // This ensures the user can't interrupt the flight
        });
      } else {
        alert("No result found");
      }
    });

    // Append the search box to our container
    this._container.appendChild(this._searchBox);

    return this._container;
  }

  onRemove() {
    // Clean up the search box
    if (this._searchBox) {
      this._searchBox.remove();
    }

    // Clean up timer
    if (this._searchBoxTimerId) {
      clearTimeout(this._searchBoxTimerId);
    }

    // Clean up container
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }

    this._map = undefined;
  }

  // Public methods to interact with the search box
  getValue() {
    return this._searchBox ? this._searchBox.value : '';
  }

  setValue(value) {
    if (this._searchBox) {
      this._searchBox.value = value;
    }
  }

  focus() {
    if (this._searchBox) {
      this._searchBox.focus();
    }
  }

  clear() {
    if (this._searchBox) {
      this._searchBox.clear();
    }
  }

  // Update the search proximity when location changes
  updateLocation(newLocation) {
    this._currentLocation = newLocation;
    if (this._searchBox && newLocation) {
      this._searchBox.options = {
        ...this._searchBox.options,
        proximity: [newLocation.longitude, newLocation.latitude]
      };
    }
  }
}

export default SearchBoxControl;

