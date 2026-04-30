import { createTheme } from '@mui/material/styles';
import { breakpoints } from './breakpoints';
import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';

const theme = createTheme({
  breakpoints,
  palette,
  typography,
  shape: { borderRadius: 12 },
  components,
});

export default theme;
