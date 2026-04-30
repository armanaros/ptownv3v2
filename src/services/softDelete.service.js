import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const softDelete = async (db, collectionName, docId, deletedBy, deletionReason = '', restaurantId = '') => {
	if (!db) throw new Error('db is required');
	if (!collectionName) throw new Error('collectionName is required');
	if (!docId) throw new Error('docId is required');

	const ref = doc(db, collectionName, docId);
	await updateDoc(ref, {
		deletedAt: serverTimestamp(),
		deletedBy: deletedBy || null,
		deletionReason: deletionReason || '',
		restaurantId: restaurantId || null,
		updatedAt: serverTimestamp(),
	});
};

export default softDelete;
