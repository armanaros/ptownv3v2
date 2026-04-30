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

const couponsRef = collection(db, COLLECTIONS.COUPONS);

export const getCoupons = async () => {
  const q = query(couponsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addCoupon = async (coupon) => {
  const data = {
    code: (coupon.code || '').toUpperCase(),
    type: coupon.type || 'percent',
    value: Number(coupon.value) || 0,
    description: coupon.description || '',
    minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0,
    maxUses: coupon.maxUses ? Number(coupon.maxUses) : null,
    usedCount: 0,
    active: coupon.active !== false,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(couponsRef, data);
  return { id: ref.id, ...data };
};

export const updateCoupon = async (id, patch) => {
  const update = {};
  if (patch.code !== undefined) update.code = String(patch.code).toUpperCase();
  if (patch.type !== undefined) update.type = patch.type;
  if (patch.value !== undefined) update.value = Number(patch.value);
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.minOrderAmount !== undefined) update.minOrderAmount = patch.minOrderAmount ? Number(patch.minOrderAmount) : 0;
  if (patch.maxUses !== undefined) update.maxUses = patch.maxUses ? Number(patch.maxUses) : null;
  if (patch.active !== undefined) update.active = !!patch.active;
  await updateDoc(doc(couponsRef, id), update);
  return { id, ...update };
};

export const deleteCoupon = async (id) => {
  await deleteDoc(doc(couponsRef, id));
};

export const subscribeToCoupons = (callback) => {
  const q = query(couponsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// --- Validation & discount calculation ---

export const validateCoupon = (code, coupons) => {
  const normalized = (code || '').trim().toUpperCase();
  return coupons.find((c) => c.code === normalized && c.active);
};

export const calculateDiscount = (coupon, subtotal) => {
  if (!coupon || !subtotal) return 0;
  if (coupon.type === 'percent') {
    return Math.round((subtotal * (coupon.value / 100)) * 100) / 100;
  }
  if (coupon.type === 'fixed') {
    return Math.min(subtotal, Number(coupon.value));
  }
  return 0;
};
