import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard,
  ShoppingCart,
  Restaurant,
  PointOfSale,
  LocalShipping,
  People,
  Build,
  BarChart,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from '@/config/constants';
import useAuth from '@/hooks/useAuth';

const Sidebar = ({ mobileOpen, onMobileClose, collapsed, onCollapseToggle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    canProcessOrders,
    canViewMenu,
    canViewDeliveries,
    canManageExpenses,
    canManageUsers,
    canManageOperations,
    canAccessReports,
  } = useAuth();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard', show: true },
    { label: 'POS', icon: <PointOfSale />, path: '/pos', show: canProcessOrders() },
    { label: 'Orders', icon: <ShoppingCart />, path: '/orders', show: canProcessOrders() },
    { label: 'Menu', icon: <Restaurant />, path: '/menu', show: canViewMenu() },
    { label: 'Deliveries', icon: <LocalShipping />, path: '/deliveries', show: canViewDeliveries() },
    { label: 'Employees', icon: <People />, path: '/employees', show: canManageUsers() },
    { label: 'Users', icon: <People />, path: '/users', show: canManageUsers() },
    { label: 'Operations', icon: <Build />, path: '/operations', show: canManageOperations() },
    { label: 'Reports', icon: <BarChart />, path: '/reports', show: canAccessReports() },
  ];

  const currentWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) onMobileClose();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo / Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: collapsed ? 1.5 : 2.5,
          py: 2,
          minHeight: 64,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt="P-Town"
          sx={{
            width: collapsed ? 36 : 140,
            height: 'auto',
            objectFit: 'contain',
            flexShrink: 0,
            transition: 'width 0.2s',
          }}
        />
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1, px: collapsed ? 0.5 : 1, py: 1 }}>
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const isActive = location.pathname === item.path;
            const button = (
              <ListItemButton
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1 : 2,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40 }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} />}
              </ListItemButton>
            );

            return collapsed ? (
              <Tooltip key={item.path} title={item.label} placement="right" arrow>
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
      </List>

      <Divider />

      {/* Collapse toggle (not shown on mobile) */}
      {!isMobile && (
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <IconButton onClick={onCollapseToggle} size="small">
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Box>
      )}

      {/* User info */}
      {!collapsed && (
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ textTransform: 'capitalize' }}>
            {user?.role}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Mobile drawer (temporary overlay) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRadius: '0 12px 12px 0',
            backdropFilter: 'blur(6px)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop/tablet drawer (permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: currentWidth,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
