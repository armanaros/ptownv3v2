import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid2 as Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import { LocalShipping, Person } from '@mui/icons-material';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import StatusChip from '@/components/common/StatusChip';
import useOrders from '@/hooks/useOrders';
import { updateOrderStatus, updateOrder } from '@/services/order.service';
import { formatCurrency } from '@/utils/formatters';

export default function DeliveriesPage() {
  const { orders, loading } = useOrders();

  const deliveryOrders = useMemo(() =>
    orders.filter((o) => o.orderType === 'delivery'),
    [orders]
  );

  const activeDeliveries = deliveryOrders.filter((o) =>
    ['pending', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
  );

  const completedDeliveries = deliveryOrders.filter((o) =>
    ['delivered', 'completed'].includes(o.status)
  );

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Updated to ${status.replace(/_/g, ' ')}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return <AppLayout><LoadingSpinner /></AppLayout>;
  }

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Deliveries</Typography>

        {/* Active deliveries */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Active ({activeDeliveries.length})
        </Typography>

        {activeDeliveries.length === 0 ? (
          <EmptyState title="No active deliveries" message="Delivery orders will appear here." />
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {activeDeliveries.map((order) => (
              <Grid key={order.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        #{order.orderNumber}
                      </Typography>
                      <StatusChip status={order.status} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {order.customerName || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {order.deliveryAddress || 'No address'}
                    </Typography>
                    {order.customerPhone && (
                      <Typography variant="body2" color="text.secondary">
                        Phone: {order.customerPhone}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {formatCurrency(order.total)}
                      </Typography>
                      {order.status === 'ready' && (
                        <Button size="small" variant="contained" onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')}>
                          Out for Delivery
                        </Button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <Button size="small" variant="contained" color="success" onClick={() => handleStatusUpdate(order.id, 'delivered')}>
                          Delivered
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Completed */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Completed ({completedDeliveries.length})
        </Typography>
        {completedDeliveries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No completed deliveries.</Typography>
        ) : (
          <Grid container spacing={2}>
            {completedDeliveries.slice(0, 12).map((order) => (
              <Grid key={order.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ opacity: 0.7 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        #{order.orderNumber}
                      </Typography>
                      <StatusChip status={order.status} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {order.customerName} - {formatCurrency(order.total)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </AppLayout>
  );
}
