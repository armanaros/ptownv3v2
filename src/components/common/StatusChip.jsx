import { Chip } from '@mui/material';
import { STATUS_COLORS } from '@/config/constants';

const StatusChip = ({ status, label, size = 'small', ...props }) => {
  const color = STATUS_COLORS[status] || 'default';
  const displayLabel = label || status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Chip
      label={displayLabel}
      color={color}
      size={size}
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
      {...props}
    />
  );
};

export default StatusChip;
