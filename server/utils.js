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

module.exports = {
  checkForRefreshToken,
  fetchAccessToken,
  fetchAuthenticatedAthlete
}
