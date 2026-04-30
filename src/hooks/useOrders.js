import { useState, useEffect, useRef } from 'react';
import { subscribeToOrders } from '@/services/order.service';
import { getManilaDayRange } from '@/utils/dateHelpers';
import { useRestaurant } from '@/hooks/useRestaurant';
import { playNotificationSound, playOnlineOrderSound } from '@/utils/notificationSound';

const useOrders = (daysBack = 30) => {
  const { restaurantId } = useRestaurant();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevOrderCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    console.log('[useOrders] Subscribing with restaurantId:', restaurantId || '(empty)', 'daysBack:', daysBack);
    setLoading(true);
    isInitialLoadRef.current = true;
    // Pass empty string to get ALL orders when no restaurantId
    const unsubscribe = subscribeToOrders(restaurantId || '', (data) => {
      console.log('[useOrders] Received orders:', data.length);
      
      // Play sound for new orders (after initial load)
      if (!isInitialLoadRef.current && data.length > prevOrderCountRef.current) {
        const newest = data[0];
        if (newest?.employeeId === 'public') {
          playOnlineOrderSound();
        } else {
          playNotificationSound();
        }
      }
      
      prevOrderCountRef.current = data.length;
      isInitialLoadRef.current = false;
      setOrders(data);
      setLoading(false);
    }, daysBack);
    return () => unsubscribe();
  }, [restaurantId, daysBack]);

  const todaysOrders = orders.filter((o) => {
    const ref = o.createdAt?.toDate?.();
    if (!ref) return true;
    const { start, end } = getManilaDayRange();
    return ref >= start && ref <= end;
  });

  return { orders, loading, todaysOrders };
};

export default useOrders;
