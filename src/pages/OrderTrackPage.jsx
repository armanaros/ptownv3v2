import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Stack,
  TextField,
  Button,
  InputAdornment,
  Chip,
  Dialog,
  DialogContent,
  LinearProgress,
} from '@mui/material';
import { Search as SearchIcon, CheckCircle } from '@mui/icons-material';
import { subscribeToOrderById, getOrderByNumber } from '@/services/order.service';
import { formatCurrency } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const paymentLabels = { cash: 'Cash', gcash: 'GCash', maya: 'Maya' };

const statusSteps = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const statusLabels = {
  pending: 'Order Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'On the Way',
  delivered: 'Delivered',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors = {
  pending: 'default',
  preparing: 'warning',
  ready: 'info',
  out_for_delivery: 'primary',
  delivered: 'success',
  served: 'success',
  completed: 'success',
  cancelled: 'error',
};

// ── Lookup screen (no ID in URL) ─────────────────────────────────────────────

function OrderLookup() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const val = input.trim();
    if (!val) return;
    setSearching(true);
    setError('');
    try {
      const order = await getOrderByNumber(val);
      if (!order) {
        setError('No order found with that number.');
      } else {
        navigate(`/order/${order.id}`);
      }
    } catch {
      setError('Failed to look up order. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Box
        component="img"
        src="/logo.png"
        alt="P-Town"
        sx={{ width: 120, height: 'auto', objectFit: 'contain', mb: 4 }}
      />
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Track Your Order</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Enter your order number to check the status
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          placeholder="Order number (e.g. 42)"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          fullWidth
          size="small"
          error={!!error}
          helperText={error}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
        <Button variant="contained" onClick={handleSearch} disabled={!input.trim() || searching} sx={{ whiteSpace: 'nowrap' }}>
          {searching ? 'Searching…' : 'Track'}
        </Button>
      </Box>
    </Container>
  );
}

// ── Order detail ─────────────────────────────────────────────────────────────

export default function OrderTrackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const completedShownRef = React.useRef(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const unsub = subscribeToOrderById(id, (data) => {
      if (!data) setError('Order not found');
      else {
        setOrder(data);
        // Trigger completed dialog once when status becomes done
        if (
          !completedShownRef.current &&
          ['delivered', 'served', 'completed'].includes(data.status)
        ) {
          completedShownRef.current = true;
          setCompletedOpen(true);
          setCountdown(30);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (!completedOpen) return;
    if (countdown <= 0) {
      navigate('/onlineorders');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [completedOpen, countdown, navigate]);

  // No ID → show lookup
  if (!id) return <OrderLookup />;

  if (loading) return <LoadingSpinner fullscreen />;

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{error}</Typography>
      </Container>
    );
  }

  const isDineInOrTakeaway = order.orderType !== 'delivery';
  const steps = isDineInOrTakeaway ? ['pending', 'preparing', 'ready', 'served'] : statusSteps;
  const activeStep = steps.indexOf(order.status);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          component="img"
          src="/logo.png"
          alt="P-Town"
          sx={{ width: 100, height: 'auto', objectFit: 'contain', mb: 2 }}
        />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Order #{order.orderNumber}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Chip
            label={statusLabels[order.status] || order.status}
            color={statusColors[order.status] || 'default'}
            size="small"
          />
        </Box>
        {order.customerName && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            for {order.customerName}
          </Typography>
        )}
      </Box>

      {order.status !== 'cancelled' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step) => (
                <Step key={step} completed={activeStep >= 0 && steps.indexOf(step) <= activeStep}>
                  <StepLabel>{statusLabels[step]}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      )}

      {order.status === 'cancelled' && (
        <Card sx={{ mb: 3, backgroundColor: 'error.main' }}>
          <CardContent>
            <Typography variant="h6" sx={{ textAlign: 'center', color: '#fff', fontWeight: 700 }}>
              Order Cancelled
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Order Details</Typography>

          <Stack spacing={1} sx={{ mb: 2 }}>
            {order.items?.map((item, i) => (
              <Box key={i}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{item.quantity}× {item.name}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency((item.unitPrice || 0) * (item.quantity || 0))}
                  </Typography>
                </Box>
                {item.specialInstructions && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ↳ {item.specialInstructions}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {order.discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="success.main">Discount</Typography>
              <Typography variant="body2" color="success.main">-{formatCurrency(order.discount)}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(order.total)}</Typography>
          </Box>

          {order.paymentMethod && order.paymentMethod !== 'cash' && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Payment</Typography>
              <Chip label={paymentLabels[order.paymentMethod] || order.paymentMethod} size="small" color="primary" variant="outlined" />
            </Box>
          )}

          {order.notes && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Notes: {order.notes}</Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
        This page updates automatically in real time
      </Typography>

      {/* ── Order completed celebration dialog ──────────────────────────── */}
      <Dialog open={completedOpen} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {order?.orderType === 'delivery' ? 'Order Delivered!' : 'Order Ready!'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Enjoy your meal, {order?.customerName || 'friend'}! 🍽️ Thank you for ordering with us.
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate('/onlineorders')}
            sx={{ mb: 2, py: 1.5, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Back to Home
          </Button>
          <Typography variant="caption" color="text.secondary">
            Redirecting in {countdown}s…
          </Typography>
          <LinearProgress
            variant="determinate"
            value={((30 - countdown) / 30) * 100}
            sx={{ mt: 1, borderRadius: 1 }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
}
