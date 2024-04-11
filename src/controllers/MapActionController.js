import React from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

export async function handleLeftRightClick(e, markers, geojson, map, updateDistanceInComponent, getDirections, rightClick, addToEnd/*standard*/) {
  // If anything but a point was clicked, add a new one
  if (!markers.map(m => m.element).includes(e.originalEvent.target)) {
    // Create a new DOM node and save it to a React ref. This will be the marker element
    const ref = React.createRef();
    ref.current = document.createElement('div');
    const idToUse = String(new Date().getTime());
    
    // Create a Mapbox Popup with delete button
    const divRef = React.createRef();
    const btnRef = React.createRef();
    divRef.current = document.createElement('div');
    btnRef.current = document.createElement('div');
    btnRef.current.innerHTML = '<button class="marker-popup-btn">Delete point</button>';
    divRef.current.innerHTML = '<div></div>';
    divRef.current.appendChild(btnRef.current);
    btnRef.current.addEventListener('click', async (e) => {
      let markerToRemoveIndex = markers.findIndex(el => el.id === idToUse);
      let markerToRemove = markers[markerToRemoveIndex];
      markerToRemove.markerObj.remove();
      markers.splice(markerToRemoveIndex, 1);
      if (markers.length > 1) {
        // Marker removed. Update all associated lines
        if (markerToRemove.associatedLines.length === 1) {
          // End point. Remove associated line, update new end point
          const lineToRemove = markerToRemove.associatedLines[0];
          geojson.features = geojson.features.filter(
            f => f.properties.id !== lineToRemove
          );

          // Remove all references to the deleted line from all markers
          markers.forEach((m,i) => {
            markers[i].associatedLines = m.associatedLines.filter(
              l => l !== lineToRemove
            );
          });

          //Edit class of start/end marker so it'll be white
          if (markerToRemoveIndex === 0) { // Start removed
            markers[0].markerObj.removeClassName("marker").addClassName("start-marker")
          } else { // End removed
            markers[markers.length -1].markerObj.removeClassName("marker").addClassName("end-marker");
          }
        }
        else if (markerToRemove.associatedLines.length > 1) {
          // Middle point. Remove associated lines, reroute, update
          const linesToRemove = markerToRemove.associatedLines;
          geojson.features = geojson.features.filter(
            f => !linesToRemove.includes(f.properties.id)
          );

          // Remove all references to the deleted line from affected markers
          const lMarker = markers[markerToRemoveIndex - 1];
          const rMarker = markers[markerToRemoveIndex /*+ 1*/]; // Don't need to +1 b/c marker has already been removed
          lMarker.associatedLines = lMarker.associatedLines.filter(l => !linesToRemove.includes(l));
          rMarker.associatedLines = rMarker.associatedLines.filter(l => !linesToRemove.includes(l));

          // Calculate new route
          const newLine = await getDirections(lMarker.lngLat, rMarker.lngLat);
          geojson.features.push(newLine);

          // Update markers at ends of new line with line's id
          lMarker.associatedLines.push(newLine.properties.id);
          rMarker.associatedLines.push(newLine.properties.id);
        }
        else if (markerToRemove.associatedLines.length === 0) {
          // Should never happen...
          alert("Error deleting point.");
          console.error("Multiple markers exist after removal, but removed marker had no associated lines. Not sure how that happened...");
        }
      } else {
        geojson.features = [];
        markers.forEach((_,i) => {
          markers[i].associatedLines = [];
          markers[i].markerObj.removeClassName("marker").removeClassName("end-marker").addClassName("start-marker");
        });
      }
      updateDistanceInComponent();
      map.current.getSource('geojson').setData(geojson);
    });

    let markerToAdd = {
      id: idToUse,
      element: ref.current,
      lngLat: [e.lngLat.lng, e.lngLat.lat],
      associatedLines: []
      // markerObj: (Needs to be added)
    };

    let addedMarker;
    if (addToEnd) {
      // If theres already 1+ markers, calculate directions/distance
      if (markers.length + 1 > 1) {
        let prevPt = markers[markers.length-1];
        const newLine = await getDirections(
          [prevPt.lngLat[0], prevPt.lngLat[1]],
          markerToAdd.lngLat,
          (rightClick) ? false : undefined // If right click, just this time don't calculate directions
        );
        // Associate this new line with both of its endpoint markers
        // This is so we can know which lines to edit on marker delete/move
        prevPt.associatedLines.push(newLine.properties.id); // markers[markers.length-1]
        markerToAdd.associatedLines.push(newLine.properties.id);

        // Update position of marker. This is in case click wasn't on a road or path,
        // the API will return the closest point to a road or path. That's what we wanna use
        markerToAdd.lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length -1];

        if (markers.length === 1) { // Only on the second point, make sure we update the first too
          markers[0].markerObj.setLngLat(newLine.geometry.coordinates[0]);
          markers[0].lngLat = newLine.geometry.coordinates[0];
        }

        geojson.features.push(newLine);
        updateDistanceInComponent();

        //Edit class of last end marker so it'll be white
        prevPt.markerObj.removeClassName("end-marker").addClassName("marker");

        // Redraw lines on map
        map.current.getSource('geojson').setData(geojson);
      }

      addedMarker = new mapboxgl.Marker({
        className: markers.length ? "end-marker" : "start-marker",
        element: ref.current,
        draggable: true
      }).setLngLat(markerToAdd.lngLat)
        .setPopup(new mapboxgl.Popup().setDOMContent(divRef.current))
        .addTo(map.current);

      // Add marker to running list
      markerToAdd.markerObj = addedMarker;
      markers.push(markerToAdd);
    }
    else { // Add to start
      // If theres already 1+ markers, calculate directions/distance
      if (markers.length + 1 > 1) {
        let prevPt = markers[0];
        const newLine = await getDirections(
          markerToAdd.lngLat,
          [prevPt.lngLat[0], prevPt.lngLat[1]],
          (rightClick) ? false : undefined // If right click, just this time don't calculate directions
        );
        // Associate this new line with both of its endpoint markers
        // This is so we can know which lines to edit on marker delete/move
        prevPt.associatedLines.push(newLine.properties.id); // markers[markers.length-1]
        markerToAdd.associatedLines.push(newLine.properties.id);

        // Update position of marker. This is in case click wasn't on a road or path,
        // the API will return the closest point to a road or path. That's what we wanna use
        markerToAdd.lngLat = newLine.geometry.coordinates[0];

        if (markers.length === 1) { // Only on the second point, make sure we update the first too
          markers[0].markerObj.setLngLat(newLine.geometry.coordinates[newLine.geometry.coordinates.length - 1]);
          markers[0].lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length - 1];
        }

        geojson.features.unshift(newLine);
        updateDistanceInComponent();

        //Edit class of last end marker so it'll be white
        prevPt.markerObj.removeClassName("start-marker").addClassName("marker");

        // Redraw lines on map
        map.current.getSource('geojson').setData(geojson);
      }

      addedMarker = new mapboxgl.Marker({
        className: "start-marker",
        element: ref.current,
        draggable: true
      }).setLngLat(markerToAdd.lngLat)
        .setPopup(new mapboxgl.Popup().setDOMContent(divRef.current))
        .addTo(map.current);

      // Add marker to running list
      markerToAdd.markerObj = addedMarker;
      markers.unshift(markerToAdd);
    }

    addedMarker.on('dragend', async (e) => {
      let draggedMarkerIndex = markers.findIndex(el => el.id === idToUse);
      let draggedMarker = markers[draggedMarkerIndex];
      draggedMarker.lngLat = [e.target._lngLat.lng, e.target._lngLat.lat];
      if (markers.length > 1) {
        if (draggedMarker.associatedLines.length >= 1) {
          // Edit 1 or 2 associated lines
          let linesToEdit = [];
          draggedMarker.associatedLines.forEach(l => {
            linesToEdit.push(geojson.features.find(f => f.properties.id === l));
          });

          for (const [i, l] of linesToEdit.entries()) { // CANNOT use .forEach here b/c async
            // Find other marker associated with line
            const otherMarkerIndex = markers.findIndex(m => m.id !== idToUse && m.associatedLines.includes(l.properties.id));

            // Replace old line with new one
            const sIndex = Math.min(draggedMarkerIndex, otherMarkerIndex);
            const eIndex = Math.max(draggedMarkerIndex, otherMarkerIndex);
            const newLine = await getDirections(markers[sIndex].lngLat, markers[eIndex].lngLat);
            linesToEdit[i].properties.distance = newLine.properties.distance;
            linesToEdit[i].properties.eleUp = newLine.properties.eleUp;
            linesToEdit[i].properties.eleDown = newLine.properties.eleDown;
            linesToEdit[i].geometry.coordinates = newLine.geometry.coordinates;

            // Update position of marker. This is in case it wasn't dragged onto a road or path,
            // the API will return the closest point to a road or path. That's what we wanna use
            if (i === 0) {
              const coordIndex = (draggedMarkerIndex < otherMarkerIndex) ? 0 : newLine.geometry.coordinates.length -1;
              draggedMarker.markerObj.setLngLat(newLine.geometry.coordinates[coordIndex]);
              draggedMarker.lngLat = newLine.geometry.coordinates[coordIndex];
            }
          }
        }
        else if (draggedMarker.associatedLines.length === 0) {
          // Should never happen...
          alert("Error moving point.");
          console.error("Multiple markers exist, but dragged marker had no associated lines. Not sure how that happened...");
        }
        updateDistanceInComponent();
        map.current.getSource('geojson').setData(geojson);
      }
    });
  }
}
