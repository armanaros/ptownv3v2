import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import logger from '@/utils/logger';

export const signIn = async (usernameOrEmail, password) => {
  let email = usernameOrEmail;

  if (!usernameOrEmail.includes('@')) {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('username', '==', usernameOrEmail.trim().toLowerCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Username not found');
    email = snap.docs[0].data().email;
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  logger.info('User signed in:', userCredential.user.uid);
  return userCredential.user;
};

export const signOut = async () => {
  await firebaseSignOut(auth);
  logger.info('User signed out');
};

export const getCurrentUser = () => auth.currentUser;

export const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
};
