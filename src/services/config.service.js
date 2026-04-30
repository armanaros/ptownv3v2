import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

const CONFIG_DOC_ID = 'global';

export const getSystemConfig = async () => {
	const snap = await getDoc(doc(db, COLLECTIONS.SYSTEM_SETTINGS, CONFIG_DOC_ID));
	if (!snap.exists()) return null;
	return { id: snap.id, ...snap.data() };
};

export const saveSystemConfig = async (data) => {
	await setDoc(
		doc(db, COLLECTIONS.SYSTEM_SETTINGS, CONFIG_DOC_ID),
		{
			...data,
			updatedAt: serverTimestamp(),
		},
		{ merge: true }
	);
};
