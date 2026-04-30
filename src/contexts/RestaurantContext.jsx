import { createContext, useMemo, useState, useEffect } from 'react';
import useAuth from '@/hooks/useAuth';

export const RestaurantContext = createContext({
	restaurantId: '',
	setRestaurantId: () => {},
});

export const RestaurantProvider = ({ children }) => {
	const { user } = useAuth();
	const [restaurantId, setRestaurantId] = useState('');

	useEffect(() => {
		if (user?.restaurantId) setRestaurantId(user.restaurantId);
	}, [user?.restaurantId]);

	const value = useMemo(() => ({ restaurantId, setRestaurantId }), [restaurantId]);

	return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};
