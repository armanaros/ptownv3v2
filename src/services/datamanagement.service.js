import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const deleteCollection = async (collectionName) => {
  const ref = collection(db, collectionName);
  const snapshot = await getDocs(ref);
  if (snapshot.empty) return 0;

  // Firestore batches support max 500 operations
  let count = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    batch.delete(doc(db, collectionName, docSnap.id));
    batchCount++;
    count++;
    if (batchCount === 500) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }
  if (batchCount > 0) await batch.commit();
  return count;
};

export const DATA_SECTIONS = [
  { key: 'orders', label: 'Orders', collection: COLLECTIONS.ORDERS },
  { key: 'orderItems', label: 'Order Items', collection: COLLECTIONS.ORDER_ITEMS },
  { key: 'expenses', label: 'Expenses', collection: COLLECTIONS.EXPENSES },
  { key: 'cashCloses', label: 'Cash Closes', collection: COLLECTIONS.CASH_CLOSES },
  { key: 'activityLogs', label: 'Activity Logs', collection: COLLECTIONS.ACTIVITY_LOGS },
  { key: 'announcements', label: 'Announcements', collection: COLLECTIONS.ANNOUNCEMENTS },
  { key: 'coupons', label: 'Coupons', collection: COLLECTIONS.COUPONS },
  { key: 'menuItems', label: 'Menu Items', collection: COLLECTIONS.MENU_ITEMS },
  { key: 'menuCategories', label: 'Menu Categories', collection: COLLECTIONS.MENU_CATEGORIES },
];

export const deleteSelectedData = async (selectedKeys) => {
  const results = {};
  for (const section of DATA_SECTIONS) {
    if (selectedKeys.includes(section.key)) {
      results[section.key] = await deleteCollection(section.collection);
    }
  }

  // Reset order counter if orders were deleted
  if (selectedKeys.includes('orders')) {
    const counterRef = doc(db, 'system_counters', 'orders');
    const batch = writeBatch(db);
    batch.set(counterRef, { current: 0 });
    await batch.commit();
  }

  return results;
};
