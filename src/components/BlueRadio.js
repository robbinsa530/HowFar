import { blue } from '@mui/material/colors';
import Radio from '@mui/material/Radio';

function BlueRadio(props) {
  return (
    <Radio {...props}
      sx={{
        color: blue[200],
        '&.Mui-checked': {
          color: blue[200],
        },
      }}
    />
  );
}

export default BlueRadio;