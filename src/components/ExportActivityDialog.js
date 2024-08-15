import React, { useCallback, useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

import './ExportActivityDialog.css';

const ALLOWED_CHARS = /^[a-zA-Z0-9_.-]/;

function ExportActivityDialog({ onPost, onCancel, open }) {
  const [filename, setFilename] = React.useState('my_activity');
  const [errorMessage, setErrorMessage] = React.useState('');

  const onFilenameChange = useCallback((event) => {
    setFilename(event.target.value);
  }, []);

  const validateFilename = useCallback((value) => {
    let illegals = "";
    for (let i = 0; i < value.length; i++) {
      const c = value.charAt(i);
      if (!ALLOWED_CHARS.test(c) && !illegals.includes(c)) {
        const toAdd = (c === " " ? "<space>" : c);
        illegals += toAdd;
      }
    }

    return illegals;
  }, []);

  useEffect(() => {
    const illegals = validateFilename(filename);
    if (illegals.length > 0) {
      setErrorMessage("Illegal symbol(s): " + illegals);
    } else {
      setErrorMessage("");
    }
  }, [filename]);

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
          onPost(formJson);
          onCancel(); // Just used to close window
        },
      }}
    >
      <DialogTitle>Export activity as GPX file</DialogTitle>
      <DialogContent>
        <div className='export-grid-container'>
          <div className="export-cell grid-item-filename">
            <TextField
              autoFocus
              required
              margin="dense"
              id="activity-filename"
              name="filename"
              label="File name"
              fullWidth
              variant="filled"
              error={validateFilename(filename).length > 0}
              helperText={errorMessage}
              value={filename}
              onChange={onFilenameChange}
            />
          </div>
          <div className="export-cell grid-item-gpx">
            <Typography className="gpx-text">.gpx</Typography>
          </div>
        </div>

      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={errorMessage.length > 0 || filename.length === 0}>Export</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExportActivityDialog;