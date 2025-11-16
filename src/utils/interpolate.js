// Interpolates the value based on the index.
// Fills in null values with interpolated values based on nearest non-null values.
export function interpolateSpottyData(data) {
  for (let i = 0; i < data.length; i++) {
    if (data[i] === null) {
      // Find previous non-null value
      let prevIndex = i - 1;
      while (prevIndex >= 0 && data[prevIndex] === null) {
        prevIndex--;
      }
      const prevValue = prevIndex >= 0 ? data[prevIndex] : null;

      // Find next non-null value
      let nextIndex = i + 1;
      while (nextIndex < data.length && data[nextIndex] === null) {
        nextIndex++;
      }
      const nextValue = nextIndex < data.length ? data[nextIndex] : null;

      if (prevValue === null && nextValue === null) {
        data[i] = 0; // No valid points found
      } else if (prevValue === null) {
        data[i] = nextValue; // Use next value if no previous
      } else if (nextValue === null) {
        data[i] = prevValue; // Use previous value if no next
      } else {
        // Interpolate between prev and next
        const ratio = (i - prevIndex) / (nextIndex - prevIndex);
        data[i] = prevValue + (nextValue - prevValue) * ratio;
      }
    }
  }
  return data;
}

// Same thing as above but kind of a helper for [x,y] elevation data.
// Interpolates the elevation (index-1) based on distance (index-0).
// Input should be an array of [distance, elevation] pair arrays.
export function interpolateSpottyElevationData(eleData) {
  for (let i = 0; i < eleData.length; i++) {
    if (eleData[i][1] === null) {
      // Find previous non-null value
      let prevIndex = i - 1;
      while (prevIndex >= 0 && eleData[prevIndex][1] === null) {
        prevIndex--;
      }
      const prevValue = prevIndex >= 0 ? eleData[prevIndex] : null;

      // Find next non-null value
      let nextIndex = i + 1;
      while (nextIndex < eleData.length && eleData[nextIndex][1] === null) {
        nextIndex++;
      }
      const nextValue = nextIndex < eleData.length ? eleData[nextIndex] : null;

      if (prevValue === null && nextValue === null) {
        eleData[i][1] = 0; // No valid points found
      } else if (prevValue === null) {
        eleData[i][1] = nextValue[1]; // Use next value if no previous
      } else if (nextValue === null) {
        eleData[i][1] = prevValue[1]; // Use previous value if no next
      } else {
        // Interpolate between prev and next
        const ratio = (eleData[i][0] - prevValue[0]) / (nextValue[0] - prevValue[0]);
        eleData[i][1] = prevValue[1] + (nextValue[1] - prevValue[1]) * ratio;
      }
    }
  }
  return eleData;
}
