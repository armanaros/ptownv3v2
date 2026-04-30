import { ROLES } from '@/config/constants';

export const isAdmin = (user) => user?.role === ROLES.ADMIN;
export const isManager = (user) => user?.role === ROLES.MANAGER;
export const isEmployee = (user) => user?.role === ROLES.EMPLOYEE;
export const isDelivery = (user) => user?.role === ROLES.DELIVERY;
export const isManagerOrAdmin = (user) => isAdmin(user) || isManager(user);

export const canAccessReports = (user) => isManagerOrAdmin(user);
export const canManageUsers = (user) => isAdmin(user);
export const canManageMenu = (user) => isManagerOrAdmin(user);
export const canProcessOrders = (user) => isAdmin(user) || isManager(user) || isEmployee(user);
export const canViewMenu = (user) => isAdmin(user) || isManager(user) || isEmployee(user);
export const canViewDeliveries = (user) => isManagerOrAdmin(user) || isDelivery(user);
export const canManageDeliveries = (user) => isManagerOrAdmin(user);
export const canManageExpenses = (user) => isManagerOrAdmin(user);
export const canManageOperations = (user) => isAdmin(user);
