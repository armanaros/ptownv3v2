import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { AccessTime, Close, Print, Language } from '@mui/icons-material';
import StatusChip from '@/components/common/StatusChip';
import { formatCurrency } from '@/utils/formatters';
import PrintReceiptDialog from './PrintReceiptDialog';

const OrderCard = ({ order, onViewDetails, onStatusChange, focused }) => {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const createdAt = order.createdAt?.toDate?.();
  const timeStr = createdAt
    ? createdAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    : '';

  const nextStatus = {
    pending: 'preparing',
    preparing: 'ready',
    ready: order.orderType === 'delivery' ? 'out_for_delivery' : 'served',
    out_for_delivery: 'delivered',
  };

  const nextLabel = {
    pending: 'Start Preparing',
    preparing: 'Mark Ready',
    ready: order.orderType === 'delivery' ? 'Out for Delivery' : 'Mark Served',
    out_for_delivery: 'Mark Delivered',
  };

  return (
    <>
    <Card
      sx={{
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        transition: 'box-shadow 0.2s, outline 0.15s',
        outline: focused ? '2px solid' : 'none',
        outlineColor: 'primary.main',
      }}
      onClick={() => onViewDetails(order)}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                #{order.orderNumber}
              </Typography>
              {order.employeeId === 'public' && (
                <Chip
                  icon={<Language sx={{ fontSize: '12px !important' }} />}
                  label="Online"
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 }, '& .MuiChip-icon': { ml: 0.5 } }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <AccessTime sx={{ fontSize: 14 }} color="action" />
              <Typography variant="caption" color="text.secondary">
                {timeStr}
              </Typography>
            </Box>
          </Box>
          <StatusChip status={order.status} />
        </Box>

        {/* Order type + table */}
        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
          <Chip
            label={order.orderType}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize', height: 22, fontSize: '0.7rem' }}
          />
          {order.tableNumber && (
            <Chip
              label={`Table ${order.tableNumber}`}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}
          <Chip
            label={order.paymentMethod}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize', height: 22, fontSize: '0.7rem' }}
          />
        </Stack>

        {/* Items summary */}
        <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: order.notes ? 0.5 : 1 }}>
          {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
        </Typography>

        {/* Notes preview */}
        {order.notes && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              fontStyle: 'italic',
              mb: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            📋 {order.notes}
          </Typography>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {formatCurrency(order.total)}
          </Typography>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Print receipt" arrow>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setPrintOpen(true); }}
                sx={{ p: 0.5, color: 'text.secondary' }}
              >
                <Print fontSize="small" />
              </IconButton>
            </Tooltip>
            {['pending', 'preparing', 'ready'].includes(order.status) && (
              confirmCancel ? (
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmCancel(false);
                    onStatusChange(order.id, 'cancelled');
                  }}
                  onBlur={() => setConfirmCancel(false)}
                  sx={{ fontSize: '0.7rem', py: 0.5, px: 1 }}
                >
                  Confirm
                </Button>
              ) : (
                <Tooltip title="Cancel order" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmCancel(true);
                    }}
                    sx={{ color: 'error.main', p: 0.5 }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Tooltip>
              )
            )}
            {nextStatus[order.status] && (
              <Button
                size="small"
                variant="contained"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(order.id, nextStatus[order.status]);
                }}
                sx={{ fontSize: '0.7rem', py: 0.5, px: 1.5 }}
              >
                {nextLabel[order.status]}
              </Button>
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>

    <PrintReceiptDialog
      open={printOpen}
      onClose={() => setPrintOpen(false)}
      order={order}
    />
    </>
  );
};

export default OrderCard;
