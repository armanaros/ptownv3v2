import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const announcementsRef = collection(db, COLLECTIONS.ANNOUNCEMENTS);

export const createAnnouncement = async ({ title, message, createdBy, authorName }) => {
  return addDoc(announcementsRef, {
    title: title || '',
    message,
    createdBy,
    authorName: authorName || '',
    createdAt: serverTimestamp(),
  });
};

export const deleteAnnouncement = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, id));
};

export const subscribeToAnnouncements = (callback, maxItems = 50) => {
  const q = query(announcementsRef, orderBy('createdAt', 'desc'), limit(maxItems));
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(announcements);
  });
};
