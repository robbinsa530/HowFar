import React from 'react';
import { geojsonToPointsForGpx } from './StravaController'
import { XMLParser } from 'fast-xml-parser'
import { v4 as uuidv4 } from 'uuid';
import length from '@turf/length'
import lineChunk from '@turf/line-chunk'
import { addDragHandlerToMarker, getMarkerPopup } from './MapActionController'
import { getElevationChange } from './GeoController'
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

export async function downloadActivityGpx(data, geojson) {
  const points = geojsonToPointsForGpx(geojson);
  const postResp = await fetch("/exportGpx",
    {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        points,
        title: data.filename,
      })
    }
  );
  if (!postResp.ok) {
    const errText = await postResp.text();
    console.error("Failed to export activity to GPX.", postResp.status, errText);
    alert("Failed to export activity to GPX");
    return;
  }
  const postRespJson = await postResp.json();
  const gpxText = postRespJson.gpx;

  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(gpxText));
  element.setAttribute('download', data.filename + ".gpx");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export async function importRouteFromGpx(file, markers, geojson, map, undoActionList, getDirections, updateDistanceInComponent, setLoading) {
  const reader = new FileReader();
  reader.onabort = () => {
    console.log("File import read was aborted.");
    alert("Import cancelled.");
  };
  reader.onerror = () => {
    console.error("File import read failed.");
    alert("Import failed.");
  };
  reader.onload = async () => {
    const fileContents = reader.result;
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix : "@_"
    };
    const parser = new XMLParser(options);
    try {
      let result = parser.parse(fileContents);

      if (Object.hasOwn(result, "gpx")) {
        let layers = []
        if (Object.hasOwn(result.gpx, "trk")) { // Use trk if available
          layers = ["trk", "trkseg", "trkpt"];
        } else if (Object.hasOwn(result.gpx, "rte")) { // If no trk, use rte
          layers = ["rte", "rtept"];
        } else if (Object.hasOwn(result.gpx, "wpt")) { // If no trk or rte, use wpt
          layers = ["wpt"];
        } else {
          console.error("Malformed GPX file. No trk, rte or wpt.");
          alert("Import failed. Malformed GPX.");
          return;
        }

        // Go through layers and get 1-N pieces from each
        let data = [];
        let lastData = [result.gpx];
        layers.forEach(key => {
          lastData.forEach(value => {
            // Make sure key exists
            if (!Object.hasOwn(value, key)) {
              return; // continue
            }

            // Grab data
            if (value[key].constructor.name === "Array") {
              data.push(...value[key]);
            } else {
              data.push(value[key]);
            }
          });

          // Prepare to iterate again
          lastData = data;
          data = [];
        });

        // `lastData` should now be a list of items that contain lat/lon info
        // Convert data to a more usable format
        let points = lastData.map(pt => {
          return [parseFloat(pt["@_lon"]), parseFloat(pt["@_lat"])]; // Lng, Lat
        });

        // Don't bother loading if less than 2 points
        if (points.length < 2) {
          console.error(`Not enough points in GPX file. Only ${points.length} points.`);
          alert("Import failed. Not enough points in GPX file.");
          return;
        }

        // Move map to route boundaries
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLng = Infinity;
        let maxLng = -Infinity;
        points.forEach(pt => {
          minLat = Math.min(pt[1], minLat);
          maxLat = Math.max(pt[1], maxLat);
          minLng = Math.min(pt[0], minLng);
          maxLng = Math.max(pt[0], maxLng);
        });

        // Handle bbox crossing intl. dateline (even though it'll probably never happen)
        if (minLng < -90 && maxLng > 90) {
          maxLng -= 360;
        }

        map.current.fitBounds([
          [minLng, minLat], // sw
          [maxLng, maxLat]  // ne 
        ], { animate: false });

        // Wait for map to idle so we can get elevation info
        setLoading(true);
        await map.current.once("idle");
        setLoading(false);

        // Create a single long ass segment for the whole route
        let totalLine = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: points
          }
        };

        // Chunk the total line into 1 mile increments to make editing route easier after import
        const chunks = lineChunk(totalLine, 1, {units: 'miles'}).features;
        chunks.forEach(chunk => {
          let line = {
            type: 'Feature',
            properties: {
              id: uuidv4(),
              // distance: (Needs to be added)
              // eleUp: (Needs to be added)
              // eleDown: (Needs to be added)
            },
            geometry: {
              type: 'LineString',
              coordinates: chunk.geometry.coordinates
            }
          };
          line.properties.distance = length(line, {units: 'miles'});
          const startPtEl = map.current.queryTerrainElevation(
            line.geometry.coordinates[0], { exaggerated: false }
          )
          const [up, down] = getElevationChange(map, line, startPtEl);
          line.properties.eleUp = up;
          line.properties.eleDown = down;

          geojson.features.push(line);
        });

        // Add markers (start, end, 1miles)
        let markerCoordsAndLines = geojson.features.map((feat, i) => {
          let associatedLines;
          if (i === 0) {
            associatedLines = [feat.properties.id];
          } else {
            associatedLines = [geojson.features[i-1].properties.id, feat.properties.id];
          }
          return {
            coords: feat.geometry.coordinates[0],
            associatedLines
          };
        });

        // Make sure we get the last one
        const lastFeat = geojson.features[geojson.features.length-1];
        markerCoordsAndLines.push({
          coords: lastFeat.geometry.coordinates[lastFeat.geometry.coordinates.length-1],
          associatedLines: [lastFeat.properties.id]
        });

        for (const [i, obj] of markerCoordsAndLines.entries()) {
          const ref = React.createRef();
          ref.current = document.createElement('div');
          const idToUse = uuidv4();
          const popupRef = getMarkerPopup(idToUse, map, markers, geojson, undoActionList, getDirections, updateDistanceInComponent);

          let newMarker = {
            id: idToUse,
            element: ref.current,
            lngLat: obj.coords,
            associatedLines: obj.associatedLines,
            isDragging: false,
            snappedToRoad: false,
            elevation: map.current.queryTerrainElevation(
              obj.coords, { exaggerated: false }
            )
            // markerObj: (Needs to be added)
          };

          let addedMarker = new mapboxgl.Marker({
            className: i === 0 ? "start-marker" : (i === (markerCoordsAndLines.length - 1) ? "end-marker" : "marker"),
            element: ref.current,
            draggable: true
          }).setLngLat(newMarker.lngLat)
            .setPopup(new mapboxgl.Popup().setDOMContent(popupRef.current))
            .addTo(map.current);

          // Add marker to running list
          newMarker.markerObj = addedMarker;
          markers.push(newMarker);

          await addDragHandlerToMarker(newMarker, markers, map, geojson, idToUse, undoActionList, getDirections, updateDistanceInComponent);
        }

        // Update map
        updateDistanceInComponent();
        map.current.getSource('geojson').setData(geojson);
      } else {
        console.error("Malformed GPX file. Missing gpx field.");
        alert("Import failed. Malformed GPX.");
        return;
      }
    } catch(err){
      console.error("XML parsing failed.", err);
      alert("Import failed. Couldn't read file contents.");
    }
  }
  reader.readAsText(file);
}