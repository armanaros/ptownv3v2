import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  TextField,
  MenuItem,
  Stack,
  Paper,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ShoppingCart, Delete, LocalOffer, Payments, AccountBalance, PhoneAndroid } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CartItem from './CartItem';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { ORDER_TYPES } from '@/config/constants';
import { getCoupons, validateCoupon, calculateDiscount } from '@/services/coupon.service';

const CartPanel = ({ onCheckout, submitting }) => {
  const {
    items,
    subtotal,
    total,
    discount,
    coupon,
    orderType,
    tableNumber,
    customerName,
    customerPhone,
    deliveryAddress,
    notes,
    paymentMethod,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    clearCoupon,
    setOrderDetails,
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const coupons = await getCoupons();
      const found = validateCoupon(couponCode, coupons);
      if (found) {
        const disc = calculateDiscount(found, subtotal);
        applyCoupon(found, disc);
        toast.success(`Coupon applied: ${found.code}`);
        setCouponCode('');
      } else {
        toast.error('Invalid or inactive coupon');
      }
    } catch {
      toast.error('Failed to validate coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  return (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 0,
        borderLeft: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Cart ({itemCount})
          </Typography>
        </Box>
        {items.length > 0 && (
          <IconButton size="small" onClick={clearCart} color="error">
            <Delete fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider />

      {/* Cart items */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {items.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
            <Typography color="text.secondary" variant="body2">
              Tap menu items to add
            </Typography>
          </Box>
        ) : (
          items.map((item) => (
            <CartItem
              key={item.menuItemId}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))
        )}
      </Box>

      <Divider />

      {/* Order details + totals */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack spacing={1.5}>
          {/* Order type */}
          <TextField
            select
            label="Order Type"
            value={orderType}
            onChange={(e) => setOrderDetails({ orderType: e.target.value })}
            size="small"
            fullWidth
          >
            <MenuItem value={ORDER_TYPES.DINE_IN}>Dine In</MenuItem>
            <MenuItem value={ORDER_TYPES.TAKEAWAY}>Takeaway</MenuItem>
            <MenuItem value={ORDER_TYPES.DELIVERY}>Delivery</MenuItem>
          </TextField>

          {orderType === 'dine-in' && (
            <TextField
              label="Table #"
              value={tableNumber}
              onChange={(e) => setOrderDetails({ tableNumber: e.target.value })}
              size="small"
              fullWidth
            />
          )}

          {orderType === 'delivery' && (
            <>
              <TextField
                label="Customer Name"
                value={customerName}
                onChange={(e) => setOrderDetails({ customerName: e.target.value })}
                size="small"
                fullWidth
              />
              <TextField
                label="Phone"
                value={customerPhone}
                onChange={(e) => setOrderDetails({ customerPhone: e.target.value })}
                size="small"
                fullWidth
              />
              <TextField
                label="Delivery Address"
                value={deliveryAddress}
                onChange={(e) => setOrderDetails({ deliveryAddress: e.target.value })}
                size="small"
                fullWidth
                multiline
                rows={2}
              />
            </>
          )}

          {/* Payment method — prominent tile buttons */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 0.75 }}>
              Payment Method
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }}>
              {[
                { value: 'cash', label: 'Cash', icon: <Payments sx={{ fontSize: 20 }} />, color: '#10b981' },
                { value: 'gcash', label: 'GCash', icon: <PhoneAndroid sx={{ fontSize: 20 }} />, color: '#1d4ed8' },
                { value: 'paymaya', label: 'Maya', icon: <PhoneAndroid sx={{ fontSize: 20 }} />, color: '#16a34a' },
                { value: 'bank_transfer', label: 'Bank', icon: <AccountBalance sx={{ fontSize: 20 }} />, color: '#7c3aed' },
              ].map((opt) => {
                const selected = paymentMethod === opt.value;
                return (
                  <Tooltip key={opt.value} title={opt.label} placement="top">
                    <Button
                      onClick={() => setOrderDetails({ paymentMethod: opt.value })}
                      variant={selected ? 'contained' : 'outlined'}
                      sx={{
                        flexDirection: 'column',
                        py: 1,
                        px: 0.5,
                        gap: 0.25,
                        minWidth: 0,
                        borderWidth: selected ? 2 : 1.5,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        ...(selected
                          ? { bgcolor: opt.color, borderColor: opt.color, color: '#fff', '&:hover': { bgcolor: opt.color, filter: 'brightness(0.9)' } }
                          : { borderColor: opt.color + '70', color: opt.color, '&:hover': { borderColor: opt.color, bgcolor: opt.color + '10' } }),
                      }}
                    >
                      {opt.icon}
                      {opt.label}
                    </Button>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setOrderDetails({ notes: e.target.value })}
            size="small"
            fullWidth
            multiline
            rows={1}
          />

          {/* Coupon */}
          {!coupon ? (
            <TextField
              label="Coupon Code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim() || applyingCoupon}
                    >
                      Apply
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'success.main', color: '#fff', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocalOffer fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{coupon.code}</Typography>
              </Box>
              <Button size="small" onClick={clearCoupon} sx={{ color: '#fff', minWidth: 0 }}>
                Remove
              </Button>
            </Box>
          )}

          <Divider />

          {/* Totals */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
          </Box>
          {discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="success.main">Discount</Typography>
              <Typography variant="body2" color="success.main">-{formatCurrency(discount)}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(total)}</Typography>
          </Box>

          {/* Checkout button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={items.length === 0 || submitting}
            onClick={onCheckout}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default CartPanel;
