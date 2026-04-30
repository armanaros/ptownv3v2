import { Box, Typography } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

const EmptyState = ({ icon: Icon = InboxOutlined, title = 'No data', description, action }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, textAlign: 'center' }}>
      <Icon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 300 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
};

export default EmptyState;
