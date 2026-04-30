import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import logger from '@/utils/logger';

export const logActivity = async (data) => {
  try {
    const ref = doc(collection(db, COLLECTIONS.ACTIVITY_LOGS));
    await setDoc(ref, {
      ...data,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    logger.error('Failed to log activity:', err);
  }
};
