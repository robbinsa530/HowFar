import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';

function SimpleDialog({ open, text }) {
  return (
      <Dialog
        open={open}
        aria-labelledby="simple-dialog"
        id="simple-dialog"
      >
        <DialogTitle>
          {text}
        </DialogTitle>
      </Dialog>
  );
}

export default SimpleDialog;