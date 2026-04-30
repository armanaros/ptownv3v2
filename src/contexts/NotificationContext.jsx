import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { subscribeToAnnouncements } from '@/services/announcement.service';
import { subscribeToLowStockItems } from '@/services/inventory.service';
import useAuth from '@/hooks/useAuth';

const NotificationContext = createContext(null);

const LAST_SEEN_KEY = 'ptown:lastSeenAnnouncementId';
const DISMISSED_ALERTS_KEY = 'ptown:dismissedAlerts';

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, isManagerOrAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    const saved = localStorage.getItem(DISMISSED_ALERTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Generate system alerts based on current state
  useEffect(() => {
    const alerts = [];
    const now = new Date();
    const hour = now.getHours();
    
    // Peak hour reminder
    if ((hour >= 11 && hour <= 13) || (hour >= 18 && hour <= 20)) {
      alerts.push({
        id: 'peak-hour',
        type: 'info',
        title: 'Peak Hours Active',
        message: hour >= 18 ? 'Dinner rush in progress' : 'Lunch rush in progress',
        timestamp: now,
      });
    }
    
    // Low stock warning (aggregate)
    if (lowStockItems.length > 3) {
      alerts.push({
        id: 'low-stock-critical',
        type: 'warning',
        title: 'Multiple Low Stock Items',
        message: `${lowStockItems.length} items need restocking`,
        timestamp: now,
      });
    }

    // Filter out dismissed alerts
    const activeAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));
    setSystemAlerts(activeAlerts);
  }, [lowStockItems, dismissedAlerts]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToAnnouncements((items) => {
      setAnnouncements(items);
      if (items.length > 0) {
        const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
        setHasUnread(items[0].id !== lastSeen);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !isManagerOrAdmin?.()) return;

    const unsubscribe = subscribeToLowStockItems((items) => {
      setLowStockItems(items);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isManagerOrAdmin]);

  const markAsRead = useCallback(() => {
    if (announcements.length > 0) {
      localStorage.setItem(LAST_SEEN_KEY, announcements[0].id);
      setHasUnread(false);
    }
  }, [announcements]);

  const dismissAlert = useCallback((alertId) => {
    setDismissedAlerts((prev) => {
      const newDismissed = [...prev, alertId];
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(newDismissed));
      return newDismissed;
    });
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissedAlerts([]);
    localStorage.removeItem(DISMISSED_ALERTS_KEY);
  }, []);

  const totalAlertCount = lowStockItems.length + systemAlerts.length + (hasUnread ? 1 : 0);

  const value = {
    announcements,
    hasUnread,
    markAsRead,
    lowStockItems,
    lowStockCount: lowStockItems.length,
    systemAlerts,
    dismissAlert,
    clearDismissed,
    totalAlertCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
