import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

function AreYouSureDialog({ onYes, onNo, open }) {
  return (
      <Dialog
        open={open}
        onClose={onNo}
        aria-labelledby="are-you-sure-dialog"
        id="are-you-sure-dialog"
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

export default AreYouSureDialog;