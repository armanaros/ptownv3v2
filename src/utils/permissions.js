import { ROLES } from '@/config/constants';

// ─── Role Checkers ───────────────────────────────────────────────────────────
export const isSuperAdmin  = (user) => user?.role === ROLES.SUPER_ADMIN;
export const isCEO         = (user) => user?.role === ROLES.CEO;
export const isAdmin       = (user) => user?.role === ROLES.ADMIN;
export const isAccounting  = (user) => user?.role === ROLES.ACCOUNTING;
export const isPharmacy    = (user) => user?.role === ROLES.PHARMACY;
export const isSalesRep    = (user) => user?.role === ROLES.SALES_REP;
export const isLogistics   = (user) => user?.role === ROLES.LOGISTICS;

// ─── Composite Checkers ──────────────────────────────────────────────────────
export const isSuperAdminOrCEO = (user) => isSuperAdmin(user) || isCEO(user);
export const isManagement      = (user) => isSuperAdmin(user) || isCEO(user) || isAdmin(user);
export const hasFinanceAccess  = (user) => isSuperAdmin(user) || isAccounting(user) || isAdmin(user);

// ─── Module Permissions ──────────────────────────────────────────────────────

/** Dashboard access */
export const canAccessDashboard  = (user) => true; // all authenticated users

/** Full executive KPI dashboard (CEO view) */
export const canAccessCEODashboard = (user) => isSuperAdmin(user) || isCEO(user);

/** Sales approval — only management can approve/reject */
export const canApproveSales    = (user) => isManagement(user);

/** Sales management */
export const canAccessSales      = (user) => isSuperAdmin(user) || isCEO(user) || isAdmin(user) || isAccounting(user) || isSalesRep(user);
export const canManageSales      = (user) => isSuperAdmin(user) || isAdmin(user) || isSalesRep(user);

/** Product / pharmaceutical product catalog */
export const canAccessProducts   = (user) => !isSalesRep(user) || isSuperAdmin(user); // sales reps see read-only
export const canManageProducts   = (user) => isSuperAdmin(user) || isAdmin(user) || isPharmacy(user);

/** Inventory management */
export const canAccessInventory  = (user) => isSuperAdmin(user) || isCEO(user) || isAdmin(user) || isPharmacy(user) || isLogistics(user);
export const canManageInventory  = (user) => isSuperAdmin(user) || isAdmin(user) || isPharmacy(user);

/** Accounts receivable */
export const canAccessAR         = (user) => isSuperAdmin(user) || isCEO(user) || isAdmin(user) || isAccounting(user);
export const canManageAR         = (user) => isSuperAdmin(user) || isAccounting(user);

/** Medical representatives */
export const canAccessMedReps    = (user) => isSuperAdmin(user) || isCEO(user) || isAdmin(user);
export const canManageMedReps    = (user) => isSuperAdmin(user) || isAdmin(user);

/** POS */
export const canAccessPOS        = (user) => isSuperAdmin(user) || isAdmin(user) || isSalesRep(user);

/** Logistics / deliveries */
export const canAccessLogistics  = (user) => isSuperAdmin(user) || isCEO(user) || isAdmin(user) || isLogistics(user) || isSalesRep(user);
export const canManageLogistics  = (user) => isSuperAdmin(user) || isAdmin(user) || isLogistics(user);

/** Expenses */
export const canAccessExpenses   = (user) => isSuperAdmin(user) || isAdmin(user) || isAccounting(user);
export const canManageExpenses   = (user) => isSuperAdmin(user) || isAccounting(user) || isAdmin(user);

/** Reports */
export const canAccessReports    = (user) => isSuperAdmin(user) || isCEO(user) || isAdmin(user) || isAccounting(user);

/** User management */
export const canManageUsers      = (user) => isSuperAdmin(user);

/** System operations / settings */
export const canManageOperations = (user) => isSuperAdmin(user) || isAdmin(user);
export const canManageSettings   = (user) => isSuperAdmin(user);

/** Purchase orders */
export const canAccessPurchaseOrders = (user) => isSuperAdmin(user) || isAdmin(user) || isPharmacy(user) || isLogistics(user);
export const canManagePurchaseOrders = (user) => isSuperAdmin(user) || isAdmin(user);
