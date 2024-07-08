import { alpha, styled } from '@mui/material/styles';
import { blue } from '@mui/material/colors';
import Switch from '@mui/material/Switch';

const BlueSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: blue[200],
    '&:hover': {
      backgroundColor: alpha(blue[200], theme.palette.action.hoverOpacity),
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: blue[200],
  },
}));

export default BlueSwitch;