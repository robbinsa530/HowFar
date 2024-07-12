const BASEDIR = 'https://api.mapbox.com/directions/v5/mapbox/walking/';

async function getRouteBetweenPoints(lngLatStart, lngLatEnd, walkwayBias, token) {
  const endpoint = `${BASEDIR}${lngLatStart[0]},${lngLatStart[1]};${lngLatEnd[0]},${lngLatEnd[1]}?exclude=ferry&geometries=geojson&access_token=${token}&overview=full&walkway_bias=${walkwayBias}`;
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


// Use for mocking. Forces Map component to use straight line distance
// Avoids unnecessary calls to API
// async function getRouteBetweenPoints(lngLatStart, lngLatEnd, token) {
//   return { routes: [] };
// }

module.exports = {
  getRouteBetweenPoints: getRouteBetweenPoints
}