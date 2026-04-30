import { doc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/firebase';
import firebaseConfig from '@/config/firebase.config';
import { COLLECTIONS } from '@/config/constants';
import logger from '@/utils/logger';

const usersRef = collection(db, COLLECTIONS.USERS);

export const getUserById = async (uid) => {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const getAllUsers = async () => {
  const snap = await getDocs(usersRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getUserByUsername = async (username) => {
  const q = query(usersRef, where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const createUser = async (userData) => {
  const { username, email, password, firstName, lastName, role, phone } = userData;
  const emailToUse = email || `${username.trim().toLowerCase()}@ptown.local`;

  // Use a secondary app so we don't sign out the current admin
  const secondaryApp = initializeApp(firebaseConfig, 'secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, emailToUse, password);

    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      username: username.trim().toLowerCase(),
      email: emailToUse,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role || 'employee',
      phone: phone?.trim() || '',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    logger.info('User created:', cred.user.uid);
    return { uid: cred.user.uid };
  } finally {
    await deleteApp(secondaryApp);
  }
};

export const updateUser = async (uid, data) => {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const deleteUser = async (uid) => {
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
};

export const subscribeToUsers = (callback) => {
  return onSnapshot(usersRef, (snap) => {
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(users);
  });
};
