import { createContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import * as authService from '@/services/auth.service';
import * as userService from '@/services/user.service';
import * as permissions from '@/utils/permissions';
import { logActivity } from '@/services/activity.service';
import logger from '@/utils/logger';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await userService.getUserById(firebaseUser.uid);
          if (profile) {
            setUser({ ...profile, uid: firebaseUser.uid });
          } else {
            logger.warn('No profile found for user:', firebaseUser.uid);
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'employee' });
          }
        } catch (err) {
          logger.error('Error loading user profile:', err);
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'employee' });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (usernameOrEmail, password) => {
    const firebaseUser = await authService.signIn(usernameOrEmail, password);
    const profile = await userService.getUserById(firebaseUser.uid);
    const fullUser = profile ? { ...profile, uid: firebaseUser.uid } : { uid: firebaseUser.uid, email: firebaseUser.email, role: 'employee' };
    setUser(fullUser);
    logActivity({ type: 'AUTH', action: 'LOGIN', userId: firebaseUser.uid, details: `${fullUser.firstName || ''} logged in` });
    return fullUser;
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      logActivity({ type: 'AUTH', action: 'LOGOUT', userId: user.uid, details: `${user.firstName || ''} logged out` });
    }
    await authService.signOut();
    setUser(null);
  }, [user]);

  const updateProfile = useCallback(async (data) => {
    if (!user) return;
    await userService.updateUser(user.uid, data);
    setUser((prev) => ({ ...prev, ...data }));
  }, [user]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    isAdmin: () => permissions.isAdmin(user),
    isManager: () => permissions.isManager(user),
    isEmployee: () => permissions.isEmployee(user),
    isDelivery: () => permissions.isDelivery(user),
    isManagerOrAdmin: () => permissions.isManagerOrAdmin(user),
    canAccessReports: () => permissions.canAccessReports(user),
    canManageUsers: () => permissions.canManageUsers(user),
    canManageMenu: () => permissions.canManageMenu(user),
    canProcessOrders: () => permissions.canProcessOrders(user),
    canViewMenu: () => permissions.canViewMenu(user),
    canViewDeliveries: () => permissions.canViewDeliveries(user),
    canManageExpenses: () => permissions.canManageExpenses(user),
    canManageOperations: () => permissions.canManageOperations(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
