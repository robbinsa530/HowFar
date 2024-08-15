const fetch = require('node-fetch');

function checkForRefreshToken(req) {
  const hasToken = req.cookies.STRAVA_REFRESH != undefined;
  if (!hasToken) {
    console.error('User must login first.');
  }
  return hasToken;
}

async function fetchAccessToken(strava, req) {
  const refreshBody = {
    client_id: strava.client_id,
    client_secret: strava.client_secret,
    grant_type: 'refresh_token',
    refresh_token: req.cookies.STRAVA_REFRESH
  };
  const refreshResponse = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'post',
    body: JSON.stringify(refreshBody),
    headers: {'Content-Type': 'application/json'}
  });
  return refreshResponse;
}

async function fetchAuthenticatedAthlete(accessToken) {
  const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return athleteResponse;
}

function getGpxFromActivityData(data, includeTime=false) {
  /*
    Note: If includeTime=true, time data should be provided as:
    - data.startTime = Activity start time
    - points = [..., [lng, lat, timestamp], ...]
  */

  // Grab necessary bits from data
  const points = data.points;
  const title = data.title;
  const startTime = data.startTime; // Format: 2016-06-17T23:41:03Z

  // Create GPX file in memory
  let gpxString = '<?xml version="1.0" encoding="UTF-8"?> ' +
    '<gpx creator="HowFar" version="1.1" ' +
    'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/11.xsd" ' +
    'xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" ' +
    'xmlns="http://www.topografix.com/GPX/1/1" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns2="http://www.garmin.com/xmlschemas/GpxExtensions/v3">' +
    '<metadata>' +
    (includeTime ? `<time>${startTime}</time>` : '') +
    `</metadata><trk><name>${title}</name><trkseg>`;

  if (includeTime) {
    points.forEach(pt => gpxString += `<trkpt lat="${pt[1]}" lon="${pt[0]}"><time>${pt[2]}</time></trkpt>`);
  } else {
    points.forEach(pt => gpxString += `<trkpt lat="${pt[1]}" lon="${pt[0]}"></trkpt>`);
  }

  gpxString += '</trkseg></trk></gpx>';

  return gpxString;
}

module.exports = {
  checkForRefreshToken,
  fetchAccessToken,
  fetchAuthenticatedAthlete,
  getGpxFromActivityData
}
