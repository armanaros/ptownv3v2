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
  MedicalServices,
  Inventory2,
  LocalShipping,
  AccountBalance,
  PersonSearch,
  BarChart,
  People,
  Build,
  Settings,
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
    canAccessPOS,
    canAccessSales,
    canManageProducts,
    canAccessInventory,
    canAccessAR,
    canAccessMedReps,
    canAccessLogistics,
    canAccessReports,
    canManageUsers,
    canManageOperations,
    canManageSettings,
  } = useAuth();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { label: 'Dashboard',             icon: <Dashboard />,       path: '/dashboard',           show: true },
    { label: 'Sales',                 icon: <ShoppingCart />,    path: '/sales',               show: canAccessSales?.() },
    { label: 'Products',              icon: <MedicalServices />, path: '/products',            show: canManageProducts?.() },
    { label: 'Inventory',             icon: <Inventory2 />,      path: '/inventory',           show: canAccessInventory?.() },
    { label: 'Accounts Receivable',   icon: <AccountBalance />,  path: '/accounts-receivable', show: canAccessAR?.() },
    { label: 'Medical Reps',          icon: <PersonSearch />,    path: '/medical-reps',        show: canAccessMedReps?.() },
    { label: 'Logistics',             icon: <LocalShipping />,   path: '/logistics',           show: canAccessLogistics?.() },
    { label: 'Reports',               icon: <BarChart />,        path: '/reports',             show: canAccessReports?.() },
    { label: 'Users',                 icon: <People />,          path: '/users',               show: canManageUsers?.() },
    { label: 'Operations',            icon: <Build />,           path: '/operations',          show: canManageOperations?.() },
    { label: 'Settings',              icon: <Settings />,        path: '/settings',            show: canManageSettings?.() },
  ];

  const currentWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) onMobileClose();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#052E16' }}>
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
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {collapsed ? (
          <Box
            component="img"
            src="/logo.jpg"
            alt="Therapevo"
            sx={{ width: 40, height: 40, objectFit: 'contain' }}
          />
        ) : (
          <Box
            component="img"
            src="/logo.jpg"
            alt="Therapevo TIPDMS"
            sx={{ height: 44, width: 'auto', maxWidth: 150, objectFit: 'contain' }}
          />
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: collapsed ? 0.5 : 1, py: 1.5 }}>
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
                  backgroundColor: isActive ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                  color: isActive ? '#4ADE80' : '#CBD5E1',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(74, 222, 128, 0.22)' : 'rgba(255,255,255,0.06)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? '#4ADE80' : '#94A3B8',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40 }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 }}
                  />
                )}
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

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Collapse toggle (not shown on mobile) */}
      {!isMobile && (
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={onCollapseToggle}
            size="small"
            sx={{ color: '#94A3B8', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Box>
      )}

      {/* User info */}
      {!collapsed && (
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#E2E8F0' }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: '#64748B', textTransform: 'capitalize' }}>
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
            backgroundColor: '#052E16',
            border: 'none',
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
            backgroundColor: '#052E16',
            border: 'none',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
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
