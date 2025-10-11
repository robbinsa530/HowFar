import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  setImportActivityOpen,
  setMenuOpen
} from '../../store/slices/displaySlice';
import { importRouteFromGpx } from '../../controllers/ImportExportController';
import { resetEditState, resetRouteState } from '../../controllers/ResetController';

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

function ImportActivityDialog(props) {
  const dispatch = useDispatch();
  const mapRef = props.mapRef;
  const {
    importActivityOpen
  } = useSelector((state) => state.display);
  const [file, setFile] = React.useState(null);

  const handleFileSelected = (event) => {
    if (event.target.files.length > 0) {
      setFile(event.target.files[0])
    }
  };

  const handleCancel = () => {
    dispatch(setImportActivityOpen(false));
    dispatch(setMenuOpen(false));
  };

  const handleImport = (event) => {
    event.preventDefault();

    // Clear the map
    resetRouteState();

    // We allow importing while editing a section, make sure we cancel the edit
    resetEditState();

    importRouteFromGpx(file, mapRef.current);
    handleCancel();
  };

  return (
    <Dialog
      open={importActivityOpen}
      onClose={handleCancel}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: handleImport,
        }
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
        <Button onClick={handleCancel}>Cancel</Button>
        <Button type="submit" disabled={file === null}>Import</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportActivityDialog;