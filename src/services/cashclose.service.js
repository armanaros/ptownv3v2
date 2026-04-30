import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const cashClosesRef = collection(db, COLLECTIONS.CASH_CLOSES);

export const saveCashClose = async (data) => {
  const docRef = await addDoc(cashClosesRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateCashClose = async (id, data) => {
  await updateDoc(doc(cashClosesRef, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const getCashCloseByDateRange = async (start, end) => {
  const q = query(
    cashClosesRef,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};
