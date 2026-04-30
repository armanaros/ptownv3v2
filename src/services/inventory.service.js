import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const menuItemsRef = collection(db, COLLECTIONS.MENU_ITEMS);

export const subscribeToAllStockItems = (callback) => {
  return onSnapshot(menuItemsRef, (snapshot) => {
    const items = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => item.isActive !== false)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(items);
  });
};

export const subscribeToLowStockItems = (callback) => {
  return onSnapshot(menuItemsRef, (snapshot) => {
    const items = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => {
        const stock = item.stockLevel || 0;
        const threshold = item.lowStockThreshold || 5;
        return stock <= threshold && item.isActive !== false;
      });
    callback(items);
  });
};
