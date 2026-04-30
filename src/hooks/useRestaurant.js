import { useMemo, useState, useCallback } from 'react';
import useAuth from '@/hooks/useAuth';

const STORAGE_KEY = 'ptown:restaurantId';

export const useRestaurant = () => {
	const { user } = useAuth();

	const derivedRestaurantId = useMemo(() => {
		const fromUser = user?.restaurantId;
		if (fromUser) return fromUser;

		const fromStorage = localStorage.getItem(STORAGE_KEY);
		if (fromStorage) return fromStorage;

		return '';
	}, [user?.restaurantId]);

	const [restaurantId, setRestaurantIdState] = useState(derivedRestaurantId);

	const setRestaurantId = useCallback((id) => {
		const next = id || '';
		setRestaurantIdState(next);

		if (next) {
			localStorage.setItem(STORAGE_KEY, next);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	}, []);

	return {
		restaurantId: restaurantId || derivedRestaurantId || '',
		setRestaurantId,
	};
};

export default useRestaurant;
