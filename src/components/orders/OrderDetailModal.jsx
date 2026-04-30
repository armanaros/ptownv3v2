import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  MenuItem,
  TextField,
  IconButton,
} from '@mui/material';
import { Delete as DeleteIcon, Print as PrintIcon, Replay, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import StatusChip from '@/components/common/StatusChip';
import { formatCurrency } from '@/utils/formatters';
import { ORDER_STATUSES } from '@/config/constants';
import PrintReceiptDialog from './PrintReceiptDialog';

const OrderDetailModal = ({ open, onClose, order, allOrders, onStatusChange, onPaymentStatusChange, onRemoveItem }) => {
  const [printOpen, setPrintOpen] = useState(false);
  if (!order) return null;

  const canModifyItems = ['pending', 'preparing'].includes(order.status);
  const isCancelled = order.status === 'cancelled';
  const isRefunded = order.paymentStatus === 'refunded';

  // Customer order history
  const customerOrders = order.customerName && allOrders
    ? allOrders.filter(
        (o) =>
          o.id !== order.id &&
          o.customerName &&
          o.customerName.toLowerCase() === order.customerName.toLowerCase()
      ).sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0))
    : [];

  const createdAt = order.createdAt?.toDate?.();
  const dateStr = createdAt
    ? createdAt.toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'N/A';

  const allStatuses = Object.values(ORDER_STATUSES);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Order #{order.orderNumber}
        </Typography>
        <StatusChip status={order.status} />
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Order info */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip label={order.orderType} size="small" sx={{ textTransform: 'capitalize' }} />
            {order.tableNumber && <Chip label={`Table ${order.tableNumber}`} size="small" />}
            <Chip label={order.paymentMethod} size="small" sx={{ textTransform: 'capitalize' }} />
            {isCancelled && (
              <Chip
                label={isRefunded ? 'Refunded' : 'Not Refunded'}
                size="small"
                color={isRefunded ? 'success' : 'error'}
                sx={{ textTransform: 'capitalize' }}
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">{dateStr}</Typography>

          {order.customerName && (
            <Typography variant="body2">
              Customer: {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
            </Typography>
          )}

          {order.deliveryAddress && (
            <Typography variant="body2">Address: {order.deliveryAddress}</Typography>
          )}

          {order.notes && (
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              Notes: {order.notes}
            </Typography>
          )}

          <Divider />

          {/* Items table */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Total</TableCell>
                {canModifyItems && <TableCell align="center" sx={{ width: 50 }}>Action</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items?.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Typography variant="body2">{item.name}</Typography>
                    {item.specialInstructions && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {item.specialInstructions}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.totalPrice || item.unitPrice * item.quantity)}</TableCell>
                  {canModifyItems && (
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRemoveItem?.(order.id, i)}
                        title="Remove this item"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider />

          {/* Totals */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">{formatCurrency(order.subtotal)}</Typography>
            </Box>
            {order.discount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="success.main">
                  Discount {order.coupon?.code ? `(${order.coupon.code})` : ''}
                </Typography>
                <Typography variant="body2" color="success.main">
                  -{formatCurrency(order.discount)}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(order.total)}</Typography>
            </Box>
          </Box>

          <Divider />

          {/* Customer order history */}
          {customerOrders.length > 0 && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {customerOrders.length} other order{customerOrders.length > 1 ? 's' : ''} from {order.customerName}
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {customerOrders.slice(0, 4).map((o) => {
                  const d = o.createdAt?.toDate?.();
                  const dateStr = d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '';
                  return (
                    <Box key={o.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        #{o.orderNumber} {dateStr && `· ${dateStr}`}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatCurrency(o.total)}</Typography>
                        <StatusChip status={o.status} />
                      </Box>
                    </Box>
                  );
                })}
                {customerOrders.length > 4 && (
                  <Typography variant="caption" color="text.secondary">
                    +{customerOrders.length - 4} more orders
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          {/* Status change */}
          <TextField
            select
            label="Update Status"
            value={order.status}            onChange={(e) => onStatusChange(order.id, e.target.value)}
            size="small"
            fullWidth
          >
            {allStatuses.map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                {s.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>

          {/* Refund control — only for cancelled orders */}
          {isCancelled && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: isRefunded ? 'success.light' : 'error.light',
                bgcolor: isRefunded ? 'success.50' : 'error.50',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isRefunded
                  ? <CheckCircleIcon color="success" fontSize="small" />
                  : <Replay color="error" fontSize="small" />}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {isRefunded ? 'Refund issued' : 'Refund not yet issued'}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color={isRefunded ? 'inherit' : 'error'}
                onClick={() => onPaymentStatusChange(order.id, isRefunded ? 'pending' : 'refunded')}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                {isRefunded ? 'Undo' : 'Mark as Refunded'}
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => setPrintOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Print Receipt
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <PrintReceiptDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        order={order}
      />
    </Dialog>
  );
};

export default OrderDetailModal;
