import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setClearEditOpen } from '../../store/slices/displaySlice';
import { resetEditState } from '../../controllers/ResetController';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

function ClearEditAreYouSureDialog() {
  const dispatch = useDispatch();
  const {
    clearEditOpen
  } = useSelector((state) => state.display);

  function onYes() {
    resetEditState();
    dispatch(setClearEditOpen(false));
  }

  function onNo() {
    dispatch(setClearEditOpen(false));
  }
  return (
      <Dialog
        open={clearEditOpen}
        onClose={onNo}
        aria-labelledby="clear-edit-are-you-sure-dialog"
        id="clear-edit-are-you-sure-dialog"
      >
        <DialogTitle>
          {"Are you sure you want to cancel your edit?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will cancel your edit, delete progress and restore the route to its original state.
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

export default ClearEditAreYouSureDialog;