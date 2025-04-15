import length from '@turf/length'

export async function checkUserHasToken() {
  return fetch("/checkHasToken", { method: 'GET', credentials: 'include' });
}

export async function createManualActivityOnStrava(postData) {
  const startTime = new Date(Date.parse(postData.date + 'T' + postData.time + ':00.000Z')); // Local
  const durationInSeconds = (parseInt(postData.hours) * 3600) +
                            (parseInt(postData.minutes) * 60) +
                            (parseInt(postData.seconds));

  const postResp = await fetch("/postManualActivityToStrava",
    {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        title: postData.title,
        description: postData.description,
        startTime: startTime.toISOString(),
        duration: durationInSeconds,
        distance: postData.distance.toFixed(2),
        sportType: postData.sportType,
        gearId: postData.gearId
      })
    }
  );
  if (postResp.ok) {
    console.log("Successfully created activity on Strava");
    return "Successfully created activity on Strava";
  } else {
    const errText = await postResp.text();
    console.error("Failed to create activity on Strava.", postResp.status, errText);
    if (postResp.status >= 400 && postResp.status < 500) {
      return errText;
    } else {
      return "Failed to create activity on Strava.";
    }
  }
}

export function geojsonToPointsForGpx(geojson) {
  // Calculate points array from route
  let points = [];
  geojson.features.forEach(f => {
    // (Avoid any kind of deep copy)
    // All but the last pt (last pt of each line is 1st pt of next line)
    f.geometry.coordinates.slice(0, -1).forEach(coord => {
      points.push([...coord]);
    });
  });

  const lastLineGeomArrayLength = geojson.features[geojson.features.length -1].geometry.coordinates.length;
  points.push([...geojson.features[geojson.features.length -1].geometry.coordinates[lastLineGeomArrayLength - 1]]); // Cuz we missed the actual last point

  return points;
}

//! Deprecated
export async function uploadActivityToStrava(postData, geojson) {
  // Calculate start/end times in current time zone
  let baseDate = new Date(Date.parse(postData.date + 'T' + postData.time + ':00.000Z'));
  const offset = baseDate.getTimezoneOffset();
  const startTime = new Date(baseDate.getTime() + (offset*60*1000)); // UTC
  const durationInSeconds = (parseInt(postData.hours) * 3600) +
                            (parseInt(postData.minutes) * 60) +
                            (parseInt(postData.seconds));
  const endTime = new Date(startTime.getTime() + (durationInSeconds*1000));

  let points = geojsonToPointsForGpx(geojson);

  // Add time information to points
  let tempLine = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  };

  // Gotta do some weird math because summing geometry distances never quite matches up to total route distance.
  // I suspect this has to do with how so many numbers are being rounded along the way, there is probably a small
  // loss of precision. Regardless, this algorithm almost always ends up producing a GPX file with the correct
  // distance and time. However, on strava the pace graph always ends up super jumpy (by ~10-20s/mile). This is because
  // (it seems) Strava ignores milliseconds of timestamps associated with route points, so some segments will have their 
  // time altered by up to a whole second (which for small segments will alter pace drastically). 
  //
  // I tried a different strategy where I broke up the route into 2 second waypoint intervals based on pace. This mostly
  // worked, but any time there was a 90-180 degree turn in the route, the pace was very wrong again. Additionally with
  // this method the distance and time was sometimes off by a small amount.
  //
  // In the end I've chosen (for now) to keep this method which produces correct times/distances but an ugly pace graph.
  let clock = startTime.getTime();
  const totalDist = postData.distance;
  let runningDist = 0.0;
  for (const [i, pt] of points.entries()) {
    let dist = 0.0;
    if (i > 0) {
      tempLine.geometry.coordinates = [points[i-1], pt];
      dist = length(tempLine, {units: 'miles'});
      runningDist += dist;
    }
    points[i].push(dist);
  }
  const ratio = runningDist / totalDist;
  for (const [i, pt] of points.entries()) {
    let segDuration = ((pt[2]/totalDist) * durationInSeconds) / ratio;
    clock += (segDuration*1000);
    points[i][2] = (new Date(clock)).toISOString();
  }
  // Usually its off by like 0.001-0.01ms
  points[points.length - 1][2] = (new Date(Math.round(clock))).toISOString();

  const postResp = await fetch("/uploadToStrava",
    {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        points,
        title: postData.title,
        description: postData.description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        sportType: postData.sportType,
        gearId: postData.gearId
      })
    }
  );
  if (postResp.ok) {
    console.log("Successfully uploaded activity to Strava");
    return "Successfully uploaded activity to Strava";
  } else {
    const errText = await postResp.text();
    console.error("Failed to upload activity to Strava.", postResp.status, errText);
    if (postResp.status >= 400 && postResp.status < 500) {
      return errText;
    } else {
      return "Failed to upload activity to Strava";
    }
  }
}
