import React from 'react';
import cloneDeep from 'lodash.clonedeep';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import pointToLineDistance from "@turf/point-to-line-distance";
import length from '@turf/length'
import { v4 as uuidv4 } from 'uuid';
import { getElevationChange, updateMarkerElevation } from './GeoController';

//Used to move a marker back to its old spot after a move action is undone
export function moveMarkerBack(info) {
  // There are 3 possible cases. All of them require this step (moving the marker back to its old loc)
  info.marker.lngLat = info.oldPosition;
  info.marker.markerObj.setLngLat(info.oldPosition);
  info.marker.snappedToRoad = info.oldSnappedToRoad;
  info.marker.elevation = info.oldElevation;
  // The 3 cases are:
  // 1. The only existing marker was moved. Nothing else needs to be done
  // 2. An end point was moved. Move it back and adjust one line (if info.lines.length === 1)
  // 3. A middle point was moved. Move it back, and adjust 2 lines (if info.lines.length === 2)
  info.lines.forEach(l => {
    l.lineRef.properties.distance = l.oldLineCopy.properties.distance;
    l.lineRef.properties.eleUp = l.oldLineCopy.properties.eleUp;
    l.lineRef.properties.eleDown = l.oldLineCopy.properties.eleDown;
    l.lineRef.geometry.coordinates = l.oldLineCopy.geometry.coordinates;
  });
}

// Used to add a marker back when a delete action is undone
export function addMarkerBack(info, markers, geojson, map) {
  if (info.lines.length === 0) {
    // A sole marker was deleted. Just add it back
    info.marker.markerObj.addTo(map.current);
    markers.push(info.marker);
  }
  else if (info.lines.length === 1) {
    // An end point was deleted. Add it and its one associated line back
    info.marker.markerObj.addTo(map.current);
    markers.splice(info.index, 0, info.marker);
    info.lines[0].otherMarker.associatedLines.push(info.lines[0].line.properties.id);
    geojson.features.splice(info.lines[0].lineIndex, 0, info.lines[0].line);
    // Update color classes
    const otherMarkerIndex = markers.findIndex(m => m.id === info.lines[0].otherMarker.id);
    if (otherMarkerIndex === 0) {
      info.lines[0].otherMarker.markerObj.removeClassName("marker").removeClassName("end-marker").addClassName("start-marker");
    }
    else if (otherMarkerIndex === markers.length - 1) {
      info.lines[0].otherMarker.markerObj.removeClassName("marker").removeClassName("start-marker").addClassName("end-marker");
    }
    else {
      // Other point is no
      info.lines[0].otherMarker.markerObj.removeClassName("start-marker").removeClassName("end-marker").addClassName("marker");
    }
  }
  else { // info.lines.length === 2
    // A middle point was deleted. Add it back, and split line into 2 lines

    // Sanity check
    if (info.lines[1].lineIndex !== info.lines[0].lineIndex + 1) {
      console.error("Geojson lines were out of order somehow. Undo failed.");
      alert("Undo failed");
      return;
    }

    info.marker.markerObj.addTo(map.current);
    markers.splice(info.index, 0, info.marker);
    geojson.features = geojson.features.filter(
      f => f.properties.id !== info.lineAddedOnDeleteId
    );
    geojson.features.splice(info.lines[0].lineIndex, 0, info.lines[0].line, info.lines[1].line);
    info.lines[0].otherMarker.associatedLines = info.lines[0].otherMarker.associatedLines.filter(l => l !== info.lineAddedOnDeleteId);
    info.lines[1].otherMarker.associatedLines = info.lines[1].otherMarker.associatedLines.filter(l => l !== info.lineAddedOnDeleteId);
    info.lines[0].otherMarker.associatedLines.push(info.lines[0].line.properties.id);
    info.lines[1].otherMarker.associatedLines.push(info.lines[1].line.properties.id);
  }
}

export async function removeMarker(markerIdToRemove, markers, geojson, getDirections) {
  let markerToRemoveIndex = markers.findIndex(m => m.id === markerIdToRemove);
  let markerToRemove = markers[markerToRemoveIndex];
  markerToRemove.markerObj.remove();
  markers.splice(markerToRemoveIndex, 1);
  let toReturn = {
    marker: markerToRemove,
    index: markerToRemoveIndex,
    lines: [ // Can hold 0-2 lines
      // { 
      //   line: LineString Feature,
      //   lineIndex: Number,
      //   otherMarker: Marker obj,
      // }
    ],
    lineAddedOnDeleteId: null
  };
  if (markers.length > 1) {
    // Marker removed. Update all associated lines
    if (markerToRemove.associatedLines.length === 1) {
      // End point. Remove associated line, update new end point
      const lineToRemoveId = markerToRemove.associatedLines[0];
      const lineToRemoveIndex = geojson.features.findIndex(
        f => f.properties.id === lineToRemoveId
      );
      const lineToRemove = geojson.features[lineToRemoveIndex];
      toReturn.lines.push({
        line: lineToRemove,
        lineIndex: lineToRemoveIndex,
        otherMarker: null // To be filled
      });
      geojson.features.splice(lineToRemoveIndex, 1);

      // Remove all references to the deleted line from all markers
      markers.forEach((m,i) => {
        const startLen = m.associatedLines.length;
        markers[i].associatedLines = m.associatedLines.filter(
          l => l !== lineToRemoveId
        );
        const endLen = markers[i].associatedLines.length;
        if (startLen !== endLen) { // Marker was associated with line
          toReturn.lines[0].otherMarker = markers[i];
        }
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
      const lineIndices = linesToRemove.map(l => {
        return geojson.features.findIndex(f => f.properties.id === l);
      });
      const line1Index = Math.min(...lineIndices);
      toReturn.lines.push({
        line: geojson.features[line1Index],
        lineIndex: line1Index,
        otherMarker: null // To be filled
      });
      const line2Index = Math.max(...lineIndices);
      toReturn.lines.push({
        line: geojson.features[line2Index],
        lineIndex: line2Index,
        otherMarker: null // To be filled
      });
      geojson.features = geojson.features.filter(
        f => !linesToRemove.includes(f.properties.id)
      );

      // Remove all references to the deleted line from affected markers
      const lMarker = markers[markerToRemoveIndex - 1];
      const rMarker = markers[markerToRemoveIndex /*+ 1*/]; // Don't need to +1 b/c marker has already been removed
      lMarker.associatedLines = lMarker.associatedLines.filter(l => !linesToRemove.includes(l));
      rMarker.associatedLines = rMarker.associatedLines.filter(l => !linesToRemove.includes(l));

      // Calculate new route and insert where the old lines were
      const [_, newLine] = await getDirections(lMarker, rMarker, [!lMarker.snappedToRoad, !rMarker.snappedToRoad]);
      toReturn.lineAddedOnDeleteId = newLine.properties.id;
      geojson.features.splice(Math.min(...lineIndices), 0, newLine);

      // Update markers at ends of new line with line's id
      lMarker.associatedLines.push(newLine.properties.id);
      rMarker.associatedLines.push(newLine.properties.id);
      toReturn.lines[0].otherMarker = lMarker;
      toReturn.lines[1].otherMarker = rMarker;
    }
    else if (markerToRemove.associatedLines.length === 0) {
      // Should never happen...
      alert("Error deleting point.");
      console.error("Multiple markers exist after removal, but removed marker had no associated lines. Not sure how that happened...");
    }
  } else {
    if (markers.length === 1) {
      toReturn.lines.push({
        line: geojson.features[0],
        lineIndex: 0,
        otherMarker: markers[0]
      });
    }
    geojson.features = [];
    markers.forEach((_,i) => {
      markers[i].associatedLines = [];
      markers[i].markerObj.removeClassName("marker").removeClassName("end-marker").addClassName("start-marker");
    });
  }
  return toReturn;
}

function getMarkerPopup(idToUse, map, markers, geojson, undoActionList, getDirections, updateDistanceInComponent) {
  // Create a Mapbox Popup with delete button
  const divRef = React.createRef();
  const btnRef = React.createRef();
  divRef.current = document.createElement('div');
  btnRef.current = document.createElement('div');
  btnRef.current.innerHTML = '<button class="marker-popup-btn">Delete point</button>';
  divRef.current.innerHTML = '<div></div>';
  divRef.current.appendChild(btnRef.current);
  btnRef.current.addEventListener('click', async (e) => {
    const undoActionInfo = await removeMarker(idToUse, markers, geojson, getDirections);
    updateDistanceInComponent();
    map.current.getSource('geojson').setData(geojson);

    // Allows for undo of 'delete' action
    undoActionList.push({
      type: 'delete',
      info: undoActionInfo
    });
  });
  return divRef;
}

async function addDragHandlerToMarker(addedMarker, markers, map, geojson, idToUse, undoActionList, getDirections, updateDistanceInComponent) {
  addedMarker.markerObj.on('dragstart', async (e) => {
    addedMarker.isDragging = true;
  });

  addedMarker.markerObj.on('dragend', async (e) => {
    addedMarker.isDragging = false;

    let draggedMarkerIndex = markers.findIndex(el => el.id === idToUse);
    let draggedMarker = markers[draggedMarkerIndex];
    let dragActionInfo = {
      marker: draggedMarker,
      oldSnappedToRoad: draggedMarker.snappedToRoad,
      oldElevation: draggedMarker.elevation,
      oldPosition: [...draggedMarker.lngLat], // Want copy since we're about to change this
      lines: [ // Can hold 0-2 lines.
        // {
        //   oldLineCopy: LineString Feature (Copy),
        //   lineRef: LineString Feature (Reference)
        // }
      ]
    };
    draggedMarker.lngLat = [e.target._lngLat.lng, e.target._lngLat.lat];
    if (markers.length > 1) {
      if (draggedMarker.associatedLines.length >= 1) {
        // Edit 1 or 2 associated lines
        let linesToEdit = [];
        draggedMarker.associatedLines.forEach(l => {
          linesToEdit.push(geojson.features.find(f => f.properties.id === l));
        });

        for (const [i, l] of linesToEdit.entries()) { // CANNOT use .forEach here b/c async
          dragActionInfo.lines.push({
            oldLineCopy: cloneDeep(l), // Need a deep clone b/c we're about to edit this obj's nested members
            lineRef: linesToEdit[i]
          });
          // Find other marker associated with line
          const otherMarkerIndex = markers.findIndex(m => m.id !== idToUse && m.associatedLines.includes(l.properties.id));
          // Replace old line with new one
          let calculatedDirections, newLine;
          if (draggedMarkerIndex < otherMarkerIndex) {
            [calculatedDirections, newLine] = await getDirections(
              markers[draggedMarkerIndex],
              markers[otherMarkerIndex],
              [false, !markers[otherMarkerIndex].snappedToRoad]);
          } else {
            [calculatedDirections, newLine] = await getDirections(
              markers[otherMarkerIndex],
              markers[draggedMarkerIndex],
              [!markers[otherMarkerIndex].snappedToRoad, false]);
          }
          linesToEdit[i].properties.distance = newLine.properties.distance;
          linesToEdit[i].properties.eleUp = newLine.properties.eleUp;
          linesToEdit[i].properties.eleDown = newLine.properties.eleDown;
          linesToEdit[i].geometry.coordinates = newLine.geometry.coordinates;

          // Update position of marker. This is in case it wasn't dragged onto a road or path,
          // the API will return the closest point to a road or path. That's what we wanna use
          if (i === 0) {
            draggedMarker.snappedToRoad = calculatedDirections;
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

    updateMarkerElevation(map, draggedMarker);
    // Allows for undo of 'move' action
    undoActionList.push({
      type: 'move',
      info: dragActionInfo
    });
  });
}

export async function handleLeftRightClick(e, markers, geojson, undoActionList, map, updateDistanceInComponent, getDirections, rightClick, addToEnd/*standard*/) {
  // Check that a marker wasnt being dragged when click happened
  let draggingMarker = markers.find(m => m.isDragging);
  if (draggingMarker) {
    draggingMarker.markerObj.setLngLat(draggingMarker.lngLat);
    draggingMarker.isDragging = false;
    return;
  }

  // If anything but a point was clicked, add a new one
  if (!markers.map(m => m.element).includes(e.originalEvent.target)) {
    // Create a new DOM node and save it to a React ref. This will be the marker element
    const ref = React.createRef();
    ref.current = document.createElement('div');
    const idToUse = uuidv4();
    const popupRef = getMarkerPopup(idToUse, map, markers, geojson, undoActionList, getDirections, updateDistanceInComponent);

    let markerToAdd = {
      id: idToUse,
      element: ref.current,
      lngLat: [e.lngLat.lng, e.lngLat.lat],
      associatedLines: [],
      isDragging: false
      // snappedToRoad: (Needs to be added)
      // markerObj: (Needs to be added)
      // elevation: (Needs to be added)
    };

    let addedMarker;
    let prevPt
    if (addToEnd) {
      // If theres already 1+ markers, calculate directions/distance
      if (markers.length > 0) {
        prevPt = markers[markers.length-1];
        const [calculatedDirections, newLine] = await getDirections(
          prevPt,
          markerToAdd,
          [!prevPt.snappedToRoad, false],
          (rightClick) ? false : undefined // If right click, just this time don't calculate directions
        );
        markerToAdd.snappedToRoad = calculatedDirections;

        // Associate this new line with both of its endpoint markers
        // This is so we can know which lines to edit on marker delete/move
        prevPt.associatedLines.push(newLine.properties.id); // markers[markers.length-1]
        markerToAdd.associatedLines.push(newLine.properties.id);

        // Update position of marker. This is in case click wasn't on a road or path,
        // the API will return the closest point to a road or path. That's what we wanna use
        markerToAdd.lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length -1];
        prevPt.lngLat = newLine.geometry.coordinates[0];

        if (markers.length === 1) { // Only on the second point, make sure we update the first too
          markers[0].markerObj.setLngLat(newLine.geometry.coordinates[0]);

          // TODO: Uncomment or remove after a while if line really wasn't needed
          // markers[0].lngLat = newLine.geometry.coordinates[0];
        }

        geojson.features.push(newLine);
        updateDistanceInComponent();

        //Edit class of last end marker so it'll be white
        if (markers.length > 1) {
          prevPt.markerObj.removeClassName("end-marker").addClassName("marker");
        }

        // Redraw lines on map
        map.current.getSource('geojson').setData(geojson);
      }

      addedMarker = new mapboxgl.Marker({
        className: markers.length ? "end-marker" : "start-marker",
        element: ref.current,
        draggable: true
      }).setLngLat(markerToAdd.lngLat)
        .setPopup(new mapboxgl.Popup().setDOMContent(popupRef.current))
        .addTo(map.current);

      // Add marker to running list
      markerToAdd.markerObj = addedMarker;
      markers.push(markerToAdd);
    }
    else { // Add to start
      // If theres already 1+ markers, calculate directions/distance
      if (markers.length > 0) {
        prevPt = markers[0];
        const [calculatedDirections, newLine] = await getDirections(
          markerToAdd,
          prevPt,
          [false, !prevPt.snappedToRoad],
          (rightClick) ? false : undefined // If right click, just this time don't calculate directions
        );
        markerToAdd.snappedToRoad = calculatedDirections;
        // Associate this new line with both of its endpoint markers
        // This is so we can know which lines to edit on marker delete/move
        prevPt.associatedLines.push(newLine.properties.id); // markers[markers.length-1]
        markerToAdd.associatedLines.push(newLine.properties.id);

        // Update position of marker. This is in case click wasn't on a road or path,
        // the API will return the closest point to a road or path. That's what we wanna use
        markerToAdd.lngLat = newLine.geometry.coordinates[0];
        prevPt.lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length - 1];

        if (markers.length === 1) { // Only on the second point, make sure we update the first too
          markers[0].markerObj.setLngLat(newLine.geometry.coordinates[newLine.geometry.coordinates.length - 1]);

          // TODO: Uncomment or remove after a while if line really wasn't needed
          // markers[0].lngLat = newLine.geometry.coordinates[newLine.geometry.coordinates.length - 1];
        }

        geojson.features.unshift(newLine);
        updateDistanceInComponent();

        // Edit class of last end marker so it'll be white (or red if there was only 1)
        if (markers.length === 1) {
          prevPt.markerObj.removeClassName("start-marker").addClassName("end-marker");
        } else {
          prevPt.markerObj.removeClassName("start-marker").addClassName("marker");
        }

        // Redraw lines on map
        map.current.getSource('geojson').setData(geojson);
      }

      addedMarker = new mapboxgl.Marker({
        className: "start-marker",
        element: ref.current,
        draggable: true
      }).setLngLat(markerToAdd.lngLat)
        .setPopup(new mapboxgl.Popup().setDOMContent(popupRef.current))
        .addTo(map.current);

      // Add marker to running list
      markerToAdd.markerObj = addedMarker;
      markers.unshift(markerToAdd);
    }

    updateMarkerElevation(map, markerToAdd);
    if (prevPt) {
      updateMarkerElevation(map, prevPt);
    }

    // Allows for undo of 'add' action
    undoActionList.push({
      type: 'add',
      marker: markerToAdd
    });

    await addDragHandlerToMarker(markerToAdd, markers, map, geojson, idToUse, undoActionList, getDirections, updateDistanceInComponent);
  }
}

export function undoOutAndBack(info, markers, geojson) {
  let removedMarkers = markers.splice(info.markersLength);
  removedMarkers.forEach(m => {
    m.markerObj.remove();
  })
  geojson.features.splice(info.linesLength);
  let lastMarker = markers[markers.length - 1];
  lastMarker.associatedLines = lastMarker.associatedLines.filter(l => l !== info.newAssocLineEndPt);
  lastMarker.markerObj.removeClassName("marker").addClassName("end-marker");
}

export async function handleOutAndBack(markers, geojson, undoActionList, map, getDirections, updateDistanceInComponent) {
  if (markers.length < 2) {
    return;
  }

  // Setup for undo
  const undoActionInfo = {
    markersLength: markers.length,
    linesLength: geojson.features.length
    // newAssocLineEndPt: (Needs to be added)
  };

  // Reverse and add new linesegments
  let newLines = [];
  for (let i = geojson.features.length - 1; i >= 0; i--) {
    const oldLine =  geojson.features[i];
    let newLine = { // To be returned
      type: 'Feature',
      properties: {
        id: uuidv4(),
        distance: oldLine.properties.distance,
        eleUp: -oldLine.properties.eleDown, // Up will be down in reverse
        eleDown: -oldLine.properties.eleUp // Down will be up in reverse
      },
      geometry: {
        type: 'LineString',
        coordinates: oldLine.geometry.coordinates.slice().reverse()
      }
    };
    newLines.push(newLine);
  }

  // Add first new line to associatedLines of last marker
  markers[markers.length - 1].associatedLines.push(newLines[0].properties.id);
  undoActionInfo.newAssocLineEndPt = newLines[0].properties.id;

  // Create and place new markers
  let newMarkers = [];
  markers[markers.length - 1].markerObj.removeClassName("end-marker").addClassName("marker");
  for (let i = markers.length - 2; i >= 0; i--) { // Don't repeat turnaround-point marker
    const oldMarker = markers[i];

    const ref = React.createRef();
    ref.current = document.createElement('div');
    const idToUse = uuidv4();
    const popupRef = getMarkerPopup(idToUse, map, markers, geojson, undoActionList, getDirections, updateDistanceInComponent);

    // Will be assoc w/ newLine of same index, and the next one if it exists
    const l1 = newMarkers.length;
    const l2 = l1 + 1;
    let newAssocLines = [newLines[l1].properties.id];
    if (l2 < newLines.length) {
      newAssocLines.push(newLines[l2].properties.id);
    }
    let newMarker = {
      id: idToUse,
      element: ref.current,
      lngLat: oldMarker.lngLat,
      associatedLines: newAssocLines,
      isDragging: false,
      snappedToRoad: oldMarker.snappedToRoad,
      elevation: oldMarker.elevation
      // markerObj: (Needs to be added)
    };

    let addedMarker = new mapboxgl.Marker({
      className: "marker",
      element: ref.current,
      draggable: true
    }).setLngLat(newMarker.lngLat)
      .setPopup(new mapboxgl.Popup().setDOMContent(popupRef.current))
      .addTo(map.current);

    // Add marker to running list
    newMarker.markerObj = addedMarker;
    newMarkers.push(newMarker);

    await addDragHandlerToMarker(newMarker, markers, map, geojson, idToUse, undoActionList, getDirections, updateDistanceInComponent);
  }

  geojson.features.push(...newLines);
  markers.push(...newMarkers);
  markers[markers.length - 1].markerObj.removeClassName("marker").addClassName("end-marker");

  undoActionList.push({
    type: 'out-and-back',
    info: undoActionInfo
  });
}

export function undoAddMarkerInLine(info, markers, geojson) {
  const associatedMarkers = [
    markers[info.addedMarkerIndex - 1],
    markers[info.addedMarkerIndex + 1],
  ];
  markers[info.addedMarkerIndex].markerObj.remove();
  markers.splice(info.addedMarkerIndex, 1);

  let addedLineIndices = [];
  geojson.features.forEach((f,i) => {
    if (info.addedLineIds.includes(f.properties.id)) {
      addedLineIndices.push(i);
    }
  });
  // 2 added lines will always be next to each other
  geojson.features.splice(Math.min(...addedLineIndices), 2, info.removedLine);

  associatedMarkers.forEach(m => {
    m.associatedLines = m.associatedLines.filter(l => ((l !== info.addedLineIds[0]) && (l !== info.addedLineIds[1])));
    m.associatedLines.push(info.removedLine.properties.id);
  });
}

export async function addNewMarkerInLine(e, newMarkerLngLat, markers, geojson, lineToSplitId, undoActionList, map, updateDistanceInComponent, getDirections) {
  // If existing point was clicked, do nothing
  if (markers.map(m => m.element).includes(e.originalEvent.target)) {
    return;
  }

  // Find markers associated with line we will remove
  let markersToEdit = [];
  let markersToEditIndices = [];
  markers.forEach((m,i) => {
    if (m.associatedLines.includes(lineToSplitId)) {
      markersToEdit.push(m);
      markersToEditIndices.push(i);
    }
  });
  if (markersToEdit.length !== 2) {
    console.error(`Somehow, line-to-be-split has ${markersToEdit.length} associated markers. Should have 2. Aborting`);
    alert("Failed to add new point.");
    return;
  }

  // Remove line associations from markers
  markersToEdit.forEach(m => {
    m.associatedLines = m.associatedLines.filter(l => l !== lineToSplitId);
  });

  // Set up new marker
  // Create a new DOM node and save it to a React ref. This will be the marker element
  const ref = React.createRef();
  ref.current = document.createElement('div');
  const idToUse = uuidv4();
  const popupRef = getMarkerPopup(idToUse, map, markers, geojson, undoActionList, getDirections, updateDistanceInComponent);
  let markerToAdd = {
    id: idToUse,
    element: ref.current,
    lngLat: [newMarkerLngLat.lng, newMarkerLngLat.lat],
    associatedLines: [],
    isDragging: false
    // snappedToRoad: (Needs to be added)
    // markerObj: (Needs to be added)
    // elevation: (Needs to be added)
  };

  /*
    Split line around point

    Turf line-split doesn't always work here due to a known problem, so go with a super 
    primitive approach of just finding the segment which the point is closest to. Luckily
    this works super well and pretty fast.

    Turf issues:
    https://github.com/Turfjs/turf/issues/2206
    https://github.com/Turfjs/turf/issues/852
  */
  const lineToSplitIndex = geojson.features.findIndex(f => f.properties.id === lineToSplitId);
  const lineToSplit = geojson.features[lineToSplitIndex];
  const geoPt = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [newMarkerLngLat.lng, newMarkerLngLat.lat]
    }
  };

  const ltsLen = lineToSplit.geometry.coordinates.length;
  let prevPt = lineToSplit.geometry.coordinates[ltsLen - 1];
  let minDist;
  let minDistIndex = -1;

  for (let i = ltsLen - 2; i >= 0; i--) {
    let coords = lineToSplit.geometry.coordinates[i];
    let tempLine = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [coords, prevPt] // prevPt 2nd b/c we're iterating in reverse (doesn't really matter)
      }
    };
    let ptToLineDist = pointToLineDistance(geoPt, tempLine);
    if ((minDistIndex < 0) || (ptToLineDist < minDist)) {
      minDist = ptToLineDist;
      minDistIndex = i;
    }
    prevPt = coords;
  }

  // Get 2 new coordinate sets
  let lCoords = lineToSplit.geometry.coordinates.slice(0, minDistIndex + 1);
  let rCoords = lineToSplit.geometry.coordinates.slice(minDistIndex + 1);
  lCoords.push(markerToAdd.lngLat);
  rCoords.unshift(markerToAdd.lngLat);

  // Create 2 new lines
  let newLine1 = { 
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: lCoords
    }
  };
  const [up1, down1] = getElevationChange(map, newLine1, markersToEdit[0].elevation);
  const dist1 = length(newLine1, {units: 'miles'});
  newLine1.properties = {
    id: uuidv4(),
    distance: dist1,
    eleUp: up1,
    eleDown: down1
  };
  markerToAdd.snappedToRoad = markersToEdit[1].snappedToRoad;
  markersToEdit[0].associatedLines.push(newLine1.properties.id);
  markerToAdd.associatedLines.push(newLine1.properties.id);

  updateMarkerElevation(map, markerToAdd);

  let newLine2 = { 
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: rCoords
    }
  };
  const [up2, down2] = getElevationChange(map, newLine2, markerToAdd.elevation);
  const dist2 = length(newLine2, {units: 'miles'});
  newLine2.properties = {
    id: uuidv4(),
    distance: dist2,
    eleUp: up2,
    eleDown: down2
  };
  markerToAdd.associatedLines.push(newLine2.properties.id);
  markersToEdit[1].associatedLines.push(newLine2.properties.id);

  const removedLine = geojson.features.splice(lineToSplitIndex, 1, newLine1, newLine2)[0]; // Returns same line as "lineToSplit" var
  updateDistanceInComponent();

  // Add new marker
  let addedMarker = new mapboxgl.Marker({
    className: "marker",
    element: ref.current,
    draggable: true
  }).setLngLat(markerToAdd.lngLat)
    .setPopup(new mapboxgl.Popup().setDOMContent(popupRef.current))
    .addTo(map.current);

  // Add marker to running list
  markerToAdd.markerObj = addedMarker;
  markers.splice(markersToEditIndices[1], 0, markerToAdd);

  // Redraw lines on map
  map.current.getSource('geojson').setData(geojson);

  await addDragHandlerToMarker(markerToAdd, markers, map, geojson, idToUse, undoActionList, getDirections, updateDistanceInComponent);

  const undoActionInfo = {
    addedMarkerIndex: markersToEditIndices[1],
    addedLineIds: [newLine1.properties.id, newLine2.properties.id],
    removedLine: removedLine
  };

  undoActionList.push({
    type: 'add-marker-in-line',
    info: undoActionInfo
  });
}