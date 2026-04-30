import { useState, useMemo, useEffect } from 'react';
import {
  Box, Grid2 as Grid, Typography, TextField, InputAdornment, MenuItem,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import OrderCard from '@/components/orders/OrderCard';
import OrderFilters from '@/components/orders/OrderFilters';
import OrderDetailModal from '@/components/orders/OrderDetailModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import useOrders from '@/hooks/useOrders';
import { updateOrderStatus, updatePaymentStatus, removeOrderItem } from '@/services/order.service';
import { formatCurrency } from '@/utils/formatters';

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [dateTo, setDateTo] = useState(() => { const d = new Date(); d.setHours(23,59,59,999); return d; });
  const [removeTarget, setRemoveTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  console.log('[OrdersPage] orders from hook:', orders.length, 'loading:', loading);

  // Filter orders by date range
  const dateFilteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const ref = o.createdAt?.toDate?.();
      if (!ref) return true;
      return ref >= dateFrom && ref <= dateTo;
    });
  }, [orders, dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    let result = statusFilter === 'all' ? dateFilteredOrders : dateFilteredOrders.filter((o) => o.status === statusFilter);

    // Search by order number or customer name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (o) =>
          String(o.orderNumber).toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...result];
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));
    } else if (sortBy === 'highest') {
      sorted.sort((a, b) => (b.total || 0) - (a.total || 0));
    } else {
      sorted.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
    }
    return sorted;
  }, [dateFilteredOrders, statusFilter, searchQuery, sortBy]);

  const orderCounts = useMemo(() => {
    const counts = { all: dateFilteredOrders.length };
    dateFilteredOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [dateFilteredOrders]);

  const dayRevenue = useMemo(() => {
    return dateFilteredOrders
      .filter((o) => ['served', 'completed', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [dateFilteredOrders]);

  // Reset keyboard focus when filters/search change
  useEffect(() => { setFocusedIndex(-1); }, [statusFilter, searchQuery, sortBy, dateFrom, dateTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedOrder) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, filteredOrders.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredOrders.length) {
        e.preventDefault();
        setSelectedOrder(filteredOrders[focusedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrder, filteredOrders, focusedIndex]);


  const handleStatusChange = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order updated to ${status.replace(/_/g, ' ')}`);
      // Update selected order if it's the one being changed
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      toast.error('Failed to update order');
    }
  };

  const handlePaymentChange = async (orderId, paymentStatus) => {
    try {
      await updatePaymentStatus(orderId, paymentStatus);
      toast.success(`Payment marked as ${paymentStatus}`);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, paymentStatus } : null);
      }
    } catch (err) {
      toast.error('Failed to update payment status');
    }
  };

  const handleRemoveItem = async (orderId, itemIndex) => {
    try {
      await removeOrderItem(orderId, itemIndex);
      toast.success('Item removed from order');
      // Update selectedOrder if it's the one being modified
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => {
          if (!prev) return null;
          return { ...prev, items: prev.items.filter((_, i) => i !== itemIndex) };
        });
      }
      setRemoveTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to remove item');
      setRemoveTarget(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
        {/* Summary bar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            px: { xs: 2, md: 3 },
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">Orders</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{dateFilteredOrders.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Active</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }} color="warning.main">
              {orderCounts.pending || 0}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Revenue</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }} color="success.main">
              {formatCurrency(dayRevenue)}
            </Typography>
          </Box>
        </Box>

        {/* Search + Sort */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            px: { xs: 2, md: 3 },
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <TextField
            size="small"
            placeholder="Search order # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, maxWidth: 300 }}
          />
          <TextField
            select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ width: 155 }}
          >
            <MenuItem value="newest">Newest First</MenuItem>
            <MenuItem value="oldest">Oldest First</MenuItem>
            <MenuItem value="highest">Highest Amount</MenuItem>
          </TextField>
        </Box>

        {/* Filters */}
        <OrderFilters
          selectedStatus={statusFilter}
          onStatusChange={setStatusFilter}
          orderCounts={orderCounts}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        {/* Order grid */}
        <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, md: 3 }, py: 2 }}>
          {filteredOrders.length === 0 ? (
            <EmptyState
              title="No orders"
              message={statusFilter === 'all' ? 'No orders yet.' : `No ${statusFilter} orders.`}
            />
          ) : (
            <Grid container spacing={2}>
              {filteredOrders.map((order, i) => (
                <Grid key={order.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <OrderCard
                    order={order}
                    onViewDetails={setSelectedOrder}
                    onStatusChange={handleStatusChange}
                    focused={i === focusedIndex}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      {/* Detail modal */}
      <OrderDetailModal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        allOrders={orders}
        onStatusChange={handleStatusChange}
        onPaymentStatusChange={handlePaymentChange}
        onRemoveItem={(orderId, itemIndex) => {
          const item = selectedOrder?.items?.[itemIndex];
          setRemoveTarget({ orderId, itemIndex, itemName: item?.name });
        }}
      />

      {/* Remove item confirmation dialog */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Item"
        message={`Remove "${removeTarget?.itemName}" from order? Stock will be restored.`}
        onConfirm={() => handleRemoveItem(removeTarget.orderId, removeTarget.itemIndex)}
        onCancel={() => setRemoveTarget(null)}
        confirmText="Remove"
        confirmColor="error"
      />
    </AppLayout>
  );
}
