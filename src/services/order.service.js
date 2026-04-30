import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  runTransaction,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import logger from '@/utils/logger';
import { softDelete } from './softDelete.service';
import { logActivity } from './activity.service';

const ordersRef = collection(db, COLLECTIONS.ORDERS);
const orderItemsRef = collection(db, COLLECTIONS.ORDER_ITEMS);
const menuItemsRef = collection(db, COLLECTIONS.MENU_ITEMS);

// --- Sequential Order Number ---

const counterRef = doc(db, 'system_counters', 'orders');

const getNextOrderNumber = async () => {
  const nextNumber = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let current = 0;
    if (counterSnap.exists()) {
      current = counterSnap.data().current || 0;
    }
    const next = current + 1;
    transaction.set(counterRef, { current: next }, { merge: true });
    return next;
  });
  return String(nextNumber);
};

// --- Create ---

export const createOrder = async (restaurantId, orderData, items) => {
  let resolvedRestaurantId = restaurantId;
  let resolvedOrderData = orderData;
  let resolvedItems = items;

  if (typeof restaurantId === 'object' && !Array.isArray(restaurantId)) {
    resolvedOrderData = restaurantId;
    resolvedItems = orderData;
    resolvedRestaurantId = restaurantId.restaurantId || '';
  }

  if (!Array.isArray(resolvedItems)) throw new Error('items must be an array');

  const batch = writeBatch(db);
  const orderNumber = await getNextOrderNumber();
  const affectedItemIds = [];

  // Order document
  const orderRef = doc(ordersRef);
  batch.set(orderRef, {
    restaurantId: resolvedRestaurantId || null,
    orderNumber,
    employeeId: resolvedOrderData.employeeId || '',
    customerName: resolvedOrderData.customerName || '',
    customerPhone: resolvedOrderData.customerPhone || '',
    orderType: resolvedOrderData.orderType || 'dine-in',
    tableNumber: resolvedOrderData.tableNumber || '',
    deliveryAddress: resolvedOrderData.deliveryAddress || '',
    deliveryPersonId: null,
    subtotal: resolvedOrderData.subtotal || 0,
    tax: resolvedOrderData.tax || 0,
    discount: resolvedOrderData.discount || 0,
    total: resolvedOrderData.total || 0,
    paymentMethod: resolvedOrderData.paymentMethod || 'cash',
    paymentStatus: resolvedOrderData.paymentStatus || 'pending',
    status: 'pending',
    notes: resolvedOrderData.notes || '',
    coupon: resolvedOrderData.coupon || null,
    items: resolvedItems.map((it) => ({
      menuItemId: it.menuItemId,
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.unitPrice * it.quantity,
      specialInstructions: it.specialInstructions || '',
      categoryId: it.categoryId || '',
      categoryName: it.categoryName || '',
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });

  // Order items + stock decrement
  resolvedItems.forEach((item) => {
    const itemRef = doc(orderItemsRef);
    batch.set(itemRef, {
      restaurantId: resolvedRestaurantId || null,
      orderId: orderRef.id,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * item.quantity,
      specialInstructions: item.specialInstructions || '',
      categoryId: item.categoryId || '',
      categoryName: item.categoryName || '',
      createdAt: serverTimestamp(),
      deletedAt: null,
    });

    // Decrement stock
    if (item.menuItemId) {
      const menuRef = doc(menuItemsRef, item.menuItemId);
      batch.update(menuRef, {
        stockLevel: increment(-(Number(item.quantity) || 0)),
        updatedAt: serverTimestamp(),
      });
      affectedItemIds.push(item.menuItemId);
    }
  });

  await batch.commit();

  // Fire-and-forget: auto-disable out-of-stock items in background
  const uniqueIds = [...new Set(affectedItemIds)];
  if (uniqueIds.length > 0) {
    Promise.all(uniqueIds.map((id) => getDoc(doc(menuItemsRef, id))))
      .then((snaps) => {
        const postBatch = writeBatch(db);
        let needsCommit = false;
        snaps.forEach((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if ((data.stockLevel || 0) <= 0 && data.isAvailable !== false) {
              postBatch.update(doc(menuItemsRef, snap.id), {
                isAvailable: false,
                updatedAt: serverTimestamp(),
              });
              needsCommit = true;
            }
          }
        });
        if (needsCommit) return postBatch.commit();
      })
      .catch((err) => logger.warn('Post-order stock check failed (non-critical):', err));
  }

  logger.info('Order created:', orderNumber);
  return { id: orderRef.id, orderNumber };
};

// --- Public order (no stock decrement) ---

export const createPublicOrder = async (orderData) => {
  const orderNumber = await getNextOrderNumber();
  const docRef = await addDoc(ordersRef, {
    restaurantId: orderData.restaurantId || null,
    orderNumber,
    employeeId: 'public',
    customerName: orderData.customerName || '',
    customerPhone: orderData.customerPhone || '',
    orderType: orderData.orderType || 'takeaway',
    deliveryAddress: orderData.deliveryAddress || '',
    subtotal: orderData.subtotal || 0,
    tax: orderData.tax || 0,
    discount: orderData.discount || 0,
    total: orderData.total || 0,
    paymentMethod: orderData.paymentMethod || 'cash',
    paymentStatus: 'pending',
    status: 'pending',
    notes: orderData.notes || '',
    coupon: orderData.coupon || null,
    items: orderData.items || [],
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, orderNumber, total: orderData.total, status: 'pending' };
};

// --- Read ---

export const getOrderById = async (orderId) => {
  const snap = await getDoc(doc(ordersRef, orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// --- Update ---

export const updateOrder = async (orderId, data) => {
  await updateDoc(doc(ordersRef, orderId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const updateOrderStatus = async (orderId, status) => {
  const update = { status, updatedAt: serverTimestamp() };

  if (status === 'served' || status === 'completed') {
    update.completedAt = serverTimestamp();
  } else if (status === 'delivered') {
    update.deliveredAt = serverTimestamp();
  } else if (status === 'out_for_delivery') {
    update.outForDeliveryAt = serverTimestamp();
  }

  // Stock restoration on cancellation
  if (status === 'cancelled') {
    const orderSnap = await getDoc(doc(ordersRef, orderId));
    if (orderSnap.exists()) {
      const order = orderSnap.data();
      const prevStatus = order.status;
      const noRestoreFrom = ['served', 'completed', 'refunded'];
      if (!noRestoreFrom.includes(prevStatus) && order.items?.length) {
        const batch = writeBatch(db);
        order.items.forEach((item) => {
          if (item.menuItemId) {
            batch.update(doc(menuItemsRef, item.menuItemId), {
              stockLevel: increment(Number(item.quantity) || 0),
              isAvailable: true,
              updatedAt: serverTimestamp(),
            });
          }
        });
        await batch.commit();
      }
    }
  }

  await updateDoc(doc(ordersRef, orderId), update);
};

export const updatePaymentStatus = async (orderId, paymentStatus) => {
  await updateDoc(doc(ordersRef, orderId), {
    paymentStatus,
    updatedAt: serverTimestamp(),
  });
};

export const removeOrderItem = async (orderId, itemIndex) => {
  const orderSnap = await getDoc(doc(ordersRef, orderId));
  if (!orderSnap.exists()) {
    throw new Error('Order not found');
  }

  const order = orderSnap.data();
  const newItems = order.items.filter((_, i) => i !== itemIndex);

  if (newItems.length === 0) {
    throw new Error('Cannot remove the last item from an order');
  }

  // Calculate new totals based on remaining items
  const removedItem = order.items[itemIndex];
  const newSubtotal = order.subtotal - (removedItem.totalPrice || removedItem.unitPrice * removedItem.quantity);

  // Proportionally reduce discount (or keep it, based on your business logic)
  // Here we keep the discount percentage consistent
  let newDiscount = order.discount;
  let newTotal = newSubtotal - newDiscount;
  if (newTotal < 0) newTotal = 0;

  // Restore stock for the removed item
  if (removedItem.menuItemId && order.status !== 'served' && order.status !== 'completed') {
    await updateDoc(doc(menuItemsRef, removedItem.menuItemId), {
      stockLevel: increment(Number(removedItem.quantity) || 0),
      updatedAt: serverTimestamp(),
    });
  }

  // Update order with new items and totals
  await updateDoc(doc(ordersRef, orderId), {
    items: newItems,
    subtotal: Math.max(0, newSubtotal),
    total: Math.max(0, newTotal),
    updatedAt: serverTimestamp(),
  });

  logger.info(`Item ${itemIndex} removed from order ${orderId}`);
  return { newItems, newSubtotal, newTotal };
};

// --- Delete (soft delete) ---

export const deleteOrder = async (restaurantId, orderId, deletedBy, deletionReason = '') => {
  try {
    // Get order before deletion for audit trail
    const orderSnap = await getDoc(doc(ordersRef, orderId));
    const order = orderSnap.exists() ? orderSnap.data() : null;

    // Perform soft delete
    await softDelete(db, COLLECTIONS.ORDERS, orderId, deletedBy, deletionReason, restaurantId);

    // Log activity
    await logActivity(restaurantId, 'DELETE', {
      userId: deletedBy,
      entityType: 'order',
      entityId: orderId,
      details: order ? {
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        customerName: order.customerName
      } : {},
      status: 'success',
    });

    logger.info(`Order ${orderId} deleted by ${deletedBy}`);
  } catch (err) {
    // Log failed deletion attempt
    await logActivity(restaurantId, 'DELETE', {
      userId: deletedBy,
      entityType: 'order',
      entityId: orderId,
      status: 'failure',
      error: err.message,
    }).catch((logErr) => logger.warn('Failed to log delete error:', logErr));

    throw err;
  }
};

export const restoreOrder = async (orderId, restoredBy) => {
  const docRef = doc(ordersRef, orderId);
  await updateDoc(docRef, {
    deletedAt: null,
    restoredAt: serverTimestamp(),
    restoredBy,
  });
  logger.info(`Order ${orderId} restored by ${restoredBy}`);
};

// --- Real-time ---

export const subscribeToOrders = (restaurantId, callback, daysBack = 30) => {
  let resolvedRestaurantId = restaurantId;
  let resolvedCallback = callback;
  let resolvedDaysBack = daysBack;

  if (typeof restaurantId === 'function') {
    resolvedCallback = restaurantId;
    resolvedDaysBack = typeof callback === 'number' ? callback : 30;
    resolvedRestaurantId = '';
  }

  if (typeof resolvedCallback !== 'function') {
    throw new Error('callback is required');
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - resolvedDaysBack);
  const q = resolvedRestaurantId
    ? query(ordersRef, where('restaurantId', '==', resolvedRestaurantId))
    : ordersRef;

  console.log('[subscribeToOrders] Setting up subscription, restaurantId:', resolvedRestaurantId || '(all)', 'daysBack:', resolvedDaysBack);

  return onSnapshot(q, (snapshot) => {
    console.log('[subscribeToOrders] Raw docs:', snapshot.docs.length, 'restaurantId filter:', resolvedRestaurantId || '(none)');
    const orders = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((order) => !order.deletedAt)
      .filter((order) => {
        const createdAt = order.createdAt?.toDate?.();
        // Allow orders with pending serverTimestamp or within cutoff
        if (!createdAt) return true;
        return createdAt >= cutoff;
      })
      .sort((a, b) => {
        const at = a.createdAt?.toDate?.() || new Date();
        const bt = b.createdAt?.toDate?.() || new Date();
        return bt - at;
      });
    console.log('[subscribeToOrders] Filtered orders:', orders.length);
    resolvedCallback(orders);
  }, (error) => {
    console.error('[subscribeToOrders] Firestore error:', error);
    // Still call back with empty array so UI doesn't hang on loading
    resolvedCallback([]);
  });
};

/**
 * Subscribe to deleted orders (for recovery/archive view)
 */
export const subscribeToDeletedOrders = (restaurantId, callback, daysBack = 90) => {
  if (typeof callback !== 'function') throw new Error('callback is required');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const q = restaurantId
    ? query(ordersRef, where('restaurantId', '==', restaurantId))
    : ordersRef;
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((order) => {
        const deletedAt = order.deletedAt?.toDate?.();
        return deletedAt && deletedAt >= cutoff;
      })
      .sort((a, b) => {
        const at = a.deletedAt?.toDate?.() || new Date(0);
        const bt = b.deletedAt?.toDate?.() || new Date(0);
        return bt - at;
      });
    callback(orders);
  });
};

/**
 * Subscribe to a single order by document ID (real-time).
 * Returns an unsubscribe function.
 */
export const subscribeToOrderById = (orderId, callback) => {
  if (!orderId || typeof callback !== 'function') throw new Error('orderId and callback are required');
  return onSnapshot(doc(ordersRef, orderId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    else callback(null);
  });
};

/**
 * Look up an order by its human-readable order number.
 */
export const getOrderByNumber = async (orderNumber) => {
  const q = query(ordersRef, where('orderNumber', '==', String(orderNumber)));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
};
