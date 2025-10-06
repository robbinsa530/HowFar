import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setClearMapOpen } from '../../store/slices/displaySlice';
import { setMarkers, setGeojsonFeatures, setUndoActionList } from '../../store/slices/routeSlice';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

function ClearMapAreYouSureDialog() {
  const dispatch = useDispatch();
  const { clearMapOpen } = useSelector((state) => state.display);

  function onYes() {
    dispatch(setMarkers([]));
    dispatch(setGeojsonFeatures([]));
    dispatch(setUndoActionList([]));
    dispatch(setClearMapOpen(false));
  }

  function onNo() {
    dispatch(setClearMapOpen(false));
  }
  return (
      <Dialog
        open={clearMapOpen}
        onClose={onNo}
        aria-labelledby="clear-map-are-you-sure-dialog"
        id="clear-map-are-you-sure-dialog"
      >
        <DialogTitle>
          {"Are you sure you want to clear the whole map?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            All points, lines and distances will be erased. You cannot undo this.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onYes}>Yes</Button>
          <Button onClick={onNo} autoFocus>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
  );
}

export default ClearMapAreYouSureDialog;