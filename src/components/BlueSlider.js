import { blue } from '@mui/material/colors';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';

const MIN = -1;
const MAX = 1;

const marks = [
  {
    value: MIN,
    label: '',
  },
  {
    value: MAX,
    label: '',
  }
];

// Component defined for more specific use than the other "Blue" components
//  because it makes things a little cleaner in Map.js and because I don't
//  really care
function BlueSlider(props) {
  return (
    <Box>
      <Tooltip title={<Typography>{props.tooltip}</Typography>}>
        <Slider {...props}
          marks={marks}
          sx={{
            color: blue[200]
          }}
        />
      </Tooltip>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography
          variant="body2"
        >
          Roads
        </Typography>
        <Typography
          variant="body2"
        >
          Walkways
        </Typography>
      </Box>
    </Box>
  );
}

export default BlueSlider;