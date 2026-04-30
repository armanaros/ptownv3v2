import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  Typography,
  Drawer,
  useMediaQuery,
  useTheme,
  Badge,
  Fab,
  Chip,
} from '@mui/material';
import { ArrowBack, ShoppingCart, Logout, Receipt, PointOfSale } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { CartProvider, useCart } from '@/contexts/CartContext';
import MenuBrowser from '@/components/pos/MenuBrowser';
import CartPanel from '@/components/pos/CartPanel';
import CashChangeDialog from '@/components/pos/CashChangeDialog';
import DigitalPaymentDialog from '@/components/pos/DigitalPaymentDialog';
import PrintReceiptDialog from '@/components/orders/PrintReceiptDialog';
import RecentOrdersPanel from '@/components/pos/RecentOrdersPanel';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useMenu from '@/hooks/useMenu';
import useAuth from '@/hooks/useAuth';
import useOrders from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import { createOrder } from '@/services/order.service';
import { logActivity } from '@/services/activity.service';
import { formatCurrency } from '@/utils/formatters';
import { playNotificationSound } from '@/utils/notificationSound';

const POSContent = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isEmployee, logout } = useAuth();
  const { restaurantId } = useRestaurant();
  const { availableMenu, loading } = useMenu();
  const cart = useCart();
  const { todaysOrders, orders } = useOrders(1);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentOrdersOpen, setRecentOrdersOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [digitalDialogOpen, setDigitalDialogOpen] = useState(false);
  const [digitalPayMethod, setDigitalPayMethod] = useState('');
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastOrder, setLastOrder] = useState(null);
  const [printReceiptOpen, setPrintReceiptOpen] = useState(false);

  // Ref for checkout to avoid stale closures in keyboard handler
  const checkoutRef = useRef(null);

  // Toast notification for new online orders
  const prevOrderCountRef = useRef(null);
  useEffect(() => {
    if (prevOrderCountRef.current === null) {
      prevOrderCountRef.current = orders.length;
      return;
    }
    if (orders.length > prevOrderCountRef.current) {
      const newest = orders[0];
      if (newest && newest.employeeId === 'public') {
        toast('New online order received!', { icon: '🔔', duration: 4000 });
      }
    }
    prevOrderCountRef.current = orders.length;
  }, [orders]);

  // Keyboard shortcuts: Enter to place order, Escape to close dialogs/drawers
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      if (e.key === 'Escape') {
        if (cashDialogOpen) setCashDialogOpen(false);
        else if (recentOrdersOpen) setRecentOrdersOpen(false);
        else if (cartDrawerOpen) setCartDrawerOpen(false);
      }

      if (e.key === 'Enter' && !isInput && !e.shiftKey) {
        e.preventDefault();
        checkoutRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cashDialogOpen, recentOrdersOpen, cartDrawerOpen]);

  // Daily sales summary
  const todayRevenue = todaysOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const todayCount = todaysOrders.filter((o) => o.status !== 'cancelled').length;

  const handleAddItem = (item) => {
    cart.addItem(item);
    if (isMobile) {
      toast.success(`${item.name} added`, { duration: 1000 });
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0 || submitting) return;
    setSubmitting(true);
    const orderTotal = cart.total;
    const payMethod = cart.paymentMethod;

    // Capture order data before clearing cart
    const orderPayload = {
      employeeId: user?.uid || '',
      customerName: cart.customerName,
      customerPhone: cart.customerPhone,
      orderType: cart.orderType,
      tableNumber: cart.tableNumber,
      deliveryAddress: cart.deliveryAddress,
      notes: cart.notes,
      paymentMethod: cart.paymentMethod,
      subtotal: cart.subtotal,
      tax: 0,
      discount: cart.discount,
      total: cart.total,
      paymentStatus: 'pending',
      coupon: cart.coupon
        ? { code: cart.coupon.code, type: cart.coupon.type, value: cart.coupon.value }
        : null,
    };
    const orderItems = [...cart.items];

    // Clear cart and show appropriate payment dialog immediately
    cart.clearCart();
    if (isMobile) setCartDrawerOpen(false);
    if (payMethod === 'cash') {
      setLastOrderTotal(orderTotal);
      setCashDialogOpen(true);
    } else {
      setLastOrderTotal(orderTotal);
      setDigitalPayMethod(payMethod);
      setDigitalDialogOpen(true);
    }

    try {
      const result = await createOrder(restaurantId || '', orderPayload, orderItems);

      // Build receipt-ready order object from local data + returned id/orderNumber
      setLastOrder({
        ...orderPayload,
        id: result.id,
        orderNumber: result.orderNumber,
        items: orderItems.map((it) => ({
          ...it,
          totalPrice: it.unitPrice * it.quantity,
        })),
        createdAt: { toDate: () => new Date() },
      });

      logActivity({
        type: 'ORDER',
        action: 'CREATE',
        userId: user?.uid,
        details: `Order ${result.orderNumber} created (${orderPayload.orderType})`,
      });

      toast.success(`Order ${result.orderNumber} placed!`);
    } catch (err) {
      toast.error('Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  // Keep checkout ref current for keyboard handler
  checkoutRef.current = handleCheckout;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Menu area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          {isEmployee() ? (
            <IconButton onClick={async () => { await logout(); navigate('/login'); }} size="small" title="Logout">
              <Logout />
            </IconButton>
          ) : (
            <IconButton onClick={() => navigate('/dashboard')} size="small">
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            POS
          </Typography>

          {/* Daily sales summary */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Chip
              icon={<PointOfSale sx={{ fontSize: 16 }} />}
              label={`${todayCount} orders`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label={formatCurrency(todayRevenue)}
              size="small"
              color="success"
              sx={{ fontSize: '0.75rem', fontWeight: 600 }}
            />
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Recent orders button */}
          <IconButton onClick={() => setRecentOrdersOpen(true)} size="small" title="Recent Orders">
            <Receipt />
          </IconButton>

          {isMobile && (
            <IconButton onClick={() => setCartDrawerOpen(true)}>
              <Badge badgeContent={cart.itemCount} color="secondary">
                <ShoppingCart />
              </Badge>
            </IconButton>
          )}
        </Box>

        {/* Menu browser */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MenuBrowser menu={availableMenu} onAddItem={handleAddItem} />
        </Box>
      </Box>

      {/* Cart - desktop/tablet sidebar */}
      {!isMobile && (
        <Box sx={{ width: { md: 320, lg: 380 }, flexShrink: 0 }}>
          <CartPanel onCheckout={handleCheckout} submitting={submitting} />
        </Box>
      )}

      {/* Cart - mobile drawer */}
      {isMobile && (
        <>
          <Drawer
            anchor="right"
            open={cartDrawerOpen}
            onClose={() => setCartDrawerOpen(false)}
            PaperProps={{ sx: { width: '85vw', maxWidth: 380 } }}
          >
            <CartPanel onCheckout={handleCheckout} submitting={submitting} />
          </Drawer>

          {cart.itemCount > 0 && !cartDrawerOpen && (
            <Fab
              color="secondary"
              onClick={() => setCartDrawerOpen(true)}
              sx={{ position: 'fixed', bottom: 24, right: 24 }}
            >
              <Badge badgeContent={cart.itemCount} color="error">
                <ShoppingCart />
              </Badge>
            </Fab>
          )}
        </>
      )}

      {/* Recent orders drawer */}
      <Drawer
        anchor="left"
        open={recentOrdersOpen}
        onClose={() => setRecentOrdersOpen(false)}
      >
        <RecentOrdersPanel
          orders={todaysOrders.slice(0, 20)}
          onClose={() => setRecentOrdersOpen(false)}
        />
      </Drawer>

      {/* Cash change calculator dialog */}
      <CashChangeDialog
        open={cashDialogOpen}
        onClose={() => setCashDialogOpen(false)}
        orderTotal={lastOrderTotal}
        onPrintReceipt={() => setPrintReceiptOpen(true)}
      />

      {/* Digital payment dialog */}
      <DigitalPaymentDialog
        open={digitalDialogOpen}
        onClose={() => setDigitalDialogOpen(false)}
        orderTotal={lastOrderTotal}
        paymentMethod={digitalPayMethod}
        onPrintReceipt={() => setPrintReceiptOpen(true)}
      />

      {/* Print receipt dialog */}
      <PrintReceiptDialog
        open={printReceiptOpen}
        onClose={() => setPrintReceiptOpen(false)}
        order={lastOrder}
      />
    </Box>
  );
};

export default function POSPage() {
  return (
    <CartProvider>
      <POSContent />
    </CartProvider>
  );
}
