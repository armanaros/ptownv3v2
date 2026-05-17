// ─── TIPDMS: Therapevo Integrated Pharmaceutical Distribution Management System ───

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CEO: 'ceo',
  ADMIN: 'admin',           // Administrative
  ACCOUNTING: 'accounting',
  PHARMACY: 'pharmacy',
  SALES_REP: 'sales_rep',   // Sales Representative / Distributor
  LOGISTICS: 'logistics',
};

export const SALES_STATUSES = {
  PENDING: 'pending',
  PENDING_APPROVAL: 'pending_approval',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REJECTED: 'rejected',
};

export const DELIVERY_STATUSES = {
  SCHEDULED: 'scheduled',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CHECK: 'check',
  BANK_TRANSFER: 'bank_transfer',
  GCASH: 'gcash',
  CREDIT_TERM: 'credit_term',
};

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};

export const EXPENSE_CATEGORIES = {
  PROCUREMENT: 'Procurement',
  LOGISTICS: 'Logistics',
  SALARIES: 'Salaries & Wages',
  UTILITIES: 'Utilities',
  ADMIN: 'Administrative',
  MARKETING: 'Marketing',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other',
};

export const PRODUCT_CATEGORIES = {
  PRESCRIPTION: 'Prescription Medicine',
  OTC: 'Over-the-Counter',
  VITAMINS: 'Vitamins & Supplements',
  MEDICAL_SUPPLIES: 'Medical Supplies',
  EQUIPMENT: 'Medical Equipment',
  COSMETICS: 'Cosmetics & Personal Care',
  OTHER: 'Other',
};

export const AR_STATUSES = {
  CURRENT: 'current',
  OVERDUE: 'overdue',
  BAD_DEBT: 'bad_debt',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

export const COLLECTIONS = {
  USERS: 'users',
  SALES_TRANSACTIONS: 'sales_transactions',
  SALE_ITEMS: 'sale_items',
  PRODUCT_CATEGORIES: 'product_categories',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  BATCHES: 'batches',
  WAREHOUSES: 'warehouses',
  EXPENSES: 'expenses',
  CASH_CLOSES: 'cash_closes',
  ACCOUNTS_RECEIVABLE: 'accounts_receivable',
  AR_PAYMENTS: 'ar_payments',
  MEDICAL_REPS: 'medical_reps',
  REP_ASSIGNMENTS: 'rep_assignments',
  PURCHASE_ORDERS: 'purchase_orders',
  DELIVERIES: 'deliveries',
  DELIVERY_ITEMS: 'delivery_items',
  BRANCHES: 'branches',
  ACTIVITY_LOGS: 'activity_logs',
  ANNOUNCEMENTS: 'announcements',
  SYSTEM_SETTINGS: 'system_settings',
  USER_NOTIFICATIONS: 'user_notifications',
  RESTAURANTS: 'restaurants',
  // Legacy keys kept so existing services don't break during migration
  ORDERS: 'sales_transactions',
  ORDER_ITEMS: 'sale_items',
  MENU_CATEGORIES: 'product_categories',
  MENU_ITEMS: 'products',
  COUPONS: 'coupons',
  SHIFTS: 'shifts',
  ABSENCES: 'absences',
  INVENTORY_ALERTS: 'inventory_alerts',
  OPERATIONS: 'operations',
};

// ─── Transaction / Order types for POS ──────────────────────────────────────
export const ORDER_TYPES = {
  WALK_IN:     'walk_in',
  DISTRIBUTOR: 'distributor',
  CREDIT_SALE: 'credit_sale',
};

// Alias for legacy component references during migration
export const ORDER_STATUSES = {
  PENDING:          'pending',
  PENDING_APPROVAL: 'pending_approval',
  PROCESSING:       'processing',
  APPROVED:         'approved',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED:        'delivered',
  COMPLETED:        'completed',
  CANCELLED:        'cancelled',
  RETURNED:         'returned',
  REJECTED:         'rejected',
};

export const MANILA_OFFSET_HOURS = 8;

export const STATUS_COLORS = {
  pending: 'warning',
  pending_approval: 'warning',
  preparing: 'info',
  ready: 'success',
  served: 'success',
  out_for_delivery: 'info',
  delivered: 'success',
  completed: 'success',
  cancelled: 'error',
  rejected: 'error',
};

export const DRAWER_WIDTH = 240;
export const DRAWER_COLLAPSED_WIDTH = 64;
