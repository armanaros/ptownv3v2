import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Badge,
  useMediaQuery,
  useTheme,
  Divider,
  Button,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Person,
  Logout,
  Notifications,
  Circle,
  Inventory,
  Campaign,
  Info,
  Close,
} from '@mui/icons-material';
import useAuth from '@/hooks/useAuth';
import { useNotifications } from '@/contexts/NotificationContext';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/pos': 'Point of Sale',
  '/orders': 'Orders',
  '/menu': 'Menu Management',
  '/employees': 'Employees',
  '/users': 'User Management',
  '/reports': 'Reports',
  '/deliveries': 'Deliveries',
  '/operations': 'Operations',
  '/profile': 'My Profile',
};

const TopBar = ({ drawerWidth, onMenuClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isManagerOrAdmin } = useAuth();
  const { lowStockItems, lowStockCount, systemAlerts, announcements, hasUnread, markAsRead, totalAlertCount, dismissAlert } = useNotifications();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [notifTab, setNotifTab] = useState(0);

  const pageTitle = pageTitles[location.pathname] || 'Dashboard';
  const showStockAlerts = isManagerOrAdmin?.();
  const badgeCount = showStockAlerts ? totalAlertCount : 0;

  const handleProfileMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleNotifOpen = (e) => setNotifAnchorEl(e.currentTarget);
  const handleNotifClose = () => setNotifAnchorEl(null);

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleProfileMenuClose();
    navigate('/profile');
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h5" noWrap sx={{ fontWeight: 600 }}>
              {pageTitle}
            </Typography>
          </Box>

          {/* Right side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notifications */}
            <IconButton onClick={handleNotifOpen} size="large">
              <Badge badgeContent={badgeCount} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            {/* Profile avatar */}
            <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: 'secondary.main',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { width: 200, mt: 1 } } }}
      >
        <MenuItem onClick={handleProfile}>
          <ListItemIcon><Person fontSize="small" /></ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Notifications menu */}
      <Menu
        anchorEl={notifAnchorEl}
        open={Boolean(notifAnchorEl)}
        onClose={handleNotifClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { width: 360, mt: 1, maxHeight: 480 } } }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Notification Center
          </Typography>
          <Chip label={totalAlertCount} size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
        </Box>
        <Divider />
        <Tabs value={notifTab} onChange={(_, v) => setNotifTab(v)} variant="fullWidth" sx={{ minHeight: 36 }}>
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Inventory sx={{ fontSize: 16 }} /> Stock ({lowStockCount})</Box>} sx={{ minHeight: 36, py: 0.5, fontSize: '0.75rem' }} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Info sx={{ fontSize: 16 }} /> System ({systemAlerts.length})</Box>} sx={{ minHeight: 36, py: 0.5, fontSize: '0.75rem' }} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Campaign sx={{ fontSize: 16 }} /> News ({announcements.length})</Box>} sx={{ minHeight: 36, py: 0.5, fontSize: '0.75rem' }} />
        </Tabs>
        <Divider />
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {/* Stock Tab */}
          {notifTab === 0 && (
            showStockAlerts && lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <MenuItem key={item.id} sx={{ py: 1, gap: 1.5 }} disabled>
                  <Circle sx={{ fontSize: 10, color: (item.stockLevel || 0) <= 0 ? 'error.main' : 'warning.main' }} />
                  <ListItemText
                    primary={item.name}
                    secondary={(item.stockLevel || 0) <= 0 ? 'Out of stock' : `${item.stockLevel} left (threshold: ${item.lowStockThreshold || 5})`}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </MenuItem>
              ))
            ) : (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">All stock levels are healthy</Typography>
              </Box>
            )
          )}
          {/* System Tab */}
          {notifTab === 1 && (
            systemAlerts.length > 0 ? (
              systemAlerts.map((alert) => (
                <MenuItem key={alert.id} sx={{ py: 1, gap: 1 }}>
                  <Circle sx={{ fontSize: 10, color: alert.type === 'warning' ? 'warning.main' : 'info.main' }} />
                  <ListItemText
                    primary={alert.title}
                    secondary={alert.message}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <IconButton size="small" onClick={() => dismissAlert(alert.id)}>
                    <Close fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))
            ) : (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No system alerts</Typography>
              </Box>
            )
          )}
          {/* Announcements Tab */}
          {notifTab === 2 && (
            announcements.length > 0 ? (
              <>
                {hasUnread && (
                  <Box sx={{ px: 2, py: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={markAsRead}>Mark as read</Button>
                  </Box>
                )}
                {announcements.slice(0, 5).map((ann) => (
                  <MenuItem key={ann.id} sx={{ py: 1, gap: 1 }}>
                    <Campaign sx={{ fontSize: 18, color: 'primary.main' }} />
                    <ListItemText
                      primary={ann.title}
                      secondary={ann.message?.slice(0, 50) + (ann.message?.length > 50 ? '...' : '')}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </MenuItem>
                ))}
              </>
            ) : (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No announcements</Typography>
              </Box>
            )
          )}
        </Box>
        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button size="small" onClick={() => { handleNotifClose(); navigate('/operations'); }}>
            View All in Operations
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default TopBar;
