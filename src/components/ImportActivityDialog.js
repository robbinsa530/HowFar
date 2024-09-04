import React, { useCallback } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import './ImportActivityDialog.css';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function ImportActivityDialog({ onImport, onCancel, open }) {
  const [file, setFile] = React.useState(null);

  const handleFileSelected = useCallback((event) => {
    if (event.target.files.length > 0) {
      setFile(event.target.files[0])
    }
  }, []);
 
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        component: 'form',
        onSubmit: (event) => {
          event.preventDefault();
          onImport(file);
          onCancel(); // Just used to close window
        },
      }}
    >
      <DialogTitle>Import route from a GPX file</DialogTitle>
      <DialogContent>
        <div className='import-container'>
          <Button
            component="label"
            role={undefined}
            variant="contained"
            tabIndex={-1}
            startIcon={<CloudUploadIcon />}
          >
            Select File
            <VisuallyHiddenInput
              type="file"
              onChange={handleFileSelected}
              multiple={false}
              accept=".gpx,.GPX"
            />
          </Button>

          {file !== null && <Typography>{file.name}</Typography>}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={file === null}>Import</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportActivityDialog;