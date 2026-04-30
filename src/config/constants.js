export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  DELIVERY: 'delivery',
};

export const ORDER_STATUSES = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ORDER_TYPES = {
  DINE_IN: 'dine-in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery',
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  GCASH: 'gcash',
  PAYMAYA: 'paymaya',
  BANK_TRANSFER: 'bank_transfer',
};

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

export const COLLECTIONS = {
  USERS: 'users',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  MENU_CATEGORIES: 'menu_categories',
  MENU_ITEMS: 'menu_items',
  COUPONS: 'coupons',
  SHIFTS: 'shifts',
  ABSENCES: 'absences',
  INVENTORY_ALERTS: 'inventory_alerts',
  ACTIVITY_LOGS: 'activity_logs',
  ANNOUNCEMENTS: 'announcements',
  OPERATIONS: 'operations',
  SYSTEM_SETTINGS: 'system_settings',
  EXPENSES: 'expenses',
  CASH_CLOSES: 'cash_closes',
};

export const MANILA_OFFSET_HOURS = 8;

export const STATUS_COLORS = {
  pending: 'warning',
  preparing: 'info',
  ready: 'success',
  served: 'success',
  out_for_delivery: 'info',
  delivered: 'success',
  completed: 'success',
  cancelled: 'error',
};

export const DRAWER_WIDTH = 240;
export const DRAWER_COLLAPSED_WIDTH = 64;
