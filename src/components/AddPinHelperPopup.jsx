import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function AddPinHelperPopup() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgb(35 55 75 / 90%)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
      }}
    >
      <Typography>
        Click To Add Pin
      </Typography>
    </Box>
  );
}

export default AddPinHelperPopup;
