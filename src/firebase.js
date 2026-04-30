import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebaseConfig from '@/config/firebase.config';

const app = initializeApp(firebaseConfig);

// Use persistent cache with multi-tab support; fall back to memory cache on
// browsers that block IndexedDB (Safari private mode, iOS restrictions, etc.)
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  db = initializeFirestore(app, { localCache: memoryLocalCache() });
}
export { db };

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export default app;
