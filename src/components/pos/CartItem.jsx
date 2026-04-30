import { Box, Typography, IconButton, TextField } from '@mui/material';
import { Add, Remove, Delete } from '@mui/icons-material';
import { formatCurrency } from '@/utils/formatters';

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, px: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCurrency(item.unitPrice)} each
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
          sx={{ width: 28, height: 28 }}
        >
          <Remove fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
          {item.quantity}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
          sx={{ width: 28, height: 28 }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
        {formatCurrency(item.unitPrice * item.quantity)}
      </Typography>

      <IconButton size="small" onClick={() => onRemove(item.menuItemId)} sx={{ width: 28, height: 28 }}>
        <Delete fontSize="small" color="error" />
      </IconButton>
    </Box>
  );
};

export default CartItem;
