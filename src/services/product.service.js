import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import logger from '@/utils/logger';

const categoriesRef = collection(db, COLLECTIONS.PRODUCT_CATEGORIES);
const productsRef   = collection(db, COLLECTIONS.PRODUCTS);

// ─── Product Categories ───────────────────────────────────────────────────────

export const getCategories = async () => {
  const snapshot = await getDocs(query(categoriesRef, orderBy('sortOrder', 'asc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createCategory = async (data) => {
  const ref = await addDoc(categoriesRef, {
    ...data,
    isActive: true,
    sortOrder: data.sortOrder || 0,
    createdAt: serverTimestamp(),
  });
  logger.info('Product category created:', ref.id);
  return ref.id;
};

export const updateCategory = async (id, data) => {
  await updateDoc(doc(categoriesRef, id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteCategory = async (id) => {
  const snap = await getDocs(query(productsRef, where('categoryId', '==', id)));
  if (!snap.empty) {
    throw new Error('Cannot delete category that still has products. Move or delete products first.');
  }
  await deleteDoc(doc(categoriesRef, id));
};

export const subscribeToCategories = (callback) =>
  onSnapshot(query(categoriesRef, orderBy('sortOrder', 'asc')), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

// ─── Products ─────────────────────────────────────────────────────────────────

export const createProduct = async (data) => {
  const ref = await addDoc(productsRef, {
    name:                  data.name?.trim() || '',
    genericName:           data.genericName?.trim() || '',
    manufacturer:          data.manufacturer?.trim() || '',
    dosageForm:            data.dosageForm || '',
    strength:              data.strength?.trim() || '',
    unit:                  data.unit?.trim() || 'piece',
    categoryId:            data.categoryId || '',
    price:                 Number(data.price || 0),
    costPrice:             Number(data.costPrice || 0),
    stockLevel:            Number(data.stockLevel || 0),
    reorderLevel:          Number(data.reorderLevel || 10),
    barcode:               data.barcode?.trim() || '',
    requiresPrescription:  data.requiresPrescription === true,
    isActive:              true,
    isAvailable:           data.isAvailable !== false,
    notes:                 data.notes?.trim() || '',
    imageUrl:              data.imageUrl?.trim() || '',
    createdAt:             serverTimestamp(),
  });
  logger.info('Product created:', ref.id);
  return ref.id;
};

export const updateProduct = async (id, data) => {
  const safe = { ...data, updatedAt: serverTimestamp() };
  if (typeof data.price !== 'undefined')    safe.price    = Number(data.price);
  if (typeof data.costPrice !== 'undefined') safe.costPrice = Number(data.costPrice);
  if (typeof data.stockLevel !== 'undefined') safe.stockLevel = Number(data.stockLevel);
  if (typeof data.reorderLevel !== 'undefined') safe.reorderLevel = Number(data.reorderLevel);
  await updateDoc(doc(productsRef, id), safe);
};

export const deleteProduct = async (id) => {
  await deleteDoc(doc(productsRef, id));
};

export const subscribeToProducts = (callback) =>
  onSnapshot(productsRef, (snap) => {
    const products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(products);
  });

export const subscribeToLowStockProducts = (threshold = 10, callback) =>
  onSnapshot(
    query(productsRef, where('isActive', '==', true)),
    (snap) => {
      const low = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.stockLevel <= (p.reorderLevel ?? threshold));
      callback(low);
    }
  );
