// server/index.js
const express = require("express");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

const {
  checkForRefreshToken,
  fetchAccessToken,
  fetchAuthenticatedAthlete,
  getGpxFromActivityData
} = require('./utils')

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({limit: '50mb'}));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

// These need to be set in dev and prod
const strava = {
  client_id: process.env.STRAVA_CLIENT_ID,
  client_secret: process.env.STRAVA_CLIENT_SECRET
}

app.get("/checkHasToken", async (req, res) => {
  const hasToken = req.cookies.STRAVA_REFRESH != undefined;
  res.json({ hasToken });
});

app.get("/getApiTokens", async (req, res) => {
  res.json({ 
    STRAVA_CLIENT_ID: strava.client_id,
    MAPBOX_PUB_KEY: process.env.MAPBOX_PUB_KEY,
   });
});

app.get("/saveToken", async (req, res) => {
  const code = req.query.code;
  // const scope = req.query.scope;
  // TODO: Deal with wrong scope

  // Get and save access token
  const body = {
    client_id: strava.client_id,
    client_secret: strava.client_secret,
    code,
    grant_type: 'authorization_code'
  };

  const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'post',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'}
  });
  if (!response.ok) {
    res.status(401).send("Authentication failed. Please close this window and try again.");
    return;
  }
  const data = await response.json();

  // TODO: For prod, should use secure:true and everything should be over https
  // Set cookies to last 180 days
  res.cookie('STRAVA_REFRESH', data.refresh_token, { maxAge: 1000*60*60*24*180, httpOnly: true, sameSite:'Strict', overwrite: true });

  res.send("Authentication complete. You may close this tab. Don't worry, you shouldn't have to do this again.");
});

app.post("/saveDefaultLocation", async (req, res) => {
  const location = req.body;
  console.log("Saving default location:", location);
  // Save location data as comma-separated string in cookie
  const locationStr = `${location.lng},${location.lat},${location.zoom}`;
  res.cookie('DEFAULT_LOCATION', locationStr, { maxAge: 1000*60*60*24*365, httpOnly: true, sameSite:'Strict', overwrite: true });
  res.status(200).send("Default location saved.");
});

app.post("/clearDefaultLocation", async (req, res) => {
  res.clearCookie('DEFAULT_LOCATION');
  res.status(200).send("Default location cleared.");
});

app.get("/getDefaultLocation", async (req, res) => {
  const locationStr = req.cookies.DEFAULT_LOCATION;
  if (!locationStr) {
    res.status(200).send({location: null});
    return;
  }
  const locationArray = locationStr.split(',');
  const location = {
    lng: parseFloat(locationArray[0]),
    lat: parseFloat(locationArray[1]),
    zoom: parseFloat(locationArray[2])
  };

  if (Number.isNaN(location.lng) || Number.isNaN(location.lat) || Number.isNaN(location.zoom)) {
    res.status(200).send({location: null});
    return;
  }
  res.status(200).send({location});
});


app.get("/stravaUser", async (req, res) => {
  // 1. Check for refresh token and request access token
  if (!checkForRefreshToken(req)) {
    res.status(401).send('User must login first.');
    return;
  }

  // 2. We request an access token every time because it's easier than checking if old access token is still valid
  const refreshResponse = await fetchAccessToken(strava, req);
  if (!refreshResponse.ok) {
    const errText = await refreshResponse.text();
    console.error('Authentication failed.', errText);
    res.status(401).send("Authentication failed.");
    return;
  }
  const refreshData = await refreshResponse.json();
  const accessToken = refreshData.access_token;

  // Get authenticated athlete
  const athleteResponse = await fetchAuthenticatedAthlete(accessToken);
  if (!athleteResponse.ok) {
    const errText = await athleteResponse.text();
    console.error('Failed to check authenticated athlete.', errText);
    res.status(401).send("Failed to check authenticated athlete.");
    return;
  }
  const athleteData = await athleteResponse.json();
  res.json(athleteData);
});

app.post("/postManualActivityToStrava", async (req, res) => {
  // 1. Check for refresh token and request access token
  if (!checkForRefreshToken(req)) {
    res.status(401).send('User must login first.');
    return;
  }

  // 2. We request an access token every time because it's easier than checking if old access token is still valid
  const refreshResponse = await fetchAccessToken(strava, req);
  if (!refreshResponse.ok) {
    const errText = await refreshResponse.text();
    console.error('Authentication failed.', errText);
    res.status(401).send("Authentication failed.");
    return;
  }
  const refreshData = await refreshResponse.json();
  const accessToken = refreshData.access_token;

  // Update refresh token cookie
  res.cookie('STRAVA_REFRESH', refreshData.refresh_token, { maxAge: 1000*60*60*24*180, httpOnly: true, sameSite:'Strict', overwrite: true });

  const title = req.body.title;
  const description = req.body.description;
  const distanceInMiles = req.body.distance;
  const startTime = req.body.startTime; // Format: 2016-06-17T23:41:03Z
  const durationInSeconds = req.body.duration;
  const sportType = req.body.sportType;
  const gearId = req.body.gearId;

  let activityBody = {
    name: title,
    description,
    sport_type: sportType,
    start_date_local: startTime,
    elapsed_time: durationInSeconds,
    distance: distanceInMiles * 1609.344
  };

  if (gearId === "none") { // User specified no gear, no default
    activityBody.gear_id = "";
  }
  else if (gearId) { // User specified a piece of gear
    activityBody.gear_id = gearId;
  }
  // else, user specified default gear (empty string)
  // Simply do not include field in body for this

  const postResponse = await fetch('https://www.strava.com/api/v3/activities', {
    method: 'post',
    body: JSON.stringify(activityBody),
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (postResponse.ok) {
    /*
      This part should be necessary since the API docs don't say gear_id can be
      specified on activity creation, but rather that it must be updated after...
      But somehow it just works. Keeping this code just in case though.

      Note: The code below seems totally valid to me, but actually returns an error?
            But worst case its a good jumping off point. Someone else posted about
            the same error here: 
      https://communityhub.strava.com/t5/developer-discussions/updateactivitybyid-resource-not-found-error/m-p/27952
    */
    // If the user specified gear, upload that too
    // const gearId = req.body.gearId;
    // if (gearId) { // if not undefined and has string value
    //   const activityInfo = await postResponse.json();
    //   const activityId = activityInfo.id;
    //   const updateResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    //     method: 'put',
    //     body: JSON.stringify({
    //       gear_id: gearId
    //     }),
    //     headers: {
    //       'Authorization': `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json'
    //     }
    //   });
    //   if (!updateResponse.ok) {
    //     const errText = await updateResponse.text();
    //     console.error("adding gear to activity failed.", errText);
    //     res.status(400).send("Adding gear to activity failed. Activity was still created (with default gear if applicable).");
    //     return;
    //   }
    // }

    res.status(200).send("Success");
  } else {
    const errText = await postResponse.text();
    console.error("post activity failed.", errText);
    res.status(400).send("Failed to create Activity.");
  }
});

app.post("/uploadToStrava", async (req, res) => {
  // 1. Check for refresh token and request access token
  if (!checkForRefreshToken(req)) {
    res.status(401).send('User must login first.');
    return;
  }

  // 2. We request an access token every time because it's easier than checking if old access token is still valid
  const refreshResponse = await fetchAccessToken(strava, req);
  if (!refreshResponse.ok) {
    const errText = await refreshResponse.text();
    console.error('Authentication failed.', errText);
    res.status(401).send("Authentication failed.");
    return;
  }
  const refreshData = await refreshResponse.json();
  const accessToken = refreshData.access_token;

  // Check authenticated athlete
  const athleteResponse = await fetchAuthenticatedAthlete(accessToken);
  if (!athleteResponse.ok) {
    const errText = await athleteResponse.text();
    console.error('Failed to check authenticated athlete.', errText);
    res.status(401).send("Failed to check authenticated athlete.");
    return;
  }
  const athleteData = await athleteResponse.json();

  // Just for now (B, D & A)...
  // TODO: Remove
  if (![2792073, 35794954, 53422431].includes(athleteData.id)) {
    res.status(401).send("Sorry, you aren't allowed to upload maps");
    return;
  }

  // Update refresh token cookie
  res.cookie('STRAVA_REFRESH', refreshData.refresh_token, { maxAge: 1000*60*60*24*180, httpOnly: true, sameSite:'Strict', overwrite: true });

  // 3. Get data from body, and gpx string to turn into a file
  const title = req.body.title;
  const description = req.body.description;
  const sportType = req.body.sportType;
  const externalId = uuidv4();
  const gearId = req.body.gearId;
  const gpxString = getGpxFromActivityData(req.body, true);

  // 4. Post run to strava
  const content = Buffer.from(gpxString);
  const fileForm = new FormData();
  fileForm.append('file', content, {
    "Content-Type": "multipart/form-data",
    "filename": "route.gpx"
  });
  fileForm.append("name", title);
  fileForm.append("description", description);
  fileForm.append("data_type", "gpx");
  fileForm.append("sport_type", sportType);
  fileForm.append("external_id", externalId);

  if (gearId === "none") { // User specified no gear, no default
    fileForm.append("gear_id", "");
  }
  else if (gearId) { // User specified a piece of gear
    fileForm.append("gear_id", gearId);
  }
  // else, user specified default gear (empty string)
  // Simply do not include field in body for this

  const postResponse = await fetch('https://www.strava.com/api/v3/uploads', {
    method: 'post',
    body: fileForm,
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (postResponse.ok) {
    res.status(200).send("Success");
  } else {
    const errText = await postResponse.text();
    console.error("upload failed.", errText);
    res.status(400).send("Failed to upload activity.");
  }
});

app.post("/exportGpx", async (req, res) => {
  const gpxString = getGpxFromActivityData(req.body, false);
  res.status(200).send({gpx: gpxString});
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
