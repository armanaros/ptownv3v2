import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { subscribeToAnnouncements } from '@/services/announcement.service';
import { subscribeToLowStockItems } from '@/services/inventory.service';
import useAuth from '@/hooks/useAuth';
import { db } from '@/firebase';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { COLLECTIONS } from '@/config/constants';
import { formatCurrency } from '@/utils/formatters';

// ── Installment helpers (mirrors AccountsReceivablePage) ─────────────────────
const _instPaid = (amountPaid, installmentAmount) => {
  if (!installmentAmount || installmentAmount <= 0) return null;
  return Math.floor((amountPaid || 0) / installmentAmount);
};
const _nextDue = (firstDue, installmentsPaid, frequency = 'monthly') => {
  if (!firstDue || installmentsPaid == null) return null;
  const d = firstDue?.toDate ? firstDue.toDate() : new Date(firstDue);
  const r = new Date(d);
  if (frequency === 'weekly')     r.setDate(r.getDate() + installmentsPaid * 7);
  else if (frequency === 'bi_monthly') r.setDate(r.getDate() + installmentsPaid * 14);
  else r.setMonth(r.getMonth() + installmentsPaid);
  return r;
};
const _fmtDate = (d) => d instanceof Date
  ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  : '';

const NotificationContext = createContext(null);

const LAST_SEEN_KEY = 'tipdms:lastSeenAnnouncementId';
const DISMISSED_ALERTS_KEY = 'tipdms:dismissedAlerts';

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, isManagement, user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [upcomingInstallments, setUpcomingInstallments] = useState([]);
  const [arRecords, setArRecords] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    const saved = localStorage.getItem(DISMISSED_ALERTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Generate system alerts based on current state
  useEffect(() => {
    const alerts = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
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

    // Upcoming / overdue payment alerts (within 5 days) — installment plans AND plain credit terms
    const upcoming = [];
    arRecords.forEach((r) => {
      if (r.status === 'paid' || r.status === 'cancelled' || r.status === 'rejected') return;

      // ── Case 1: has a full installment plan ──────────────────────────────
      if (r.installmentTotal) {
        const ip = _instPaid(r.amountPaid, r.installmentAmount);
        if (ip == null || ip >= r.installmentTotal) return;
        const nd = _nextDue(r.firstInstallmentDue, ip, r.installmentFrequency);
        if (!nd) return;
        const daysUntil = Math.ceil((nd - now) / 86400000);
        if (daysUntil <= 5) {
          upcoming.push(r);
          alerts.push({
            id: `ar-due-${r.id}-${todayStr}`,
            type: daysUntil <= 0 ? 'error' : 'warning',
            title: `Payment Due\u2014${r.customerName}`,
            message: `Installment ${ip + 1}/${r.installmentTotal} \u2014 ${formatCurrency(r.installmentAmount)} due ${_fmtDate(nd)}${
              daysUntil <= 0 ? ' (OVERDUE)' : daysUntil === 0 ? ' (TODAY)' : ` (in ${daysUntil}d)`
            }`,
            timestamp: nd,
          });
        }
        return;
      }

      // ── Case 2: no installment plan but has firstInstallmentDue ─────────
      if (r.firstInstallmentDue && !r.amountPaid) {
        const fd = r.firstInstallmentDue?.toDate ? r.firstInstallmentDue.toDate() : new Date(r.firstInstallmentDue);
        const daysUntil = Math.ceil((fd - now) / 86400000);
        if (daysUntil <= 5) {
          upcoming.push(r);
          alerts.push({
            id: `ar-first-${r.id}-${todayStr}`,
            type: daysUntil <= 0 ? 'error' : 'warning',
            title: `Payment Schedule Started\u2014${r.customerName}`,
            message: `First payment of ${formatCurrency(r.balance || r.amount)} due ${_fmtDate(fd)}${
              daysUntil <= 0 ? ' (OVERDUE)' : daysUntil === 0 ? ' (TODAY)' : ` (in ${daysUntil}d)`
            }`,
            timestamp: fd,
          });
        }
        return;
      }

      // ── Case 3: plain credit term with only an overall dueDate ───────────
      if (r.dueDate) {
        const dd = r.dueDate?.toDate ? r.dueDate.toDate() : new Date(r.dueDate);
        const daysUntil = Math.ceil((dd - now) / 86400000);
        if (daysUntil <= 5) {
          upcoming.push(r);
          alerts.push({
            id: `ar-overdue-${r.id}-${todayStr}`,
            type: daysUntil <= 0 ? 'error' : 'warning',
            title: `Credit Term Due\u2014${r.customerName}`,
            message: `Balance of ${formatCurrency(r.balance || r.amount)} due ${_fmtDate(dd)}${
              daysUntil <= 0 ? ' (OVERDUE)' : daysUntil === 0 ? ' (TODAY)' : ` (in ${daysUntil}d)`
            }`,
            timestamp: dd,
          });
        }
      }
    });
    setUpcomingInstallments(upcoming);

    // Filter out dismissed alerts
    const activeAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));
    setSystemAlerts(activeAlerts);
  }, [lowStockItems, dismissedAlerts, arRecords]);

  // Subscribe to AR records to watch for upcoming installments
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = onSnapshot(collection(db, COLLECTIONS.ACCOUNTS_RECEIVABLE), (snap) => {
      setArRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [isAuthenticated]);

  // Subscribe to personal (per-user) notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    const q = query(
      collection(db, COLLECTIONS.USER_NOTIFICATIONS),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUserNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [isAuthenticated, user?.uid]);

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
    if (!isAuthenticated || !isManagement?.()) return;

    const unsubscribe = subscribeToLowStockItems((items) => {
      setLowStockItems(items);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isManagement]);

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

  const markNotificationRead = useCallback(async (notifId) => {
    await updateDoc(doc(db, COLLECTIONS.USER_NOTIFICATIONS, notifId), { read: true });
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await Promise.all(userNotifications.map((n) => updateDoc(doc(db, COLLECTIONS.USER_NOTIFICATIONS, n.id), { read: true })));
  }, [userNotifications]);

  const totalAlertCount = lowStockItems.length + systemAlerts.length + (hasUnread ? 1 : 0) + userNotifications.length;

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
    upcomingInstallments,
    upcomingInstallmentCount: upcomingInstallments.length,
    userNotifications,
    userNotificationCount: userNotifications.length,
    markNotificationRead,
    markAllNotificationsRead,
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
