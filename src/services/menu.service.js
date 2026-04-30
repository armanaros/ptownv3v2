import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import logger from '@/utils/logger';

const categoriesRef = collection(db, COLLECTIONS.MENU_CATEGORIES);
const itemsRef = collection(db, COLLECTIONS.MENU_ITEMS);

// --- Categories ---

export const getCategories = async () => {
  const snapshot = await getDocs(query(categoriesRef, orderBy('sortOrder', 'asc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createCategory = async (data) => {
  const docRef = await addDoc(categoriesRef, {
    ...data,
    isActive: true,
    sortOrder: data.sortOrder || 0,
    createdAt: serverTimestamp(),
  });
  logger.info('Category created:', docRef.id);
  return docRef.id;
};

export const updateCategory = async (id, data) => {
  await updateDoc(doc(categoriesRef, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteCategory = async (id) => {
  // Check for items first
  const itemsSnapshot = await getDocs(itemsRef);
  const hasItems = itemsSnapshot.docs.some((d) => d.data().categoryId === id);
  if (hasItems) {
    throw new Error('Cannot delete category with existing menu items. Move or delete items first.');
  }
  await deleteDoc(doc(categoriesRef, id));
};

export const subscribeToCategories = (callback) => {
  return onSnapshot(query(categoriesRef, orderBy('sortOrder', 'asc')), (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// --- Menu Items ---

export const getAllItems = async () => {
  const snapshot = await getDocs(itemsRef);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

export const createItem = async (data) => {
  const docRef = await addDoc(itemsRef, {
    ...data,
    price: Number(data.price || 0),
    costOfGoods: Number(data.costOfGoods || 0),
    stockLevel: Number(data.stockLevel || 0),
    lowStockThreshold: Number(data.lowStockThreshold || 5),
    preparationTime: data.preparationTime || 15,
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    isActive: true,
    sortOrder: data.sortOrder || 0,
    availableOnline: data.availableOnline !== false,
    availableOnPOS: data.availableOnPOS !== false,
    createdAt: serverTimestamp(),
  });
  logger.info('Menu item created:', docRef.id);
  return docRef.id;
};

export const updateItem = async (id, data) => {
  const safe = { ...data, updatedAt: serverTimestamp() };

  // Auto-derive availability from stock if not explicitly set
  if (typeof data.isAvailable !== 'boolean' && typeof data.stockLevel === 'number') {
    safe.isAvailable = data.stockLevel > 0;
  }

  await updateDoc(doc(itemsRef, id), safe);
};

export const deleteItem = async (id) => {
  await deleteDoc(doc(itemsRef, id));
};

export const subscribeToItems = (callback) => {
  return onSnapshot(itemsRef, (snapshot) => {
    const items = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(items);
  });
};

// --- Full Menu (categories with items grouped) ---

export const getFullMenu = async () => {
  const [categories, items] = await Promise.all([getCategories(), getAllItems()]);
  return categories.map((cat) => ({
    ...cat,
    items: items
      .filter((item) => String(item.categoryId) === String(cat.id))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
  }));
};
