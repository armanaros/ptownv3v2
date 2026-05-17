import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider,
  Stack, InputAdornment, Tooltip, Alert, CircularProgress, LinearProgress,
} from '@mui/material';
import {
  Add, Search, Visibility, Payment, AccountBalance,
  Warning, CheckCircle, FilterList, Print, Schedule, Replay,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import AppLayout from '@/components/layout/AppLayout';
import useAuth from '@/hooks/useAuth';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, where, Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS, AR_STATUSES, PAYMENT_METHODS } from '@/config/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { logActivity } from '@/services/activity.service';
import { updatePaymentStatus as updateSalePaymentStatus } from '@/services/sales.service';

const STATUS_COLOR = { current: 'success', overdue: 'error', bad_debt: 'default', paid: 'info', cancelled: 'default' };
const AGING_BUCKETS = ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'];

const getAgingBucket = (dueDate) => {
  if (!dueDate) return 'Current';
  const d = dueDate?.toDate ? dueDate.toDate() : new Date(dueDate);
  const daysOverdue = Math.ceil((new Date() - d) / 86400000);
  if (daysOverdue <= 0)  return 'Current';
  if (daysOverdue <= 30) return '1-30 days';
  if (daysOverdue <= 60) return '31-60 days';
  if (daysOverdue <= 90) return '61-90 days';
  return '90+ days';
};

/** How many installments have been paid based on cumulative amount */
const computeInstallmentsPaid = (amountPaid, installmentAmount) => {
  if (!installmentAmount || installmentAmount <= 0) return null;
  return Math.floor((amountPaid || 0) / installmentAmount);
};

/** Date when the next installment falls due */
const getNextInstallmentDue = (firstDue, installmentsPaid, frequency = 'monthly') => {
  if (!firstDue || installmentsPaid == null) return null;
  const d = firstDue?.toDate ? firstDue.toDate() : new Date(firstDue);
  const result = new Date(d);
  switch (frequency) {
    case 'weekly':     result.setDate(result.getDate() + installmentsPaid * 7); break;
    case 'bi_monthly': result.setDate(result.getDate() + installmentsPaid * 14); break;
    case 'monthly':
    default:           result.setMonth(result.getMonth() + installmentsPaid); break;
  }
  return result;
};

export default function AccountsReceivablePage() {
  const { user } = useAuth();
  const location = useLocation();
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [viewRecord, setViewRecord] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [addOpen, setAddOpen]     = useState(false);
  const [payOpen, setPayOpen]     = useState(null); // record to record payment on
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerAddress: '',
    invoiceNumber: '', amount: 0, dueDate: null,
    paymentMethod: 'credit_term', notes: '',
    installmentTotal: '', installmentAmount: '',
    installmentFrequency: 'monthly', firstInstallmentDue: null,
  });
  const [payForm, setPayForm] = useState({ amount: 0, paymentMethod: 'cash', reference: '', notes: '' });
  const [refundOpen, setRefundOpen] = useState(null); // AR record to refund
  const [refundForm, setRefundForm] = useState({ amount: 0, reason: '' });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.ACCOUNTS_RECEIVABLE), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Auto-open record highlighted via ?highlight=<id> from dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('highlight');
    if (!id || records.length === 0) return;
    const rec = records.find((r) => r.id === id);
    if (rec) {
      setHighlightId(id);
      setViewRecord(rec);
      setTimeout(() => {
        document.getElementById(`ar-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [location.search, records]);

  useEffect(() => {
    if (!viewRecord) { setPaymentHistory([]); return; }
    setLoadingHistory(true);
    const q = query(
      collection(db, COLLECTIONS.AR_PAYMENTS),
      where('arId', '==', viewRecord.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const hist = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPaymentHistory(hist);
      setLoadingHistory(false);
    });
    return unsub;
  }, [viewRecord?.id]);

  const filtered = records.filter((r) => {
    const matchSearch = !search ||
      r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalOutstanding = filtered.filter((r) => r.status !== 'paid').reduce((a, r) => a + ((r.amount || 0) - (r.amountPaid || 0)), 0);
  const overdueCount     = filtered.filter((r) => r.status === 'overdue').length;
  const paidCount        = filtered.filter((r) => r.status === 'paid').length;
  const totalAmount      = filtered.reduce((a, r) => a + (r.amount || 0), 0);

  // Records that have an installment plan with a payment due within the next 7 days
  const upcomingInstallments = records.filter((r) => {
    if (!r.installmentTotal || r.status === 'paid') return false;
    const instPaid = computeInstallmentsPaid(r.amountPaid, r.installmentAmount);
    if (instPaid == null || instPaid >= r.installmentTotal) return false;
    const nextDue = getNextInstallmentDue(r.firstInstallmentDue, instPaid, r.installmentFrequency);
    if (!nextDue) return false;
    return Math.ceil((nextDue - new Date()) / 86400000) <= 7;
  });

  const resetForm = () => {
    setForm({
      customerName: '', customerPhone: '', customerAddress: '',
      invoiceNumber: '', amount: 0, dueDate: null,
      paymentMethod: 'credit_term', notes: '',
      installmentTotal: '', installmentAmount: '',
      installmentFrequency: 'monthly', firstInstallmentDue: null,
    });
    setSaveError('');
  };

  const handleAdd = async () => {
    if (!form.customerName.trim()) { setSaveError('Customer name is required'); return; }
    if (!form.amount || form.amount <= 0) { setSaveError('Amount must be greater than 0'); return; }
    // Validate installment plan
    if (form.installmentTotal && form.installmentAmount) {
      const instTotal = Number(form.installmentTotal);
      const instAmt   = Number(form.installmentAmount);
      if (instTotal <= 0 || instAmt <= 0) { setSaveError('Installment count and amount must be greater than 0'); return; }
      const computed = parseFloat((instAmt * instTotal).toFixed(2));
      const expected = parseFloat(Number(form.amount).toFixed(2));
      if (Math.abs(computed - expected) > 1) {
        setSaveError(`Installment plan does not add up: ${instTotal} × ₱${instAmt.toLocaleString()} = ₱${computed.toLocaleString()} but total amount is ₱${expected.toLocaleString()}`);
        return;
      }
    }
    setSaveError(''); setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.ACCOUNTS_RECEIVABLE), {
        customerName:         form.customerName.trim(),
        customerPhone:        form.customerPhone.trim(),
        customerAddress:      form.customerAddress.trim(),
        invoiceNumber:        form.invoiceNumber.trim(),
        amount:               Number(form.amount),
        amountPaid:           0,
        balance:              Number(form.amount),
        dueDate:              form.dueDate ? Timestamp.fromDate(new Date(form.dueDate)) : null,
        paymentMethod:        form.paymentMethod,
        status:               'current',
        notes:                form.notes.trim(),
        installmentTotal:     form.installmentTotal ? Number(form.installmentTotal) : null,
        installmentAmount:    form.installmentAmount ? Number(form.installmentAmount) : null,
        installmentFrequency: form.installmentTotal ? form.installmentFrequency : null,
        firstInstallmentDue:  form.firstInstallmentDue && form.installmentTotal
          ? Timestamp.fromDate(new Date(form.firstInstallmentDue)) : null,
        createdBy:            user?.uid || '',
        createdAt:            serverTimestamp(),
        updatedAt:            serverTimestamp(),
      });
      await logActivity({ type: 'ar_created', description: `AR record created for ${form.customerName}`, userId: user?.uid });
      setAddOpen(false); resetForm();
    } catch (e) { setSaveError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) return;
    setSaving(true);
    try {
      const rec = payOpen;
      const newPaid    = (rec.amountPaid || 0) + Number(payForm.amount);
      const newBalance = Math.max(0, (rec.amount || 0) - newPaid);
      const newStatus  = newBalance <= 0 ? 'paid' : 'current';

      await addDoc(collection(db, COLLECTIONS.AR_PAYMENTS), {
        arId:          rec.id,
        customerName:  rec.customerName,
        amount:        Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        reference:     payForm.reference?.trim() || '',
        notes:         payForm.notes?.trim() || '',
        createdBy:     user?.uid || '',
        createdAt:     serverTimestamp(),
      });
      await updateDoc(doc(db, COLLECTIONS.ACCOUNTS_RECEIVABLE, rec.id), {
        amountPaid: newPaid, balance: newBalance, status: newStatus, updatedAt: serverTimestamp(),
      });
      // Sync sale payment status when AR is fully paid
      if (newBalance <= 0 && rec.saleId) {
        await updateSalePaymentStatus(rec.saleId, 'paid', user?.uid);
      }
      await logActivity({ type: 'ar_payment', description: `Payment of ${formatCurrency(payForm.amount)} recorded for ${rec.customerName}`, userId: user?.uid });
      setPayOpen(null); setPayForm({ amount: 0, paymentMethod: 'cash', reference: '', notes: '' });
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleRefund = async () => {
    if (!refundForm.amount || refundForm.amount <= 0) return;
    const rec = refundOpen;
    const refundAmt = Math.min(Number(refundForm.amount), rec.amountPaid || 0);
    const newPaid    = Math.max(0, (rec.amountPaid || 0) - refundAmt);
    const newBalance = Math.min(rec.amount || 0, (rec.balance || 0) + refundAmt);
    setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.AR_PAYMENTS), {
        arId:          rec.id,
        customerName:  rec.customerName,
        amount:        -refundAmt,
        type:          'refund',
        reason:        refundForm.reason?.trim() || '',
        createdBy:     user?.uid || '',
        createdAt:     serverTimestamp(),
      });
      await updateDoc(doc(db, COLLECTIONS.ACCOUNTS_RECEIVABLE, rec.id), {
        amountPaid: newPaid,
        balance:    newBalance,
        status:     rec.status === 'paid' ? 'current' : rec.status,
        updatedAt:  serverTimestamp(),
      });
      if (rec.saleId) {
        await updateSalePaymentStatus(rec.saleId, newPaid <= 0 ? 'pending' : 'partial', user?.uid);
      }
      await logActivity({ type: 'ar_refund', description: `Refund of ${formatCurrency(refundAmt)} for ${rec.customerName}`, userId: user?.uid });
      setRefundOpen(null); setRefundForm({ amount: 0, reason: '' });
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Accounts Receivable</Typography>
            <Typography variant="body2" color="text.secondary">Customer ledger, outstanding balances, and collection monitoring</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setAddOpen(true); }}>
            New AR Record
          </Button>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Receivables',  value: formatCurrency(totalAmount),       icon: <AccountBalance />, color: 'primary.main' },
            { label: 'Outstanding Balance', value: formatCurrency(totalOutstanding), icon: <Warning />,        color: 'warning.main' },
            { label: 'Overdue Accounts',   value: overdueCount,                     icon: <Warning />,        color: 'error.main' },
            { label: 'Paid Accounts',      value: paidCount,                        icon: <CheckCircle />,    color: 'success.main' },
          ].map((kpi) => (
            <Grid item xs={6} md={3} key={kpi.label}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
                    </Box>
                    <Box sx={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Aging Summary */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Receivable Aging</Typography>
            <Grid container spacing={1}>
              {AGING_BUCKETS.map((bucket) => {
                const bucketRecs = filtered.filter((r) => r.status !== 'paid' && getAgingBucket(r.dueDate) === bucket);
                const bucketTotal = bucketRecs.reduce((a, r) => a + ((r.amount || 0) - (r.amountPaid || 0)), 0);
                return (
                  <Grid item xs key={bucket}>
                    <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: bucket === 'Current' ? 'success.50' : bucket === '1-30 days' ? 'warning.50' : 'error.50' }}>
                      <Typography variant="caption" color="text.secondary" display="block">{bucket}</Typography>
                      <Typography variant="body2" fontWeight={700}>{formatCurrency(bucketTotal)}</Typography>
                      <Typography variant="caption">{bucketRecs.length} accts</Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>

        {/* Upcoming installment reminder */}
        {upcomingInstallments.length > 0 && (
          <Alert severity="warning" icon={<Schedule />} sx={{ mb: 2 }}>
            <strong>
              {upcomingInstallments.length} installment{upcomingInstallments.length > 1 ? 's' : ''} due within 7 days
            </strong>
            {' — '}
            {upcomingInstallments.map((r) => {
              const instPaid = computeInstallmentsPaid(r.amountPaid, r.installmentAmount) ?? 0;
              const nextDue  = getNextInstallmentDue(r.firstInstallmentDue, instPaid, r.installmentFrequency);
              return `${r.customerName} (${formatDate(nextDue)})`;
            }).join(', ')}
          </Alert>
        )}

        {/* Filters */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} alignItems="center">
              <FilterList fontSize="small" color="action" />
              <TextField size="small" placeholder="Search customer or invoice #" value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 240 }} />
              <TextField select size="small" label="Status" value={statusFilter}
                onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
                <MenuItem value="all">All</MenuItem>
                {Object.entries(AR_STATUSES).map(([k, v]) => (
                  <MenuItem key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        {/* Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Customer</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Collection Progress</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Aging</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>No AR records found</TableCell></TableRow>
              ) : filtered.map((r) => {
                const pct = r.amount > 0 ? Math.min(100, ((r.amountPaid || 0) / r.amount) * 100) : 0;
                return (
                  <TableRow
                    key={r.id}
                    hover
                    id={`ar-row-${r.id}`}
                    sx={highlightId === r.id ? { bgcolor: 'warning.50', outline: '2px solid', outlineColor: 'warning.main' } : {}}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.customerName}</Typography>
                      {r.customerPhone && <Typography variant="caption" color="text.secondary">{r.customerPhone}</Typography>}
                    </TableCell>
                    <TableCell><Typography variant="caption" color="primary">{r.invoiceNumber || '—'}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2">{formatCurrency(r.amount)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" color="success.main">{formatCurrency(r.amountPaid || 0)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color={r.balance > 0 ? 'error.main' : 'success.main'}>{formatCurrency(r.balance || 0)}</Typography></TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      {r.installmentTotal ? (() => {
                        const instPaid = computeInstallmentsPaid(r.amountPaid, r.installmentAmount) ?? 0;
                        return (
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={700}
                                color={instPaid >= r.installmentTotal ? 'success.main' : 'text.primary'}>
                                {instPaid}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">/ {r.installmentTotal} paid</Typography>
                              {instPaid < r.installmentTotal && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                  {formatCurrency(r.installmentAmount)}/ea
                                </Typography>
                              )}
                            </Box>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ height: 6, borderRadius: 3 }}
                              color={pct >= 100 ? 'success' : pct > 50 ? 'warning' : 'error'} />
                          </Box>
                        );
                      })() : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={pct}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            color={pct >= 100 ? 'success' : pct > 50 ? 'warning' : 'error'} />
                          <Typography variant="caption">{Math.round(pct)}%</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="caption">{r.dueDate ? formatDate(r.dueDate) : '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption" color={getAgingBucket(r.dueDate) === 'Current' ? 'success.main' : 'error.main'}>
                        {r.status !== 'paid' ? getAgingBucket(r.dueDate) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell><Chip label={(r.status || '').replace(/_/g, ' ')} size="small" color={STATUS_COLOR[r.status] || 'default'} /></TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="View"><IconButton size="small" onClick={() => setViewRecord(r)}><Visibility fontSize="small" /></IconButton></Tooltip>
                        {r.status !== 'paid' && r.status !== 'cancelled' && (
                          <Tooltip title="Record Payment">
                            <IconButton size="small" color="success" onClick={() => {
                              const nextInstAmt = r.installmentAmount && r.installmentAmount < (r.balance || 0)
                                ? r.installmentAmount : (r.balance || 0);
                              setPayOpen(r);
                              setPayForm({ amount: nextInstAmt, paymentMethod: 'cash', reference: '', notes: '' });
                            }}>
                              <Payment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(r.amountPaid || 0) > 0 && (
                          <Tooltip title="Issue Refund">
                            <IconButton size="small" color="warning" onClick={() => {
                              setRefundOpen(r);
                              setRefundForm({ amount: 0, reason: '' });
                            }}>
                              <Replay fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Add AR Dialog ────────────────────────────────────────────── */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>New Accounts Receivable</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Customer Name *" size="small" value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Customer Phone" size="small" value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Customer Address" size="small" value={form.customerAddress}
                  onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Invoice Number" size="small" value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Amount (₱) *" type="number" size="small"
                  inputProps={{ min: 0, step: 0.01 }} value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker label="Due Date" value={form.dueDate}
                  onChange={(v) => setForm({ ...form, dueDate: v })}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Payment Method" size="small" value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <MenuItem key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Notes" size="small" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Grid>

              {/* Installment plan setup */}
              <Grid item xs={12}>
                <Divider><Typography variant="caption" color="text.secondary">Installment Plan (optional)</Typography></Divider>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="No. of Installments" type="number" size="small"
                  inputProps={{ min: 2, max: 120 }}
                  value={form.installmentTotal}
                  helperText="e.g. 4 or 12 payments"
                  onChange={(e) => {
                    const n = e.target.value;
                    const auto = n && form.amount ? (Number(form.amount) / Number(n)).toFixed(2) : '';
                    setForm({ ...form, installmentTotal: n, installmentAmount: auto });
                  }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Amount per Installment (₱)" type="number" size="small"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={form.installmentAmount}
                  helperText="Auto-filled from total ÷ count"
                  onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="Frequency" size="small"
                  value={form.installmentFrequency}
                  disabled={!form.installmentTotal}
                  onChange={(e) => setForm({ ...form, installmentFrequency: e.target.value })}>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="bi_monthly">Every 2 Weeks</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </TextField>
              </Grid>
              {/* Live installment validation hint */}
              {form.installmentTotal && form.installmentAmount && (() => {
                const computed = parseFloat((Number(form.installmentAmount) * Number(form.installmentTotal)).toFixed(2));
                const expected = parseFloat(Number(form.amount || 0).toFixed(2));
                const diff = Math.abs(computed - expected);
                if (diff <= 1) return null;
                return (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ py: 0.5 }}>
                      {Number(form.installmentTotal)} × ₱{Number(form.installmentAmount).toLocaleString()} = ₱{computed.toLocaleString()} — must equal total amount ₱{expected.toLocaleString()} (difference: ₱{diff.toLocaleString()})
                    </Alert>
                  </Grid>
                );
              })()}
              <Grid item xs={12} sm={6}>
                <DatePicker label="First Installment Due"
                  value={form.firstInstallmentDue}
                  onChange={(v) => setForm({ ...form, firstInstallmentDue: v })}
                  disabled={!form.installmentTotal}
                  slotProps={{ textField: { fullWidth: true, size: 'small', helperText: 'Start date of payment schedule' } }} />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Create Record'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Record Payment Dialog ────────────────────────────────────── */}
        <Dialog open={!!payOpen} onClose={() => setPayOpen(null)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Record Payment</DialogTitle>
          <Divider />
          {payOpen && (
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Customer: <strong>{payOpen.customerName}</strong> | Balance: <strong>{formatCurrency(payOpen.balance || 0)}</strong>
              </Typography>
              {payOpen.installmentTotal && (() => {
                const instPaid  = computeInstallmentsPaid(payOpen.amountPaid, payOpen.installmentAmount) ?? 0;
                const remaining = payOpen.installmentTotal - instPaid;
                const enteredAmt = Number(payForm.amount) || 0;
                const coversCount = payOpen.installmentAmount > 0
                  ? Math.floor(enteredAmt / payOpen.installmentAmount) : 0;
                const isAdvance = coversCount > 1;
                return (
                  <>
                    <Alert severity={isAdvance ? 'success' : 'info'} sx={{ mb: 1.5, py: 0.5 }}>
                      {isAdvance
                        ? <>Advance payment — covers <strong>{coversCount}</strong> installment{coversCount > 1 ? 's' : ''} (installment {instPaid + 1}–{Math.min(instPaid + coversCount, payOpen.installmentTotal)} of {payOpen.installmentTotal})</>
                        : <>Recording installment <strong>{instPaid + 1}</strong> of <strong>{payOpen.installmentTotal}</strong> — expected: <strong>{formatCurrency(payOpen.installmentAmount)}</strong></>
                      }
                    </Alert>
                    {/* Quick-fill buttons */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                      {[1, 2, 3].filter((n) => n <= remaining).map((n) => (
                        <Button key={n} size="small" variant="outlined"
                          onClick={() => setPayForm({ ...payForm, amount: parseFloat((payOpen.installmentAmount * n).toFixed(2)) })}>
                          {n === 1 ? '1 Installment' : `${n} Installments`}
                        </Button>
                      ))}
                      <Button size="small" variant="outlined" color="success"
                        onClick={() => setPayForm({ ...payForm, amount: parseFloat((payOpen.balance || 0).toFixed(2)) })}>
                        Full Balance
                      </Button>
                    </Stack>
                  </>
                );
              })()}
              {!payOpen.installmentTotal && (
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Button size="small" variant="outlined" color="success"
                    onClick={() => setPayForm({ ...payForm, amount: parseFloat((payOpen.balance || 0).toFixed(2)) })}>
                    Full Balance
                  </Button>
                </Stack>
              )}
              <Stack spacing={2}>
                <TextField fullWidth label="Payment Amount (₱) *" type="number" size="small"
                  inputProps={{ min: 0, step: 0.01, max: payOpen.balance }}
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                <TextField fullWidth select label="Payment Method" size="small" value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}>
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <MenuItem key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                  ))}
                </TextField>
                <TextField fullWidth label="Reference / Check #" size="small" value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
                <TextField fullWidth label="Notes" size="small" value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
              </Stack>
            </DialogContent>
          )}
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPayOpen(null)} disabled={saving}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handlePayment} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── View Record Dialog ───────────────────────────────────────── */}
        <Dialog open={!!viewRecord} onClose={() => setViewRecord(null)} maxWidth="sm" fullWidth>
          {viewRecord && (
            <>
              <DialogTitle fontWeight={700}>
                AR Record — {viewRecord.customerName}
                <Chip label={(viewRecord.status || '').replace(/_/g, ' ')} size="small"
                  color={STATUS_COLOR[viewRecord.status] || 'default'} sx={{ ml: 1 }} />
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: 2 }}>
                <Grid container spacing={1.5}>
                  {[
                    ['Invoice #',    viewRecord.invoiceNumber || '—'],
                    ['Phone',        viewRecord.customerPhone || '—'],
                    ['Address',      viewRecord.customerAddress || '—'],
                    ['Due Date',     viewRecord.dueDate ? formatDate(viewRecord.dueDate) : '—'],
                    ['Aging',        viewRecord.status !== 'paid' ? getAgingBucket(viewRecord.dueDate) : '—'],
                    ['Payment Method', (viewRecord.paymentMethod || '').replace(/_/g, ' ')],
                  ].map(([label, val]) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{val}</Typography>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={1} sx={{ textAlign: 'center' }}>
                  {[
                    ['Total Amount',  formatCurrency(viewRecord.amount), 'primary.main'],
                    ['Amount Paid',   formatCurrency(viewRecord.amountPaid || 0), 'success.main'],
                    ['Balance',       formatCurrency(viewRecord.balance || 0), 'error.main'],
                  ].map(([label, val, color]) => (
                    <Grid item xs={4} key={label}>
                      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="subtitle2" fontWeight={700} color={color}>{val}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {viewRecord.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{viewRecord.notes}</Typography>
                  </Box>
                )}

                {/* Installment schedule summary */}
                {viewRecord.installmentTotal && (() => {
                  const instPaid = computeInstallmentsPaid(viewRecord.amountPaid, viewRecord.installmentAmount) ?? 0;
                  const remaining = viewRecord.installmentTotal - instPaid;
                  const nextDue = getNextInstallmentDue(viewRecord.firstInstallmentDue, instPaid, viewRecord.installmentFrequency);
                  const daysUntil = nextDue ? Math.ceil((nextDue - new Date()) / 86400000) : null;
                  return (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Installment Schedule</Typography>
                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={800} color="success.main">{instPaid}</Typography>
                          <Typography variant="caption" color="text.secondary">Paid</Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={800}>{viewRecord.installmentTotal}</Typography>
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={800} color={remaining > 0 ? 'warning.main' : 'success.main'}>{remaining}</Typography>
                          <Typography variant="caption" color="text.secondary">Remaining</Typography>
                        </Grid>
                      </Grid>
                      <LinearProgress variant="determinate"
                        value={Math.min(100, (instPaid / viewRecord.installmentTotal) * 100)}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                        color={remaining === 0 ? 'success' : instPaid > viewRecord.installmentTotal / 2 ? 'warning' : 'error'} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(viewRecord.installmentAmount)} / {viewRecord.installmentFrequency?.replace('_', '-') || 'installment'}
                        </Typography>
                        {nextDue && remaining > 0 && (
                          <Typography variant="caption"
                            color={daysUntil != null && daysUntil <= 0 ? 'error.main' : daysUntil != null && daysUntil <= 7 ? 'warning.main' : 'text.secondary'}>
                            Next due: {formatDate(nextDue)}
                            {daysUntil != null && daysUntil <= 0 ? ' (OVERDUE)' : daysUntil != null && daysUntil <= 7 ? ` (in ${daysUntil}d)` : ''}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  );
                })()}

                {/* Payment history */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Payment History</Typography>
                  {loadingHistory ? (
                    <CircularProgress size={20} />
                  ) : paymentHistory.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No payments recorded yet.</Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {paymentHistory.map((p, idx) => (
                        <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {formatCurrency(p.amount)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.paymentMethod?.replace(/_/g, ' ')} {p.reference ? `· ${p.reference}` : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">
                              Payment #{paymentHistory.length - idx}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {p.createdAt ? formatDate(p.createdAt) : ''}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </DialogContent>
              <Divider />
              <DialogActions sx={{ p: 2 }}>
                <Button startIcon={<Print />} variant="outlined" size="small" onClick={() => window.print()}>Print SOA</Button>
                {viewRecord.status !== 'paid' && viewRecord.status !== 'cancelled' && (
                  <Button variant="contained" color="success" startIcon={<Payment />} size="small" onClick={() => {
                    const nextInstAmt = viewRecord.installmentAmount && viewRecord.installmentAmount < (viewRecord.balance || 0)
                      ? viewRecord.installmentAmount : (viewRecord.balance || 0);
                    setPayOpen(viewRecord);
                    setPayForm({ amount: nextInstAmt, paymentMethod: 'cash', reference: '', notes: '' });
                    setViewRecord(null);
                  }}>Record Payment</Button>
                )}
                {(viewRecord.amountPaid || 0) > 0 && (
                  <Button variant="outlined" color="warning" startIcon={<Replay />} size="small" onClick={() => {
                    setRefundOpen(viewRecord);
                    setRefundForm({ amount: 0, reason: '' });
                    setViewRecord(null);
                  }}>Issue Refund</Button>
                )}
                <Button onClick={() => setViewRecord(null)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>

        {/* ── Refund Dialog ────────────────────────────────────────────── */}
        <Dialog open={!!refundOpen} onClose={() => setRefundOpen(null)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700} sx={{ color: 'warning.dark' }}>Issue Refund</DialogTitle>
          <Divider />
          {refundOpen && (
            <DialogContent sx={{ pt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                Amount paid so far: <strong>{formatCurrency(refundOpen.amountPaid || 0)}</strong>. Refund cannot exceed this amount.
              </Alert>
              <Stack spacing={2}>
                <TextField fullWidth label="Refund Amount (₱) *" type="number" size="small"
                  inputProps={{ min: 0.01, step: 0.01, max: refundOpen.amountPaid || 0 }}
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} />
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => setRefundForm({ ...refundForm, amount: refundOpen.amountPaid || 0 })}>
                    Full Amount
                  </Button>
                </Stack>
                <TextField fullWidth label="Reason for Refund *" size="small" multiline rows={2}
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} />
              </Stack>
            </DialogContent>
          )}
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRefundOpen(null)} disabled={saving}>Cancel</Button>
            <Button variant="contained" color="warning" startIcon={<Replay />}
              onClick={handleRefund}
              disabled={saving || !refundForm.amount || !refundForm.reason?.trim()}>
              {saving ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogActions>
        </Dialog>
    </AppLayout>
  );
}
