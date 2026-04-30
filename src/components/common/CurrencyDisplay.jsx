import { Typography } from '@mui/material';
import { formatCurrency } from '@/utils/formatters';

const CurrencyDisplay = ({ amount, variant = 'body1', color = 'primary.main', bold = false, ...props }) => {
  return (
    <Typography
      variant={variant}
      sx={{ color, fontWeight: bold ? 'bold' : 'normal' }}
      {...props}
    >
      {formatCurrency(amount)}
    </Typography>
  );
};

export default CurrencyDisplay;
