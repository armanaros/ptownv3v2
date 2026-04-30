import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const shiftsRef = collection(db, COLLECTIONS.SHIFTS);

export const createShift = async (data) => {
  return addDoc(shiftsRef, { ...data, createdAt: serverTimestamp() });
};

export const updateShift = async (id, data) => {
  await updateDoc(doc(shiftsRef, id), { ...data, updatedAt: serverTimestamp() });
};

export const updateShiftStatus = async (id, status) => {
  await updateDoc(doc(shiftsRef, id), { status, updatedAt: serverTimestamp() });
};

export const deleteShift = async (id) => {
  await deleteDoc(doc(shiftsRef, id));
};

export const subscribeToShifts = (callback) => {
  return onSnapshot(query(shiftsRef, orderBy('date', 'desc')), (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};
