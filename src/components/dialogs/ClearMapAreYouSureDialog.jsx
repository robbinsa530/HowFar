import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setClearMapOpen } from '../../store/slices/displaySlice';
import { resetEditState, resetRouteState } from '../../controllers/ResetController';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

function ClearMapAreYouSureDialog() {
  const dispatch = useDispatch();
  const {
    clearMapOpen,
    editInfoOpen
  } = useSelector((state) => state.display);

  function onYes() {
    // Clear the route from the map
    resetRouteState();
    dispatch(setClearMapOpen(false));

    // We allow clearing while editing a section, make sure we cancel the edit
    resetEditState();
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
            { "All points, lines and distances will be erased. You cannot undo this." + (editInfoOpen ? " (If editing route betwen points, this will also delete your edits)." : "") }
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