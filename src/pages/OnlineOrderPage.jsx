import { useState, useEffect, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid2 as Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Tabs,
  Tab,
  Divider,
  Stack,
  IconButton,
  Badge,
  Drawer,
  Fab,
  Chip,
  InputAdornment,
  Collapse,
  useMediaQuery,
  useTheme,
  MenuItem,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ShoppingCart,
  Add,
  Remove,
  Restaurant,
  StorefrontOutlined,
  CheckCircle,
  LocalOffer,
  NoteAdd,
  Search as SearchIcon,
  TrackChanges,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { getFullMenu } from '@/services/menu.service';
import { createPublicOrder } from '@/services/order.service';
import { subscribeToStoreStatus } from '@/services/settings.service';
import { getCoupons, validateCoupon, calculateDiscount } from '@/services/coupon.service';
import { formatCurrency } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// ── Cart reducer ─────────────────────────────────────────────────────────────

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => i.menuItemId === action.payload.id);
      if (existing) {
        return state.map((i) =>
          i.menuItemId === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...state,
        {
          menuItemId: action.payload.id,
          name: action.payload.name,
          unitPrice: action.payload.price,
          quantity: 1,
          specialInstructions: '',
        },
      ];
    }
    case 'UPDATE_QTY':
      return state
        .map((i) => (i.menuItemId === action.payload.id ? { ...i, quantity: action.payload.qty } : i))
        .filter((i) => i.quantity > 0);
    case 'UPDATE_NOTE':
      return state.map((i) =>
        i.menuItemId === action.payload.id ? { ...i, specialInstructions: action.payload.note } : i
      );
    case 'CLEAR':
      return [];
    default:
      return state;
  }
};

// ── Confirmation screen ───────────────────────────────────────────────────────

const PAYMENT_LABELS = { cash: 'Cash', gcash: 'GCash', maya: 'Maya' };

function ConfirmationScreen({ order, onNewOrder }) {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Box sx={{ maxWidth: 420, width: '100%' }}>
        <Box
          component="img"
          src="/logo.png"
          alt="P-Town"
          sx={{ width: 120, height: 'auto', objectFit: 'contain', mb: 3 }}
        />
        <CheckCircle sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Order Placed!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Thanks, {order.customerName}! Your order has been received.
        </Typography>

        <Card sx={{ mb: 3, textAlign: 'left' }}>
          <CardContent>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Order Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>#{order.orderNumber}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Order Type</Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{order.orderType}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Total</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(order.total)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Payment</Typography>
                <Typography variant="body2">{PAYMENT_LABELS[order.paymentMethod] || 'Cash'} on {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            startIcon={<TrackChanges />}
            onClick={() => navigate(`/order/${order.id}`)}
            sx={{ py: 1.5, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Track My Order
          </Button>
          <Button variant="outlined" size="large" onClick={onNewOrder}>
            Place Another Order
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnlineOrderPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [cart, dispatch] = useReducer(cartReducer, [], () => {
    try {
      const saved = localStorage.getItem('ptown_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [expandedNote, setExpandedNote] = useState(null); // menuItemId with open note field
  const [form, setForm] = useState({ customerName: '', customerPhone: '', orderType: 'takeaway', street: '', barangay: '', city: '', landmark: '', notes: '', paymentMethod: 'cash' });
  const [submitting, setSubmitting] = useState(false);
  const [storeStatus, setStoreStatus] = useState({ isOpen: true, closedMessage: '', restaurantId: '' });
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Coupon state
  const [coupons, setCoupons] = useState([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    const unsub = subscribeToStoreStatus(setStoreStatus);
    return () => unsub();
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('ptown_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const load = async () => {
      const [menuData, couponData] = await Promise.all([getFullMenu(), getCoupons()]);
      const available = menuData
        .filter((c) => c.isActive !== false)
        .map((c) => ({
          ...c,
          items: c.items.filter(
            (i) => i.isAvailable && i.isActive !== false && i.availableOnline !== false
          ),
        }))
        .filter((c) => c.items.length > 0);
      setMenu(available);
      setCoupons(couponData);
      setLoading(false);
    };
    load();
  }, []);

  // Computed
  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  // tab 0 = All Items, tab 1..n = category index (tab - 1)
  const allItems = menu.flatMap((c) => c.items);
  const currentCatItems = tab === 0 ? allItems : (menu[tab - 1]?.items || []);

  const filteredItems = search.trim()
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : currentCatItems;

  // Coupon handlers
  const handleApplyCoupon = () => {
    setCouponError('');
    const coupon = validateCoupon(couponInput, coupons);
    if (!coupon) {
      setCouponError('Invalid or inactive coupon code.');
      return;
    }
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      setCouponError(`Minimum order of ${formatCurrency(coupon.minOrderAmount)} required.`);
      return;
    }
    setAppliedCoupon(coupon);
    setCouponInput('');
    toast.success(`Coupon "${coupon.code}" applied!`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleOrder = async () => {
    if (cart.length === 0 || !form.customerName.trim()) return;
    if (!form.customerPhone.trim()) {
      toast.error('Please enter your phone number so we can contact you');
      return;
    }
    if (form.orderType === 'delivery' && !form.street.trim()) {
      toast.error('Please enter your street / house number');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createPublicOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        orderType: form.orderType,
        deliveryAddress: form.orderType === 'delivery'
          ? [form.street, form.barangay, form.city, form.landmark ? `Landmark: ${form.landmark}` : ''].filter(Boolean).join(', ')
          : '',
        restaurantId: storeStatus.restaurantId || null,
        notes: form.notes,
        subtotal,
        tax: 0,
        discount,
        total,
        paymentMethod: form.paymentMethod || 'cash',
        coupon: appliedCoupon ? { code: appliedCoupon.code, type: appliedCoupon.type, value: appliedCoupon.value } : null,
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
          specialInstructions: i.specialInstructions || '',
        })),
      });
      setConfirmedOrder({ ...result, customerName: form.customerName, orderType: form.orderType, total, paymentMethod: form.paymentMethod || 'cash' });
      dispatch({ type: 'CLEAR' });
      setCartOpen(false);
      setAppliedCoupon(null);
    } catch {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  if (confirmedOrder) {
    return <ConfirmationScreen order={confirmedOrder} onNewOrder={() => setConfirmedOrder(null)} />;
  }

  if (!storeStatus.isOpen) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', p: 4 }}>
        <Box>
          <Box component="img" src="/logo.png" alt="P-Town" sx={{ width: 160, height: 'auto', objectFit: 'contain', mb: 3 }} />
          <StorefrontOutlined sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>We're Currently Closed</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
            {storeStatus.closedMessage || 'We are not accepting online orders at the moment. Please check back later!'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Cart panel ──────────────────────────────────────────────────────────────

  const cartPanel = (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Your Order {itemCount > 0 && <Chip label={itemCount} size="small" color="primary" sx={{ ml: 1 }} />}
      </Typography>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {cart.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <ShoppingCart sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" variant="body2">Your cart is empty</Typography>
            <Typography color="text.secondary" variant="caption">Add items from the menu</Typography>
          </Box>
        ) : (
          cart.map((item) => (
            <Box key={item.menuItemId} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatCurrency(item.unitPrice)} each</Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setExpandedNote(expandedNote === item.menuItemId ? null : item.menuItemId)}
                  color={item.specialInstructions ? 'primary' : 'default'}
                >
                  <NoteAdd fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => dispatch({ type: 'UPDATE_QTY', payload: { id: item.menuItemId, qty: item.quantity - 1 } })}>
                  <Remove fontSize="small" />
                </IconButton>
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.quantity}</Typography>
                <IconButton size="small" onClick={() => dispatch({ type: 'UPDATE_QTY', payload: { id: item.menuItemId, qty: item.quantity + 1 } })}>
                  <Add fontSize="small" />
                </IconButton>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 52, textAlign: 'right' }}>
                  {formatCurrency(item.unitPrice * item.quantity)}
                </Typography>
              </Box>
              <Collapse in={expandedNote === item.menuItemId}>
                <TextField
                  placeholder="Special instructions (e.g. no onions, extra sauce)"
                  value={item.specialInstructions}
                  onChange={(e) => dispatch({ type: 'UPDATE_NOTE', payload: { id: item.menuItemId, note: e.target.value } })}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ mt: 0.5 }}
                  inputProps={{ maxLength: 200 }}
                />
              </Collapse>
            </Box>
          ))
        )}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Coupon */}
      {!appliedCoupon ? (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
              size="small"
              fullWidth
              onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LocalOffer fontSize="small" /></InputAdornment>,
              }}
            />
            <Button variant="outlined" size="small" onClick={handleApplyCoupon} disabled={!couponInput.trim()} sx={{ whiteSpace: 'nowrap' }}>
              Apply
            </Button>
          </Box>
          {couponError && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{couponError}</Typography>}
        </Box>
      ) : (
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip
            icon={<LocalOffer />}
            label={`${appliedCoupon.code} — ${appliedCoupon.type === 'percent' ? `${appliedCoupon.value}% off` : `${formatCurrency(appliedCoupon.value)} off`}`}
            color="success"
            size="small"
            onDelete={handleRemoveCoupon}
          />
          <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>-{formatCurrency(discount)}</Typography>
        </Box>
      )}

      <Stack spacing={1.5}>
        <TextField label="Your Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} size="small" fullWidth />
        <TextField label="Phone Number *" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} size="small" fullWidth inputProps={{ inputMode: 'tel' }} />
        <TextField
          select
          label="Order Type"
          value={form.orderType}
          onChange={(e) => setForm({ ...form, orderType: e.target.value })}
          size="small"
          fullWidth
        >
          <MenuItem value="takeaway">Takeaway</MenuItem>
          <MenuItem value="delivery">Delivery</MenuItem>
        </TextField>
        {form.orderType === 'delivery' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              label="Street / House No. *"
              placeholder="e.g. 123 Rizal St."
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              size="small"
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Barangay"
                placeholder="e.g. Brgy. San Jose"
                value={form.barangay}
                onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="City / Municipality"
                placeholder="e.g. Pasig"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Landmark"
              placeholder="e.g. near Jollibee, beside blue gate"
              value={form.landmark}
              onChange={(e) => setForm({ ...form, landmark: e.target.value })}
              size="small"
              fullWidth
            />
          </Box>
        )}
        <TextField
          label="Order Notes"
          placeholder="Any notes for the kitchen?"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          size="small"
          fullWidth
          multiline
          rows={2}
        />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Payment Method</Typography>
          <ToggleButtonGroup
            value={form.paymentMethod}
            exclusive
            onChange={(_, v) => { if (v) setForm({ ...form, paymentMethod: v }); }}
            size="small"
            fullWidth
          >
            <ToggleButton value="cash">Cash</ToggleButton>
            <ToggleButton value="gcash">GCash</ToggleButton>
            <ToggleButton value="maya">Maya</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        {/* Totals */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Subtotal</Typography>
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

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={cart.length === 0 || !form.customerName.trim() || submitting}
          onClick={handleOrder}
          sx={{ py: 1.5, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : 'Place Order'}
        </Button>
      </Stack>
    </Box>
  );

  // ── Menu grid ───────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Box component="img" src="/logo.png" alt="P-Town" sx={{ width: 100, height: 'auto', objectFit: 'contain' }} />
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>Online Ordering</Typography>
          </Box>
          <TextField
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ maxWidth: 260, width: '100%' }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          {isMobile && (
            <IconButton onClick={() => setCartOpen(true)} sx={{ flexShrink: 0 }}>
              <Badge badgeContent={itemCount} color="secondary"><ShoppingCart /></Badge>
            </IconButton>
          )}
        </Box>

        {/* Category tabs (hidden during search) */}
        {!search.trim() && (
          <Tabs
            value={Math.min(tab, menu.length)}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 1, minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
          >
            <Tab label={`All Items (${allItems.length})`} />
            {menu.map((cat) => <Tab key={cat.id} label={cat.name} />)}
          </Tabs>
        )}
        {search.trim() && (
          <Box sx={{ px: 2, pt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for &quot;{search}&quot;
            </Typography>
          </Box>
        )}

        {/* Menu items */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {filteredItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Restaurant sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No items found</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                return (
                  <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3 }}>
                    <Card
                      sx={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 }, outline: inCart ? '2px solid' : 'none', outlineColor: 'primary.main' }}
                      onClick={() => {
                        dispatch({ type: 'ADD', payload: item });
                        if (isMobile) toast.success(`${item.name} added`, { duration: 800 });
                      }}
                    >
                      {item.imageUrl ? (
                        <CardMedia component="img" height="120" image={item.imageUrl} alt={item.name} sx={{ objectFit: 'cover' }} />
                      ) : (
                        <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                          <Restaurant sx={{ fontSize: 32, color: 'text.disabled' }} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}>
                            {item.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>{formatCurrency(item.price)}</Typography>
                          {inCart && (
                            <Chip label={`×${inCart.quantity}`} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Box>

      {/* Cart sidebar (desktop) */}
      {!isMobile && (
        <Box sx={{ width: 380, borderLeft: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
          {cartPanel}
        </Box>
      )}

      {/* Cart drawer (mobile) */}
      {isMobile && (
        <>
          <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)} PaperProps={{ sx: { width: '90vw', maxWidth: 400 } }}>
            {cartPanel}
          </Drawer>
          {itemCount > 0 && !cartOpen && (
            <Fab color="secondary" onClick={() => setCartOpen(true)} sx={{ position: 'fixed', bottom: 24, right: 24 }}>
              <Badge badgeContent={itemCount} color="error"><ShoppingCart /></Badge>
            </Fab>
          )}
        </>
      )}
    </Box>
  );
}
