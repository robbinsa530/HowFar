import React, { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import FormGroup from '@mui/material/FormGroup';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

import { postToStrava } from '../../controllers/StravaController';
import {
  setPostToStravaOpen,
  setMenuOpen
} from '../../store/slices/displaySlice';
import './PostToStravaDialog.css';

// Constants (used for gear selection)
const SHOE_ELIGIBLE = ["Run", "TrailRun", "Walk", "Hike"];
const BIKE_ELIGIBLE = ["Ride", "MountainBikeRide"];
const SHOE_TYPE = "SHOE_TYPE";
const BIKE_TYPE = "BIKE_TYPE";
const OTHER_TYPE = "OTHER_TYPE";

function PostToStravaDialog() {
  const dispatch = useDispatch();
  const {
    distance
  } = useSelector((state) => state.map);
  const {
    imperialOrMetric,
  } = useSelector((state) => state.settings);
  const {
    postToStravaOpen
  } = useSelector((state) => state.display);
  const [activityType, setActivityType] = React.useState('Run');
  const [pace, setPace] = React.useState('');
  const [hours, setHours] = React.useState(0);
  const [mins, setMins] = React.useState(0);
  const [secs, setSecs] = React.useState(0);
  const [distanceStr, setDistanceStr] = React.useState('');
  const [gear, setGear] = React.useState("");
  const [allGear, setAllGear] = React.useState({
    shoes: [],
    bikes: []
  });
  const [eligibleGear, setEligibleGear] = React.useState([]);
  const [fetchingGear, setFetchingGear] = React.useState(false);
  const [useDefaultGear, setUseDefaultGear] = React.useState(true);

  let currDate = new Date();
  const offset = currDate.getTimezoneOffset()
  currDate = new Date(currDate.getTime() - (offset*60*1000))
  let currDateSplit = currDate.toISOString().split('T');
  currDate = currDateSplit[0]
  const currTime = currDateSplit[1].substring(0,5);

  const onHourChange = useCallback((event) => {
    const val = event.target.value;
    if (val < 0) {
      event.target.value = Math.abs(val);
    }
    setHours(event.target.value === '' ? 0 : event.target.value);
  }, []);

  const onMinSecChange = useCallback((event) => {
    const val = event.target.value;
    if (val < 0) {
      event.target.value = Math.abs(val);
    }
    else if (val > 60) {
      event.target.value = '';
    }
    if (event.target.id === 'strava-minutes') {
      setMins(event.target.value === '' ? 0 : event.target.value);
    } else {
      setSecs(event.target.value === '' ? 0 : event.target.value);
    }
  }, []);

  const fetchGear = useCallback(async () => {
    setFetchingGear(true);
    try {
      const userResponse = await fetch("/stravaUser");
      if (userResponse.ok) {
        const user = await userResponse.json();

        // Set all gear
        let gearObj = {
          shoes: [],
          bikes: []
        };
        if (user.shoes && user.shoes.length > 0) {
          gearObj.shoes = user.shoes;
        }
        if (user.bikes && user.bikes.length > 0) {
          gearObj.bikes = user.bikes;
        }
        setAllGear(gearObj);
      } else {
        const errText = await userResponse.text();
        console.error("Error fetching gear.", errText);
        alert("Failed to get user's gear.");
      }
    }
    catch (error) {
      // Leave allGear untouched
      console.error("Error fetching gear.", error);
      alert("Failed to get user's gear.");
    }
    finally {
      setFetchingGear(false);
    }
  }, []);

  const handleSelectActivityChange = useCallback((event) => {
    const newGearType = getGearTypeFromActivity(event.target.value);
    const oldGearType = getGearTypeFromActivity(activityType);
    if (newGearType !== oldGearType) {
      setGear("");
    }
    setActivityType(event.target.value);
  }, [activityType]);

  const handleSelectGearChange = useCallback((event) => {
    setGear(event.target.value);
  }, []);

  const handleUseDefaultGearChange = useCallback(async (event) => {
    setUseDefaultGear(event.target.checked);
    if (!event.target.checked) {
      await fetchGear();
    } else {
      setGear("");
    }
  }, []);

  const getGearTypeFromActivity = useCallback((activity) => {
    if (SHOE_ELIGIBLE.includes(activity)) {
      return SHOE_TYPE;
    }
    if (BIKE_ELIGIBLE.includes(activity)) {
      return BIKE_TYPE;
    }
    // Will only happen if there are available activities besides run/walk/hike/bike
    return OTHER_TYPE;
  }, []);

  const handleCancel = useCallback(() => {
    dispatch(setPostToStravaOpen(false));
    dispatch(setMenuOpen(false));
  }, [dispatch]);

  // Hooks ************************

  useEffect(() => {
    let distStrInUnits = "";
    if (imperialOrMetric === "imperial") {
      distStrInUnits = distance.toFixed(2).toString() + " mi";
    } else { // metric
      distStrInUnits = (distance * 1.60934).toFixed(2).toString() + " km";
    }
    setDistanceStr(distStrInUnits);
  }, [distance, imperialOrMetric]);

  // Update pace based on time
  useEffect(() => {
    let totalTime = parseInt(hours)*3600 + parseInt(mins)*60 + parseInt(secs);
    if (totalTime === 0) {
      setPace('');
      return;
    }

    let divisor;
    let unitStr;
    if (imperialOrMetric === "imperial") {
      divisor = distance;
      unitStr = "mi";
    } else { // metric
      divisor = distance * 1.60934;
      unitStr = "km";
    }

    let paceFrac = totalTime / divisor; // secs per mile or km
    let paceMins = Math.floor(paceFrac / 60);
    let paceSecs = Math.round(paceFrac % 60);

    // In case seconds get rounded to 60
    if (paceSecs === 60) {
      paceMins += 1;
      paceSecs = 0;
    }

    setPace(paceMins + ":" + ("0" + paceSecs).slice(-2) + ` min/${unitStr}`);
  }, [hours, mins, secs])

  // Update eligible gear based on activity type
  useEffect(() => {
    const gearType = getGearTypeFromActivity(activityType);
    if (gearType === SHOE_TYPE) {
      setEligibleGear(allGear.shoes);
    }
    else if (gearType === BIKE_TYPE) {
      setEligibleGear(allGear.bikes);
    }
    else { // gearType === OTHER_TYPE
      setEligibleGear([]);
    }
  }, [activityType, allGear])

  return (
    <Dialog
      open={postToStravaOpen}
      onClose={handleCancel}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries());
            formJson['sportType'] = activityType; // Workaround to get this into form

            if (useDefaultGear) {
              formJson['gearId'] = "";
            }
            else if (gear === "") {
              formJson['gearId'] = "none"; // Removes gear from activity
            }
            else {
              formJson['gearId'] = gear;
            }

            formJson['distance'] = distance; // Used later to calculate timestamps for intermediate points
            // Until there is a better way to get a map on Strava without faking data and potentially running 
            // into issues about "cheating" if my fake activities end up producing super fast times for segments,
            // we're not going to include maps in posts
            formJson['uploadMap'] = false;
            postToStrava(formJson);
            handleCancel(); // Just used to close window
          },
        }
      }}
    >
      <DialogTitle>Post route as activity to Strava</DialogTitle>
      <DialogContent>

        <div className='strava-grid-container'>
          <div className="strava-cell grid-item-title">
            <TextField
              autoFocus
              required
              margin="dense"
              id="strava-title"
              name="title"
              label="Activity Title"
              fullWidth
              variant="filled"
            />
          </div>
          <div className="strava-cell grid-item-desc">
            <TextField
              margin="dense"
              id="strava-description"
              name="description"
              label="Description"
              fullWidth
              variant="filled"
              multiline
              rows={4}
            />
          </div>

          <div className="strava-cell grid-date">
            <TextField
              required
              margin="dense"
              id="strava-date"
              name="date"
              label="Date"
              type="date"
              variant="filled"
              defaultValue={currDate}
            />
          </div>
          <div className="strava-cell grid-time">
            <TextField
              required
              margin="dense"
              id="strava-time"
              name="time"
              label="Time"
              type="time"
              variant="filled"
              defaultValue={currTime}
            />
          </div>

          <div className="strava-cell grid-hours">
            <TextField
              required
              margin="dense"
              id="strava-hours"
              name="hours"
              label="Hours"
              type="number"
              variant="filled"
              onChange={onHourChange}
              defaultValue={0}
              InputProps={{ inputProps: { min: 0 } }}
              onFocus={event => {
                event.target.select();
              }}
            />
          </div>
          <div className="strava-cell grid-mins">
            <TextField
              required
              margin="dense"
              id="strava-minutes"
              name="minutes"
              label="Minutes"
              type="number"
              variant="filled"
              onChange={onMinSecChange}
              defaultValue={0}
              InputProps={{ inputProps: { min: 0, max: 60 } }}
              onFocus={event => {
                event.target.select();
              }}
            />
          </div>
          <div className="strava-cell grid-secs">
            <TextField
              required
              margin="dense"
              id="strava-seconds"
              name="seconds"
              label="Seconds"
              type="number"
              variant="filled"
              onChange={onMinSecChange}
              defaultValue={0}
              InputProps={{ inputProps: { min: 0, max: 60 } }}
              onFocus={event => {
                event.target.select();
              }}
            />
          </div>

          <div className="strava-cell grid-activity">
            <FormControl
              variant="filled"
              required
            >
              <InputLabel id="strava-type">Activity Type</InputLabel>
              <Select
                id="strava-type"
                label="Activity Type"
                onChange={handleSelectActivityChange}
                value={activityType}
              >
                <MenuItem value={'Run'}>Run</MenuItem>
                <MenuItem value={'TrailRun'}>Trail Run</MenuItem>
                <MenuItem value={'Walk'}>Walk</MenuItem>
                <MenuItem value={'Hike'}>Hike</MenuItem>
                <MenuItem value={'Ride'}>Ride</MenuItem>
                <MenuItem value={'MountainBikeRide'}>Mountain Bike Ride</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="strava-cell grid-distance">
            <FormControl
              variant="filled"
            >
              <TextField
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: "#222"
                  }
                }}
                id="strava-distance"
                disabled
                value={distanceStr}
                label="Distance"
              >
              </TextField>
            </FormControl>
          </div>
          <div className="strava-cell grid-pace">
            <FormControl
              variant="filled"
            >
              <TextField
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: "#222"
                  }
                }}
                id="strava-pace"
                disabled
                value={pace}
                label="Pace"
              >
              </TextField>
            </FormControl>
          </div>

          <div className="strava-cell grid-use-gear">
            <FormGroup
              id="strava-use-gear"
            >
              <FormControlLabel
                control={<Checkbox 
                  checked={useDefaultGear}
                  onChange={handleUseDefaultGearChange}
                />}
                label="Use Default Gear"
              />
            </FormGroup>
          </div>
          <div className="strava-cell grid-gear">
              {
                useDefaultGear
                ? null
                : (fetchingGear
                  ? <p>Fetching Gear...</p>
                  : <>
                    <FormControl
                      variant="filled"
                    >
                      <InputLabel id="strava-gear">Choose Gear</InputLabel>
                      <Select
                        id="strava-gear"
                        label="Choose Gear"
                        onChange={handleSelectGearChange}
                        value={gear}
                      >
                        {
                          eligibleGear.map(g => {
                            return <MenuItem value={g.id} key={g.id}>{g.name}</MenuItem>
                          })
                        }
                      </Select>
                    </FormControl>
                    <Typography variant="caption">Leave blank to attach no gear</Typography>
                  </>)
              }
          </div>
          <div className='strava-cell map-question-link'>
          <a href="https://github.com/robbinsa530/HowFar/blob/main/FAQ.md#why-doesnt-my-map-show-up-on-strava" target="_blank" rel="noreferrer">Why does my map not show up on Strava?</a>
          </div>
        </div>

      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button type="submit">Post</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PostToStravaDialog;