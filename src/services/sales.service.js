import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import { logActivity } from './activity.service';

const salesRef = collection(db, COLLECTIONS.SALES_TRANSACTIONS);
const counterRef = doc(db, 'system_counters', 'sales');

// ─── Sequential Transaction Number ───────────────────────────────────────────

const getNextTransactionNumber = async () => {
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists() ? snap.data().current || 0 : 0) + 1;
    tx.set(counterRef, { current: next }, { merge: true });
    return String(next).padStart(6, '0');
  });
};

// ─── Create Sale ──────────────────────────────────────────────────────────────

export const createSale = async (data, items, userId, requireApproval = false, assignedManagerId = '', submittedByName = '') => {
  const transactionNumber = await getNextTransactionNumber();

  const arRef = collection(db, COLLECTIONS.ACCOUNTS_RECEIVABLE);

  const saleRef = await addDoc(salesRef, {
    transactionNumber,
    customerName:      data.customerName?.trim() || '',
    customerPhone:     data.customerPhone?.trim() || '',
    customerAddress:   data.customerAddress?.trim() || '',
    orderType:         data.orderType || 'walk_in',
    paymentMethod:     data.paymentMethod || 'cash',
    paymentStatus:     data.paymentMethod === 'credit_term' ? 'pending' : 'paid',
    status:            requireApproval ? 'pending_approval' : 'completed',
    submittedBy:       userId || '',
    submittedByName:   submittedByName || '',
    assignedManagerId: assignedManagerId || '',
    items:           items.map((i) => ({
      productId:   i.productId || '',
      productName: i.productName || '',
      unit:        i.unit || 'pc',
      quantity:    Number(i.quantity) || 0,
      unitPrice:   Number(i.unitPrice) || 0,
      totalPrice:  Number(i.quantity) * Number(i.unitPrice),
    })),
    subtotal:   Number(data.subtotal) || 0,
    discount:   Number(data.discount) || 0,
    total:      Number(data.total) || 0,
    notes:      data.notes?.trim() || '',
    createdBy:  userId || '',
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });

  // Auto-create Accounts Receivable record for credit-term sales
  if (data.paymentMethod === 'credit_term') {
    await addDoc(arRef, {
      customerName:         data.customerName?.trim() || '',
      customerPhone:        data.customerPhone?.trim() || '',
      customerAddress:      data.customerAddress?.trim() || '',
      invoiceNumber:        transactionNumber,
      amount:               Number(data.total) || 0,
      amountPaid:           0,
      balance:              Number(data.total) || 0,
      dueDate:              data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : null,
      paymentMethod:        'credit_term',
      status:               'current',
      notes:                data.notes?.trim() || '',
      saleId:               saleRef.id,
      installmentTotal:     data.installmentTotal ? Number(data.installmentTotal) : null,
      installmentAmount:    data.installmentAmount ? Number(data.installmentAmount) : null,
      installmentFrequency: data.installmentTotal  ? data.installmentFrequency || 'monthly' : null,
      firstInstallmentDue:  data.firstInstallmentDue && data.installmentTotal
        ? Timestamp.fromDate(new Date(data.firstInstallmentDue)) : null,
      createdBy:            userId || '',
      createdAt:            serverTimestamp(),
      updatedAt:            serverTimestamp(),
    });
  }

  await logActivity({
    type: 'sale_created',
    description: requireApproval
      ? `Sale #${transactionNumber} submitted by rep — awaiting approval`
      : `Sale #${transactionNumber} created for ${data.customerName || 'Walk-in'}`,
    userId,
    meta: { saleId: saleRef.id, transactionNumber, total: data.total },
  });

  return { id: saleRef.id, transactionNumber };
};

// ─── Approve Sale ─────────────────────────────────────────────────────────────────────────────────

export const approveSale = async (saleId, userId, notes = '') => {
  await updateDoc(doc(salesRef, saleId), {
    status:        'approved',
    approvedBy:    userId,
    approvedAt:    serverTimestamp(),
    approvalNotes: notes.trim(),
    updatedAt:     serverTimestamp(),
  });
  await logActivity({
    type: 'sale_approved',
    description: `Sale approved${notes ? ': ' + notes : ''}`,
    userId,
    meta: { saleId, notes },
  });
};

// ─── Reject Sale ──────────────────────────────────────────────────────────────────────────────────

export const rejectSale = async (saleId, userId, reason) => {
  // Fetch sale first to get submittedBy, transactionNumber, paymentMethod
  const saleSnap = await getDoc(doc(salesRef, saleId));
  const sale = saleSnap.data() || {};

  // Set status to cancelled and record rejection details
  await updateDoc(doc(salesRef, saleId), {
    status:          'cancelled',
    paymentStatus:   'cancelled',
    rejectedBy:      userId,
    rejectedAt:      serverTimestamp(),
    rejectionReason: reason.trim(),
    updatedAt:       serverTimestamp(),
  });

  // Cancel the linked AR record if the sale was on credit terms
  if (sale.paymentMethod === 'credit_term') {
    const arSnap = await getDocs(
      query(collection(db, COLLECTIONS.ACCOUNTS_RECEIVABLE), where('saleId', '==', saleId))
    );
    for (const d of arSnap.docs) {
      await updateDoc(d.ref, {
        status:    'cancelled',
        updatedAt: serverTimestamp(),
      });
    }
  }

  // Send notification to the rep who submitted the order
  if (sale.submittedBy) {
    await addDoc(collection(db, COLLECTIONS.USER_NOTIFICATIONS), {
      userId:            sale.submittedBy,
      type:              'sale_rejected',
      title:             'Order Request Rejected',
      message:           `Your order #${sale.transactionNumber} was rejected. Reason: ${reason.trim()}`,
      saleId,
      transactionNumber: sale.transactionNumber || '',
      reason:            reason.trim(),
      read:              false,
      createdAt:         serverTimestamp(),
    });
  }

  await logActivity({
    type: 'sale_rejected',
    description: `Sale rejected — ${reason}`,
    userId,
    meta: { saleId, reason },
  });
};

// ─── Get Sales by Date Range ──────────────────────────────────────────────────

export const getSalesByDateRange = async (start, end) => {
  const q = query(
    salesRef,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end)),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Subscribe to Sales ───────────────────────────────────────────────────────

export const subscribeToSales = (start, end, callback) => {
  const q = query(
    salesRef,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end)),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

// ─── Update Sale Status ───────────────────────────────────────────────────────

export const updateSaleStatus = async (id, status, userId) => {
  await updateDoc(doc(salesRef, id), { status, updatedAt: serverTimestamp() });
  await logActivity({
    type: 'sale_status_updated',
    description: `Sale status updated to ${status}`,
    userId,
    meta: { saleId: id, status },
  });
};

// ─── Update Payment Status ────────────────────────────────────────────────────

export const updatePaymentStatus = async (id, paymentStatus, userId) => {
  await updateDoc(doc(salesRef, id), { paymentStatus, updatedAt: serverTimestamp() });
  await logActivity({
    type: 'sale_payment_updated',
    description: `Sale payment status updated to ${paymentStatus}`,
    userId,
    meta: { saleId: id, paymentStatus },
  });
};
