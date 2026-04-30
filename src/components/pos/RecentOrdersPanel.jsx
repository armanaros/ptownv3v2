import {
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { formatCurrency, formatTime, formatOrderNumber } from '@/utils/formatters';
import { STATUS_COLORS } from '@/config/constants';

const RecentOrdersPanel = ({ orders, onClose }) => {
  return (
    <Box sx={{ width: 320, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Recent Orders
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <Close />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {orders.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
            <Typography color="text.secondary" variant="body2">No orders today</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {orders.map((order) => (
              <ListItemButton
                key={order.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1.5,
                  px: 2,
                  flexDirection: 'column',
                  alignItems: 'stretch',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatOrderNumber(order.orderNumber)}
                  </Typography>
                  <Chip
                    label={order.status}
                    size="small"
                    color={STATUS_COLORS[order.status] || 'default'}
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {order.orderType} {order.customerName ? `• ${order.customerName}` : ''}
                    {' • '}{formatTime(order.createdAt)}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(order.total)}
                  </Typography>
                </Box>
                {order.items && order.items.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </Typography>
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default RecentOrdersPanel;
