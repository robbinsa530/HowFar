import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

const DirectionModeButton = styled(Button)(({ theme }) => ({
  flex: 1,
  borderRadius: 0,
  '&.direction-mode-button-left': {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  '&.direction-mode-button-right': {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  '&.direction-mode-button-selected': {
    backgroundColor: '#1976d2',
    border: '1px solid #4da6ff',
    '&:hover': {
      backgroundColor: '#1565c0',
    },
  },
  '&.direction-mode-button-unselected': {
    backgroundColor: '#909090',
    color: '#b8b8b8',
    '&:hover': {
      backgroundColor: '#777777',
    },
  },
}));

export default DirectionModeButton; 