import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';

function LoadingDialog({ open }) {
  return (
      <Dialog
        open={open}
        aria-labelledby="loading-dialog"
        id="loading-dialog"
      >
        <DialogTitle>
          {"Loading..."}
        </DialogTitle>
      </Dialog>
  );
}

export default LoadingDialog;