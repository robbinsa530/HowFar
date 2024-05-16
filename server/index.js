// server/index.js
const express = require("express");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

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
    MAPBOX_PUB_KEY: process.env.MAPBOX_PUB_KEY
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

app.post("/postManualActivityToStrava", async (req, res) => {
  // 1. Check for refresh token and request access token
  const hasToken = req.cookies.STRAVA_REFRESH != undefined;
  if (!hasToken) {
    console.error('User must login first.');
    res.status(401).send('User must login first.');
    return;
  }

  // 2. We request an access token every time because it's easier than checking if old access token is still valid
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

  const activityBody = {
    name: title,
    description,
    type: sportType,
    start_date_local: startTime,
    elapsed_time: durationInSeconds,
    distance: distanceInMiles * 1609.344
  };
  const postResponse = await fetch('https://www.strava.com/api/v3/activities', {
    method: 'post',
    body: JSON.stringify(activityBody),
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (postResponse.ok) {
    res.status(200).send("Success");
  } else {
    const errText = await postResponse.text();
    console.error("post activity failed.", errText);
    res.status(400).send("Post activity failed.");
  }
});

app.post("/uploadToStrava", async (req, res) => {
  // 1. Check for refresh token and request access token
  const hasToken = req.cookies.STRAVA_REFRESH != undefined;
  if (!hasToken) {
    console.error('User must login first.');
    res.status(401).send('User must login first.');
    return;
  }

  // 2. We request an access token every time because it's easier than checking if old access token is still valid
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
  if (!refreshResponse.ok) {
    const errText = await refreshResponse.text();
    console.error('Authentication failed.', errText);
    res.status(401).send("Authentication failed.");
    return;
  }
  const refreshData = await refreshResponse.json();
  const accessToken = refreshData.access_token;

  // Check authenticated athlete
  const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (!athleteResponse.ok) {
    const errText = await athleteResponse.text();
    console.error('Failed to check authenticated athlete.', errText);
    res.status(401).send("Failed to check authenticated athlete.");
    return;
  }
  const athleteData = await athleteResponse.json();

  // Just for now...
  // TODO: Remove
  if (athleteData.id !== 2792073) {
    res.status(401).send("Sorry, you aren't allowed to upload maps");
    return;
  }

  // Update refresh token cookie
  res.cookie('STRAVA_REFRESH', refreshData.refresh_token, { maxAge: 1000*60*60*24*180, httpOnly: true, sameSite:'Strict', overwrite: true });

  // Grab data from req
  const points = req.body.points;
  const title = req.body.title;
  const description = req.body.description;
  const startTime = req.body.startTime; // Format: 2016-06-17T23:41:03Z
  const endTime = req.body.endTime;
  const sportType = req.body.sportType;
  const externalId = uuidv4();

  // 3. Create GPX file in memory
  let gpxString = '<?xml version="1.0" encoding="UTF-8"?> ' +
    '<gpx creator="HowFar" version="1.1" ' +
    'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/11.xsd" ' +
    'xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" ' +
    'xmlns="http://www.topografix.com/GPX/1/1" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns2="http://www.garmin.com/xmlschemas/GpxExtensions/v3">' +
    `<metadata><time>${startTime}</time></metadata><trk><name>${title}</name><trkseg>`;
  
  points.forEach(pt => gpxString += `<trkpt lat="${pt[1]}" lon="${pt[0]}"><time>${pt[2]}</time></trkpt>`);
  gpxString += '</trkseg></trk></gpx>';

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
    res.status(400).send("Upload failed.");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
