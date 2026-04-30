import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ fullscreen, message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullscreen ? { position: 'fixed', inset: 0, bgcolor: 'background.default', zIndex: 9999 } : { py: 8 }),
      }}
    >
      <CircularProgress size={40} sx={{ color: 'secondary.main', mb: 2 }} />
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  );
};

export default LoadingSpinner;
