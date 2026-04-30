/**
 * @typedef {Object} DailyMetrics
 * @property {number} totalRevenue - Total revenue for the day (non-cancelled orders)
 * @property {number} orderCount - Number of completed/non-cancelled orders
 * @property {number} avgOrderValue - Average revenue per order
 * @property {number} targetRevenue - Daily revenue target (e.g., ₱50,000)
 * @property {number} percentOfTarget - Percentage of target achieved (0-150+)
 * @property {'up'|'neutral'|'down'} trending - Sales trend indicator
 */

/**
 * @typedef {Object} HourlyTrend
 * @property {number} hour - Hour of day (0-23)
 * @property {string} label - Formatted hour label (e.g., "09:00")
 * @property {number} revenue - Total revenue for that hour
 * @property {number} orderCount - Number of orders in that hour
 * @property {number} avgOrderValue - Average order value for that hour
 */

/**
 * @typedef {Object} FoodItem
 * @property {string} id - Menu item ID
 * @property {string} name - Item name
 * @property {number} quantity - Total quantity sold
 * @property {number} revenue - Total revenue from item
 * @property {number} costOfGoods - Unit cost of goods
 * @property {number} profit - Total profit (revenue - cost*quantity)
 * @property {number} profitMargin - Profit margin percentage
 * @property {number} orders - Number of orders containing this item
 * @property {number} avgPrice - Average selling price
 */

/**
 * @typedef {Object} FoodPerformance
 * @property {FoodItem[]} topItems - Top 10 selling items by revenue
 * @property {FoodItem[]} bottomItems - Bottom 5 items (slow movers)
 * @property {FoodItem[]} mostProfitable - Top 5 items by profit amount
 * @property {FoodItem[]} allItems - All items with metrics, sorted by revenue
 */

/**
 * @typedef {Object} CashierMetric
 * @property {string} employeeId - Employee ID or name
 * @property {number} ordersProcessed - Total orders handled
 * @property {number} totalRevenue - Total revenue processed
 * @property {number} completedOrders - Successfully completed orders
 * @property {number} refundedOrders - Number of refunded orders
 * @property {number} cancelledOrders - Number of cancelled orders
 * @property {number} refundAmount - Total amount refunded
 * @property {number} cashOrders - Orders paid with cash
 * @property {number} cardOrders - Orders paid with card
 * @property {number} completionRate - Percentage of orders completed successfully
 * @property {number} refundRate - Percentage of orders refunded
 * @property {number} avgOrderValue - Average order value handled
 * @property {number} cashPercentage - Percentage of cash vs card transactions
 */

/**
 * @typedef {Object} Alert
 * @property {'REVENUE_CRITICAL'|'REVENUE_WARNING'|'REVENUE_EXCELLENT'|'LOW_STOCK'|'OUT_OF_STOCK'|'REFUND_ABUSE'|'HIGH_DISCOUNT'|'ZERO_TOTAL'|'DUPLICATE_ORDER'|'CASH_DISCREPANCY'} type - Alert type
 * @property {'critical'|'warning'|'info'} severity - Alert severity level
 * @property {string} message - Human-readable alert message
 * @property {Object} [details] - Additional details about the alert
 * @property {boolean} actionable - Whether the alert requires immediate action
 */

/**
 * @typedef {Object} Anomaly
 * @property {'REFUND_ABUSE'|'HIGH_DISCOUNT'|'ZERO_TOTAL'|'DUPLICATE_ORDER'|'CASH_DISCREPANCY'} type - Anomaly type
 * @property {'critical'|'warning'|'info'} severity - Severity level
 * @property {string} message - Description of the anomaly
 * @property {Object} details - Specific data related to the anomaly
 */

/**
 * @typedef {Object} RevenueForecast
 * @property {number} currentRevenue - Revenue earned so far today
 * @property {number} projectedRevenue - Projected revenue if current pace continues
 * @property {number} targetRevenue - Daily revenue target
 * @property {boolean} willMakeTarget - Whether projection meets target
 * @property {number} projectionPercent - Projected percentage of target
 */

/**
 * @typedef {Object} ItemPairing
 * @property {string[]} pair - Two menu item IDs that are bought together
 * @property {number} frequency - How many times these items were bought in same order
 */

/**
 * @typedef {Object} Analytics
 * @property {DailyMetrics} metrics - Daily performance metrics
 * @property {HourlyTrend[]} hourlyTrends - Hourly breakdown of sales
 * @property {FoodPerformance} foodData - Food item performance analysis
 * @property {CashierMetric[]} cashierData - Per-cashier performance metrics
 * @property {Anomaly[]} anomalies - Detected anomalies and fraud patterns
 * @property {Alert[]} alertsList - Consolidated alerts for display
 * @property {RevenueForecast|null} forecast - Revenue projection
 * @property {ItemPairing[]} pairings - Items frequently bought together
 */

export {};
