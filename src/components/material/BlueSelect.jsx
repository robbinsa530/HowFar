import { styled } from '@mui/material/styles';
import { blue } from '@mui/material/colors';
import Select from '@mui/material/Select';

const BlueSelect = styled(Select)(() => ({
  'label + &': {
    marginTop: '3px',
  },
  '& .MuiSelect-icon': {
    color: 'white',
  },
  '& .MuiInputBase-input': {
    color: "white",
    fontSize: '1.2em'
  },
  '&.Mui-focused .MuiInputBase-input': {

  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: blue[200],
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderWidth: '2px',
    borderColor: blue[100],
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: blue[200],
  },
}));

export default BlueSelect;