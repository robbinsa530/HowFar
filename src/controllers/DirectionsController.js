const BASEDIR = 'https://api.mapbox.com/directions/v5/mapbox';

async function getRouteBetweenPoints(lngLatStart, lngLatEnd, walkwayBias, directionsMode, token) {
  let endpoint = `${BASEDIR}/${directionsMode}/${lngLatStart[0]},${lngLatStart[1]};${lngLatEnd[0]},${lngLatEnd[1]}?exclude=ferry&geometries=geojson&access_token=${token}&overview=full`;
  if (directionsMode === 'walking') {
    endpoint += `&walkway_bias=${walkwayBias}`;
  }
  let query;
  try {
    query = await fetch(endpoint, { method: 'GET' });
  }
  catch (error) {
    console.error(error);
    return { routes: [] };
  }

  if (query.ok) {
    return await query.json();
  } else {
    return { routes: [] };
  }
}

// TODO: Use when the directions API isn't working
// const BASEDIR = 'https://api.mapbox.com/optimized-trips/v1/mapbox/walking/'
// async function getRouteBetweenPoints(lngLatStart, lngLatEnd, walkwayBias, token) {
//   const endpoint = `${BASEDIR}${lngLatStart[0]},${lngLatStart[1]};${lngLatEnd[0]},${lngLatEnd[1]}?source=first&destination=last&roundtrip=false&geometries=geojson&overview=full&access_token=${token}`; // &exclude=ferry&walkway_bias=${walkwayBias}
//   let query;
//   try {
//     query = await fetch(endpoint, { method: 'GET' });
//   }
//   catch (error) {
//     console.error(error);
//     return { routes: [] };
//   }

//   if (query.ok) {
//     let result = await query.json();
//     result.routes = result.trips;
//     delete result.trips;
//     return result;
//   } else {
//     return { routes: [] };
//   }
// }


// Use for mocking. Forces Map component to use straight line distance
// Avoids unnecessary calls to API
// async function getRouteBetweenPoints(lngLatStart, lngLatEnd, token) {
//   return { routes: [] };
// }

module.exports = {
  getRouteBetweenPoints: getRouteBetweenPoints
}