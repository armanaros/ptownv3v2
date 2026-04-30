/**
 * Analytics Service - AI-powered business intelligence for P-Town POS
 * Analyzes orders, products, and cashier performance to detect trends and anomalies
 */

import { formatCurrency } from '@/utils/formatters';

/**
 * Calculate daily metrics (revenue, order count, etc.)
 */
export const calculateDailyMetrics = (orders = [], targetRevenue = 50000) => {
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const completedOrders = orders.filter((o) => o.status !== 'cancelled').length;
  const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
  const percentOfTarget = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;

  return {
    totalRevenue,
    orderCount: completedOrders,
    avgOrderValue,
    targetRevenue,
    percentOfTarget,
    trending: totalRevenue >= targetRevenue * 0.75 ? 'up' : totalRevenue >= targetRevenue * 0.5 ? 'neutral' : 'down',
  };
};

/**
 * Calculate hourly sales trends
 */
export const calculateHourlyTrends = (orders = []) => {
  const hourlyData = {};

  // Initialize 24 hours
  for (let h = 0; h < 24; h++) {
    hourlyData[h] = { revenue: 0, orderCount: 0 };
  }

  // Aggregate orders by hour
  orders.forEach((order) => {
    if (order.status === 'cancelled' || !order.createdAt) return;

    const date = order.createdAt?.toDate?.() || new Date(order.createdAt);
    const hour = date.getHours();
    const amount = order.total || 0;

    hourlyData[hour].revenue += amount;
    hourlyData[hour].orderCount += 1;
  });

  // Convert to array and calculate avg order value
  const trends = Object.entries(hourlyData)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      revenue: data.revenue,
      orderCount: data.orderCount,
      avgOrderValue: data.orderCount > 0 ? data.revenue / data.orderCount : 0,
      label: `${String(hour).padStart(2, '0')}:00`,
    }))
    .filter((h) => h.orderCount > 0 || h.hour === 0); // Show hours with data

  return trends;
};

/**
 * Analyze food/product performance
 */
export const analyzeFoodPerformance = (orders = [], menuItems = []) => {
  const itemMap = new Map(menuItems.map((m) => [m.id, m]));
  const foodData = {};

  orders.forEach((order) => {
    if (order.status === 'cancelled' || !order.items) return;

    order.items.forEach((item) => {
      if (!foodData[item.menuItemId]) {
        const menuItem = itemMap.get(item.menuItemId);
        foodData[item.menuItemId] = {
          id: item.menuItemId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          costOfGoods: menuItem?.costOfGoods || 0,
          orders: 0,
        };
      }

      foodData[item.menuItemId].quantity += item.quantity || 0;
      foodData[item.menuItemId].revenue += item.totalPrice || 0;
      foodData[item.menuItemId].orders += 1;
    });
  });

  // Calculate profitability and sort
  let items = Object.values(foodData)
    .map((item) => ({
      ...item,
      profit: item.revenue - item.costOfGoods * item.quantity,
      profitMargin: item.revenue > 0 ? ((item.revenue - item.costOfGoods * item.quantity) / item.revenue) * 100 : 0,
      avgPrice: item.quantity > 0 ? item.revenue / item.quantity : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    topItems: items.slice(0, 10),
    bottomItems: items.slice(-5).reverse(),
    mostProfitable: items.sort((a, b) => b.profit - a.profit).slice(0, 5),
    allItems: items,
  };
};

/**
 * Analyze cashier performance
 */
export const analyzeCashierPerformance = (orders = []) => {
  const cashierData = {};

  orders.forEach((order) => {
    const empId = order.employeeId || 'Unknown';

    if (!cashierData[empId]) {
      cashierData[empId] = {
        employeeId: empId,
        ordersProcessed: 0,
        totalRevenue: 0,
        cashOrders: 0,
        cardOrders: 0,
        completedOrders: 0,
        refundedOrders: 0,
        cancelledOrders: 0,
        refundAmount: 0,
      };
    }

    const cashier = cashierData[empId];
    cashier.ordersProcessed += 1;
    cashier.totalRevenue += order.total || 0;

    if (order.paymentMethod === 'cash') cashier.cashOrders += 1;
    if (order.paymentMethod === 'card') cashier.cardOrders += 1;
    if (order.status === 'completed' || order.status === 'served') cashier.completedOrders += 1;
    if (order.paymentStatus === 'refunded') {
      cashier.refundedOrders += 1;
      cashier.refundAmount += order.total || 0;
    }
    if (order.status === 'cancelled') cashier.cancelledOrders += 1;
  });

  // Calculate metrics
  return Object.values(cashierData)
    .map((c) => ({
      ...c,
      refundRate: c.ordersProcessed > 0 ? (c.refundedOrders / c.ordersProcessed) * 100 : 0,
      completionRate: c.ordersProcessed > 0 ? (c.completedOrders / c.ordersProcessed) * 100 : 0,
      avgOrderValue: c.ordersProcessed > 0 ? c.totalRevenue / c.ordersProcessed : 0,
      cashPercentage: c.ordersProcessed > 0 ? (c.cashOrders / c.ordersProcessed) * 100 : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
};

/**
 * Detect anomalies and fraud patterns
 */
export const detectAnomalies = (orders = [], cashClose = null) => {
  const anomalies = [];

  // Check for refund abuse
  const refundCounts = {};
  const refundTimes = {};

  orders.forEach((order) => {
    if (order.paymentStatus === 'refunded') {
      const empId = order.employeeId || 'Unknown';
      refundCounts[empId] = (refundCounts[empId] || 0) + 1;

      if (!refundTimes[empId]) refundTimes[empId] = [];
      if (order.createdAt) {
        refundTimes[empId].push(order.createdAt?.toDate?.() || new Date(order.createdAt));
      }
    }
  });

  // Detect multiple refunds in short time
  Object.entries(refundTimes).forEach(([empId, times]) => {
    if (times.length < 2) return;
    const sorted = times.sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = (sorted[i + 1] - sorted[i]) / (1000 * 60); // minutes
      if (diff < 60 && i + 2 <= sorted.length) {
        // 3+ refunds in 1 hour
        if (sorted.slice(i, i + 3).length === 3) {
          anomalies.push({
            type: 'REFUND_ABUSE',
            severity: 'critical',
            message: `Cashier ${empId} has ${refundCounts[empId]} refunds (potential abuse pattern)`,
            details: { employeeId: empId, count: refundCounts[empId] },
          });
          break;
        }
      }
    }
  });

  // Check for extremely high discounts
  orders.forEach((order) => {
    if (!order.items) return;
    if (order.discount && order.subtotal > 0 && order.discount > order.subtotal * 0.5) {
      anomalies.push({
        type: 'HIGH_DISCOUNT',
        severity: 'warning',
        message: `Order ${order.orderNumber || 'N/A'} has unusually high discount: ${((order.discount / order.subtotal) * 100).toFixed(0)}%`,
        details: { orderNumber: order.orderNumber, discountPercent: (order.discount / order.subtotal) * 100 },
      });
    }
  });

  // Check for zero/negative totals
  orders.forEach((order) => {
    if (order.total <= 0 && order.status !== 'cancelled') {
      anomalies.push({
        type: 'ZERO_TOTAL',
        severity: 'critical',
        message: `Order ${order.orderNumber || 'N/A'} has zero or negative total`,
        details: { orderNumber: order.orderNumber, total: order.total },
      });
    }
  });

  // Check for duplicate orders (same items, same customer, within 5 min)
  const orderSignatures = {};
  orders.forEach((order) => {
    const sig = `${order.customerName || 'guest'}_${order.items?.map((i) => i.menuItemId).sort().join(',')}`;
    if (!orderSignatures[sig]) orderSignatures[sig] = [];
    orderSignatures[sig].push(order);
  });

  Object.values(orderSignatures).forEach((groupOrders) => {
    if (groupOrders.length < 2) return;
    const sorted = groupOrders.sort((a, b) => {
      const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return aDate - bDate;
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const aDate = sorted[i].createdAt?.toDate?.() || new Date(sorted[i].createdAt);
      const bDate = sorted[i + 1].createdAt?.toDate?.() || new Date(sorted[i + 1].createdAt);
      const diffMin = (bDate - aDate) / (1000 * 60);

      if (diffMin < 5) {
        anomalies.push({
          type: 'DUPLICATE_ORDER',
          severity: 'warning',
          message: `Duplicate order detected: ${sorted[i].orderNumber} and ${sorted[i + 1].orderNumber}`,
          details: { orders: [sorted[i].orderNumber, sorted[i + 1].orderNumber] },
        });
      }
    }
  });

  // Check cash discrepancy
  if (cashClose && cashClose.discrepancy) {
    const discrepancyAmount = Math.abs(cashClose.discrepancy);
    if (discrepancyAmount > 500) {
      anomalies.push({
        type: 'CASH_DISCREPANCY',
        severity: discrepancyAmount > 2000 ? 'critical' : 'warning',
        message: `Large cash discrepancy: ${formatCurrency(discrepancyAmount)} (${cashClose.discrepancy > 0 ? 'overage' : 'shortage'})`,
        details: { discrepancy: cashClose.discrepancy, expected: cashClose.expectedCash, actual: cashClose.actualCash },
      });
    }
  }

  // Check for invalid payment status transitions
  orders.forEach((order) => {
    const invalidPaidStates = ['cancelled', 'pending'];
    if (invalidPaidStates.includes(order.status) && order.paymentStatus === 'paid') {
      anomalies.push({
        type: 'INVALID_PAYMENT_STATUS',
        severity: 'warning',
        message: `Order ${order.orderNumber} marked as paid but status is ${order.status}`,
        details: { orderNumber: order.orderNumber, orderStatus: order.status, paymentStatus: 'paid' },
      });
    }

    // Refunded without completion
    if (order.status === 'pending' && order.paymentStatus === 'refunded') {
      anomalies.push({
        type: 'REFUND_WITHOUT_PAYMENT',
        severity: 'warning',
        message: `Order ${order.orderNumber} marked refunded but was never completed`,
        details: { orderNumber: order.orderNumber, orderStatus: order.status },
      });
    }
  });

  return anomalies.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

/**
 * Generate smart alerts based on metrics and anomalies
 */
export const generateAlerts = (metrics = {}, anomalies = [], menuItems = []) => {
  const alerts = [];

  // Revenue alerts
  if (metrics.percentOfTarget <= 50) {
    alerts.push({
      type: 'REVENUE_CRITICAL',
      severity: 'critical',
      message: `Revenue critically low: ${metrics.percentOfTarget.toFixed(0)}% of daily target. Current: ${formatCurrency(metrics.totalRevenue)} of ${formatCurrency(metrics.targetRevenue)}`,
      actionable: true,
    });
  } else if (metrics.percentOfTarget <= 75) {
    alerts.push({
      type: 'REVENUE_WARNING',
      severity: 'warning',
      message: `Behind target: ${metrics.percentOfTarget.toFixed(0)}% of goal. Need ${formatCurrency(metrics.targetRevenue - metrics.totalRevenue)} more.`,
      actionable: true,
    });
  }

  // High sales alert (positive)
  if (metrics.percentOfTarget >= 110) {
    alerts.push({
      type: 'REVENUE_EXCELLENT',
      severity: 'info',
      message: `Excellent sales day! ${metrics.percentOfTarget.toFixed(0)}% of target (${formatCurrency(metrics.totalRevenue)})`,
      actionable: false,
    });
  }

  // Stock alerts
  menuItems.forEach((item) => {
    if (item.stockLevel <= (item.lowStockThreshold || 5) && item.stockLevel > 0) {
      alerts.push({
        type: 'LOW_STOCK',
        severity: 'warning',
        message: `${item.name} running low: ${item.stockLevel} units left`,
        actionable: true,
      });
    } else if (item.stockLevel <= 0) {
      alerts.push({
        type: 'OUT_OF_STOCK',
        severity: 'critical',
        message: `${item.name} is OUT OF STOCK`,
        actionable: true,
      });
    }
  });

  // Add anomalies as alerts
  anomalies.forEach((anom) => {
    alerts.push({
      type: anom.type,
      severity: anom.severity,
      message: anom.message,
      details: anom.details,
      actionable: true,
    });
  });

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

/**
 * Get revenue forecast based on current pace
 */
export const calculateRevenueForecast = (orders = [], targetRevenue = 50000) => {
  if (orders.length === 0) return null;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const secondsInDay = 24 * 60 * 60 * 1000;
  const secondsElapsed = now - dayStart;
  const percentDayComplete = secondsElapsed / secondsInDay;

  const currentRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const projectedRevenue = percentDayComplete > 0 ? currentRevenue / percentDayComplete : 0;
  const willMakeTarget = projectedRevenue >= targetRevenue;

  // Calculate hourly run rate
  const hoursElapsed = Math.max(1, (now.getHours() * 60 + now.getMinutes()) / 60);
  const hourlyRunRate = currentRevenue / hoursElapsed;
  const hoursRemaining = Math.max(0, 24 - hoursElapsed);
  const additionalRevenuePotential = hourlyRunRate * hoursRemaining;

  // Best/worst case scenarios (±20%)
  const optimisticProjection = projectedRevenue * 1.2;
  const pessimisticProjection = projectedRevenue * 0.8;

  // Weekly projection (based on daily average)
  const weeklyProjection = projectedRevenue * 7;
  const monthlyProjection = projectedRevenue * 30;

  return {
    currentRevenue,
    projectedRevenue,
    targetRevenue,
    willMakeTarget,
    projectionPercent: (projectedRevenue / targetRevenue) * 100,
    hourlyRunRate,
    hoursRemaining,
    additionalRevenuePotential,
    optimisticProjection,
    pessimisticProjection,
    weeklyProjection,
    monthlyProjection,
  };
};

/**
 * Get items often bought together (pairing analysis)
 */
export const analyzePairings = (orders = []) => {
  const pairings = {};

  orders.forEach((order) => {
    if (!order.items || order.items.length < 2) return;

    const itemIds = order.items.map((i) => i.menuItemId).sort();
    for (let i = 0; i < itemIds.length; i++) {
      for (let j = i + 1; j < itemIds.length; j++) {
        const pair = `${itemIds[i]}|${itemIds[j]}`;
        pairings[pair] = (pairings[pair] || 0) + 1;
      }
    }
  });

  return Object.entries(pairings)
    .map(([pair, count]) => ({
      pair: pair.split('|'),
      frequency: count,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
};

/**
 * Generate smart AI recommendations based on sales data
 */
export const generateSmartRecommendations = (orders = [], menuItems = [], metrics = {}, foodData = {}) => {
  const recommendations = [];

  // 1. Revenue-based recommendations
  if (metrics.percentOfTarget < 50) {
    recommendations.push({
      type: 'revenue',
      priority: 'high',
      icon: '💰',
      title: 'Boost Revenue',
      message: `Revenue is at ${metrics.percentOfTarget?.toFixed(0) || 0}% of target. Consider running a flash promotion or upselling high-margin items.`,
      action: 'Create Promotion',
    });
  } else if (metrics.percentOfTarget >= 100) {
    recommendations.push({
      type: 'revenue',
      priority: 'success',
      icon: '🎉',
      title: 'Target Achieved!',
      message: `Congratulations! You've hit ${metrics.percentOfTarget?.toFixed(0)}% of your daily target. Keep the momentum going!`,
      action: null,
    });
  }

  // 2. Low-performing items recommendations
  if (foodData.bottomItems?.length > 0) {
    const worstItem = foodData.bottomItems[0];
    if (worstItem.quantity <= 2) {
      recommendations.push({
        type: 'menu',
        priority: 'medium',
        icon: '📉',
        title: 'Menu Optimization',
        message: `"${worstItem.name}" has very low sales (${worstItem.quantity} sold). Consider bundling it with popular items or adjusting pricing.`,
        action: 'Edit Menu Item',
      });
    }
  }

  // 3. High-margin opportunities
  if (foodData.topItems?.length > 0) {
    const topItem = foodData.topItems[0];
    if (topItem.profitMargin > 50) {
      recommendations.push({
        type: 'profit',
        priority: 'medium',
        icon: '📈',
        title: 'Maximize Profit',
        message: `"${topItem.name}" has a ${topItem.profitMargin?.toFixed(0)}% margin! Train staff to upsell this item to boost profits.`,
        action: 'View Item',
      });
    }
  }

  // 4. Order volume recommendations
  if (metrics.orderCount > 50) {
    recommendations.push({
      type: 'operations',
      priority: 'info',
      icon: '🔥',
      title: 'High Volume Day',
      message: `You've processed ${metrics.orderCount} orders! Consider adding extra staff during peak hours.`,
      action: null,
    });
  } else if (metrics.orderCount < 10 && new Date().getHours() > 12) {
    recommendations.push({
      type: 'marketing',
      priority: 'medium',
      icon: '📢',
      title: 'Drive Traffic',
      message: `Only ${metrics.orderCount} orders so far. Consider social media posts or SMS promotions to drive foot traffic.`,
      action: 'Send Promotion',
    });
  }

  // 5. Average order value insights
  if (metrics.avgOrderValue > 0 && metrics.avgOrderValue < 200) {
    recommendations.push({
      type: 'upsell',
      priority: 'medium',
      icon: '🛒',
      title: 'Increase Basket Size',
      message: `Average order value is ₱${metrics.avgOrderValue?.toFixed(0)}. Train staff on combo deals and add-ons to increase this.`,
      action: 'View Combos',
    });
  }

  // 6. Peak hour staffing
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour >= 11 && currentHour <= 13) {
    recommendations.push({
      type: 'staffing',
      priority: 'info',
      icon: '⏰',
      title: 'Lunch Rush Reminder',
      message: 'Peak lunch hours are active. Ensure adequate staffing and prep ahead for high-volume orders.',
      action: null,
    });
  } else if (currentHour >= 18 && currentHour <= 20) {
    recommendations.push({
      type: 'staffing',
      priority: 'info',
      icon: '⏰',
      title: 'Dinner Rush Active',
      message: 'Peak dinner hours are starting. Monitor wait times and kitchen throughput.',
      action: null,
    });
  }

  return recommendations.slice(0, 6); // Limit to 6 recommendations
};
