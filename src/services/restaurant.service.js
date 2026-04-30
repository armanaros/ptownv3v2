import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	updateDoc,
	onSnapshot,
	serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';

const RESTAURANTS = 'restaurants';
const restaurantsRef = collection(db, RESTAURANTS);

export const getRestaurantById = async (id) => {
	if (!id) return null;
	const snap = await getDoc(doc(db, RESTAURANTS, id));
	if (!snap.exists()) return null;
	return { id: snap.id, ...snap.data() };
};

export const getRestaurants = async () => {
	const snap = await getDocs(restaurantsRef);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const upsertRestaurant = async (id, data) => {
	if (!id) throw new Error('restaurant id required');
	await setDoc(
		doc(db, RESTAURANTS, id),
		{
			...data,
			updatedAt: serverTimestamp(),
		},
		{ merge: true }
	);
};

export const updateRestaurant = async (id, data) => {
	if (!id) throw new Error('restaurant id required');
	await updateDoc(doc(db, RESTAURANTS, id), {
		...data,
		updatedAt: serverTimestamp(),
	});
};

export const subscribeToRestaurant = (id, callback) => {
	if (!id) return () => {};
	return onSnapshot(doc(db, RESTAURANTS, id), (snap) => {
		callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
	});
};
