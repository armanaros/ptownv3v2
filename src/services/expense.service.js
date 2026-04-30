import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const expensesRef = collection(db, COLLECTIONS.EXPENSES);

export const addExpense = async (data) => {
  const docRef = await addDoc(expensesRef, {
    description: data.description || '',
    amount: Number(data.amount) || 0,
    category: data.category || 'general',
    createdBy: data.createdBy || '',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getExpensesByDateRange = async (start, end) => {
  const q = query(
    expensesRef,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const at = a.createdAt?.toDate?.() || new Date(0);
      const bt = b.createdAt?.toDate?.() || new Date(0);
      return bt - at;
    });
};

export const updateExpense = async (id, data) => {
  await updateDoc(doc(expensesRef, id), {
    description: data.description,
    amount: Number(data.amount),
    category: data.category,
    updatedAt: serverTimestamp(),
  });
};

export const deleteExpense = async (id) => {
  await deleteDoc(doc(expensesRef, id));
};
