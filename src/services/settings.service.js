import {
  collection,
  doc,
  getDocs,
  updateDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const settingsRef = collection(db, COLLECTIONS.SYSTEM_SETTINGS);
const storeStatusRef = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'store');

export const getSettings = async () => {
  const snapshot = await getDocs(settingsRef);
  const settings = {};
  snapshot.docs.forEach((d) => {
    settings[d.id] = d.data();
  });
  return settings;
};

export const updateSetting = async (key, value) => {
  await setDoc(doc(settingsRef, key), {
    value,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// --- Store Status ---

export const setStoreStatus = async (isOpen, closedMessage = '', restaurantId = null) => {
  const data = { isOpen, closedMessage, updatedAt: serverTimestamp() };
  if (restaurantId) data.restaurantId = restaurantId;
  await setDoc(storeStatusRef, data, { merge: true });
};

export const subscribeToStoreStatus = (callback) => {
  return onSnapshot(
    storeStatusRef,
    (snap) => {
      if (snap.exists()) callback(snap.data());
      else callback({ isOpen: true, closedMessage: '' });
    },
    (err) => {
      console.error('subscribeToStoreStatus error:', err);
      callback({ isOpen: true, closedMessage: '' });
    }
  );
};
