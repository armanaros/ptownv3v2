import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import { getManilaDayRange } from '@/utils/dateHelpers';
import { getExpensesByDateRange } from '@/services/expense.service';

const ordersRef = collection(db, COLLECTIONS.ORDERS);

/**
 * Get report data for a date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} restaurantId - Restaurant ID filter
 * @param {boolean} useManilaTz - If true, use Manila timezone for day boundaries
 */
export const getReportData = async (startDate, endDate, restaurantId = '', useManilaTz = false) => {
  let start, end;
  
  if (useManilaTz) {
    // Use Manila timezone-aware day range
    const range = getManilaDayRange(startDate instanceof Date ? startDate : new Date(startDate));
    start = range.start;
    end = range.end;
  } else {
    start = startDate instanceof Date ? startDate : new Date(startDate);
    end = endDate instanceof Date ? endDate : new Date(endDate);
    end.setHours(23, 59, 59, 999);
  }

  // Query only orders within the date range instead of fetching all orders
  const q = query(
    ordersRef,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end))
  );
  const allOrders = (await getDocs(q)).docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  const filtered = allOrders.filter((o) => {
    if (restaurantId && o.restaurantId && String(o.restaurantId) !== String(restaurantId)) {
      return false;
    }
    const ref = o.deliveredAt?.toDate?.() || o.completedAt?.toDate?.() || o.createdAt?.toDate?.();
    if (!ref) return false;
    return ref >= start && ref <= end;
  });

  const completed = filtered.filter((o) =>
    ['served', 'completed', 'delivered'].includes(o.status)
  );

  const totalRevenue = completed.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = filtered.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Sales by day
  const salesByDay = {};
  completed.forEach((o) => {
    const ref = o.deliveredAt?.toDate?.() || o.completedAt?.toDate?.() || o.createdAt?.toDate?.();
    if (!ref) return;
    const key = ref.toISOString().split('T')[0];
    if (!salesByDay[key]) salesByDay[key] = { date: key, revenue: 0, orders: 0 };
    salesByDay[key].revenue += o.total || 0;
    salesByDay[key].orders += 1;
  });

  // Top items (include categoryName)
  const itemCounts = {};
  completed.forEach((o) => {
    o.items?.forEach((item) => {
      const key = item.name;
      if (!itemCounts[key]) itemCounts[key] = { name: key, quantity: 0, revenue: 0, categoryName: item.categoryName || '' };
      itemCounts[key].quantity += item.quantity || 0;
      itemCounts[key].revenue += (item.unitPrice || 0) * (item.quantity || 0);
    });
  });
  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Orders by type
  const ordersByType = {};
  completed.forEach((o) => {
    const type = o.orderType || 'unknown';
    ordersByType[type] = (ordersByType[type] || 0) + 1;
  });

  // Orders by payment method
  const ordersByPayment = {};
  completed.forEach((o) => {
    const method = o.paymentMethod || 'unknown';
    ordersByPayment[method] = (ordersByPayment[method] || 0) + 1;
  });

  // Orders by status (all, not just completed)
  const ordersByStatus = {};
  filtered.forEach((o) => {
    const status = o.status || 'pending';
    ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
  });

  // Cancelled orders detail
  const cancelledOrders = filtered
    .filter((o) => o.status === 'cancelled')
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber || o.id.slice(-6).toUpperCase(),
      total: o.total || 0,
      cancelReason: o.cancelReason || o.cancellationReason || '',
      createdAt: o.createdAt?.toDate?.() || null,
      orderType: o.orderType || '',
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Sales by hour (for Today view)
  const salesByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, orders: 0 }));
  completed.forEach((o) => {
    const ref = o.deliveredAt?.toDate?.() || o.completedAt?.toDate?.() || o.createdAt?.toDate?.();
    if (!ref) return;
    const h = ref.getHours();
    salesByHour[h].revenue += o.total || 0;
    salesByHour[h].orders += 1;
  });

  // Expenses for the period
  let totalExpenses = 0;
  let expensesList = [];
  try {
    expensesList = await getExpensesByDateRange(start, end);
    totalExpenses = expensesList.reduce((s, e) => s + (e.amount || 0), 0);
  } catch {
    // non-critical — leave as 0
  }

  return {
    totalRevenue,
    totalOrders,
    avgOrder,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    salesByDay: Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date)),
    salesByHour,
    topItems,
    ordersByType,
    ordersByPayment,
    ordersByStatus,
    cancelledOrders,
    cancelled: filtered.filter((o) => o.status === 'cancelled').length,
  };
};
