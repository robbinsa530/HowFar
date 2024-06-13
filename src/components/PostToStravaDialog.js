import React, { useCallback, useEffect } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

import './PostToStravaDialog.css';

function PostToStravaDialog({ distance, onPost, onCancel, open }) {
  const [activityType, setActivityType] = React.useState('Run');
  const [pace, setPace] = React.useState('');
  const [hours, setHours] = React.useState(0);
  const [mins, setMins] = React.useState(0);
  const [secs, setSecs] = React.useState(0);
  const [distanceStr, setDistanceStr] = React.useState(distance.toFixed(2).toString() + " mi");

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

  // Update pace
  useEffect(() => {
    let totalTime = parseInt(hours)*3600 + parseInt(mins)*60 + parseInt(secs);
    if (totalTime === 0) {
      setPace('');
      return;
    }
    let paceFrac = totalTime / distance; // secs per mile
    let paceMins = Math.floor(paceFrac / 60);
    let paceSecs = Math.round(paceFrac % 60);

    setPace(paceMins + ":" + ("0" + paceSecs).slice(-2) + " min/mi");
  }, [hours, mins, secs])


  const handleSelectChange = useCallback((event) => {
    setActivityType(event.target.value);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        component: 'form',
        onSubmit: (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const formJson = Object.fromEntries(formData.entries());
          formJson['sportType'] = activityType; // Workaround to get this into form
          formJson['distance'] = distance; // Used later to calculate timestamps for intermediate points
          // Until there is a better way to get a map on Strava without faking data and potentially running 
          // into issues about "cheating" if my fake activities end up producing super fast times for segments,
          // we're not going to include maps in posts
          formJson['uploadMap'] = false;
          onPost(formJson);
          onCancel(); // Just used to close window
        },
      }}
    >
      <DialogTitle>Post route as activity to Strava</DialogTitle>
      <DialogContent>
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

        <TextField
          margin="dense"
          id="strava-description"
          name="description"
          label="Description"
          fullWidth
          variant="filled"
          multiline
          rows={5}
        />

        <Box
          sx={{
            '& .MuiTextField-root': { m: 1, width: '25ch' },
          }}
        >
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
        </Box>

        <Box
          sx={{
            '& .MuiTextField-root': { m: 1, width: '16ch' },
          }}
        >
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
        </Box>

        <FormControl
          variant="filled"
          required
          sx={{marginLeft: '8px', width: '20ch'}}
        >
          <InputLabel id="strava-type">Activity Type</InputLabel>
          <Select
            id="strava-type"
            label="Activity Type"
            onChange={handleSelectChange}
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

        <FormControl
          variant="filled"
          sx={{marginLeft: '8px', width: '15ch'}}
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

        <FormControl
          variant="filled"
          sx={{marginLeft: '8px', width: '15ch'}}
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

      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit">Post</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PostToStravaDialog;