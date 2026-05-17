import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider,
  Stack, InputAdornment, Tooltip, Alert, CircularProgress,
} from '@mui/material';
import {
  Add, Search, Print, Visibility, TrendingUp, Receipt,
  CheckCircle, HourglassEmpty, FilterList, ThumbUp, ThumbDown,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import AppLayout from '@/components/layout/AppLayout';
import useAuth from '@/hooks/useAuth';
import { subscribeToSales, createSale, approveSale, rejectSale } from '@/services/sales.service';
import { getDocs, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS, PAYMENT_METHODS, ORDER_TYPES, SALES_STATUSES } from '@/config/constants';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const endOfDay = (d) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e; };

const STATUS_COLOR = {
  completed: 'success', pending: 'warning', cancelled: 'error',
  approved: 'info', out_for_delivery: 'info', delivered: 'success',
  processing: 'warning', returned: 'default',
  pending_approval: 'warning', rejected: 'error',
};
const PAYMENT_COLOR = { paid: 'success', pending: 'warning', partial: 'info', overdue: 'error', cancelled: 'default' };
const EMPTY_ITEM = { productId: '', productName: '', unit: 'pc', quantity: 1, unitPrice: 0 };

export default function SalesPage() {
  const { user, canApproveSales, isSalesRep } = useAuth();

  const [preset, setPreset]     = useState('today');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate]   = useState(endOfDay(today()));
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [sales, setSales]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [products, setProducts] = useState([]);
  const [addOpen, setAddOpen]   = useState(false);
  const [viewSale, setViewSale] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [approvalDialog, setApprovalDialog] = useState(null); // { sale, type: 'approve'|'reject' }
  const [approvalNote, setApprovalNote]     = useState('');
  const [rejectReason, setRejectReason]     = useState('');
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerAddress: '',
    orderType: 'walk_in', paymentMethod: 'cash', notes: '', discount: 0,
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const applyPreset = (p) => {
    setPreset(p);
    const now = new Date();
    if (p === 'today') {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      setStartDate(s); setEndDate(endOfDay(s));
    } else if (p === 'week') {
      const s = new Date(now); s.setDate(now.getDate() - 6); s.setHours(0, 0, 0, 0);
      setStartDate(s); setEndDate(endOfDay(now));
    } else if (p === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(s); setEndDate(endOfDay(now));
    }
  };

  useEffect(() => {
    getDocs(query(collection(db, COLLECTIONS.PRODUCTS), orderBy('name')))
      .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToSales(startDate, endDate, (data) => {
      setSales(data); setLoading(false);
    });
    return unsub;
  }, [startDate, endDate]);

  const filtered = sales.filter((s) => {
    const matchSearch = !search ||
      s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.transactionNumber?.includes(search);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue   = filtered.reduce((a, s) => a + (s.total || 0), 0);
  const completedCount = filtered.filter((s) => s.status === 'completed').length;
  const pendingCount   = filtered.filter((s) => ['pending', 'processing', 'pending_approval'].includes(s.status)).length;
  const pendingApprovalCount = sales.filter((s) => s.status === 'pending_approval' && (!s.assignedManagerId || s.assignedManagerId === user?.uid)).length;

  const updateItem = (idx, field, val) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'productId') {
        const prod = products.find((p) => p.id === val);
        if (prod) next[idx] = { ...next[idx], productName: prod.name, unitPrice: prod.price || 0, unit: prod.unit || 'pc' };
      }
      return next;
    });
  };
  const addItem    = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  const subtotal = items.reduce((a, i) => a + Number(i.unitPrice) * Number(i.quantity), 0);
  const total    = Math.max(0, subtotal - Number(form.discount || 0));

  const resetForm = () => {
    setForm({ customerName: '', customerPhone: '', customerAddress: '', orderType: 'walk_in', paymentMethod: 'cash', notes: '', discount: 0, dueDate: null, installmentTotal: '', installmentAmount: '', installmentFrequency: 'monthly', firstInstallmentDue: null });
    setItems([{ ...EMPTY_ITEM }]);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) { setSaveError('Customer name is required'); return; }
    const validItems = items.filter((i) => i.productName.trim() && i.quantity > 0);
    if (!validItems.length) { setSaveError('Add at least one product'); return; }
    // Validate installment plan when credit term is selected
    if (form.paymentMethod === 'credit_term' && form.installmentTotal && form.installmentAmount) {
      const instTotal = Number(form.installmentTotal);
      const instAmt   = Number(form.installmentAmount);
      if (instTotal <= 0 || instAmt <= 0) { setSaveError('Installment count and amount must be greater than 0'); return; }
      const computed = parseFloat((instAmt * instTotal).toFixed(2));
      const expected = parseFloat(total.toFixed(2));
      if (Math.abs(computed - expected) > 1) {
        setSaveError(`Installment plan does not add up: ${instTotal} × ₱${instAmt.toLocaleString()} = ₱${computed.toLocaleString()} but order total is ₱${expected.toLocaleString()}`);
        return;
      }
    }
    setSaveError(''); setSaving(true);
    try {
      const repName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || '';
      await createSale({ ...form, subtotal, total }, validItems, user?.uid, isSalesRep?.(), user?.managerId || '', repName);
      setAddOpen(false); resetForm();
    } catch (e) {
      setSaveError(e.message || 'Failed to save sale');
    } finally { setSaving(false); }
  };

  const handleApprove = async () => {
    if (!approvalDialog) return;
    setApprovalSaving(true);
    try {
      await approveSale(approvalDialog.sale.id, user?.uid, approvalNote);
      setApprovalDialog(null);
      setApprovalNote('');
    } catch { }
    finally { setApprovalSaving(false); }
  };

  const handleReject = async () => {
    if (!approvalDialog || !rejectReason.trim()) return;
    setApprovalSaving(true);
    try {
      await rejectSale(approvalDialog.sale.id, user?.uid, rejectReason);
      setApprovalDialog(null);
      setRejectReason('');
    } catch { }
    finally { setApprovalSaving(false); }
  };

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Sales Management</Typography>
            <Typography variant="body2" color="text.secondary">Track and manage pharmaceutical sales transactions</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setAddOpen(true); }}>
            New Sale
          </Button>
        </Box>

        {/* Date Presets */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {[['today','Today'],['week','This Week'],['month','This Month'],['custom','Custom']].map(([key, label]) => (
            <Button key={key} variant={preset === key ? 'contained' : 'outlined'} size="small"
              onClick={() => applyPreset(key)} sx={{ borderRadius: 2 }}>{label}</Button>
          ))}
          {preset === 'custom' && (
            <>
              <DatePicker label="From" value={startDate} onChange={(v) => v && setStartDate(v)} slotProps={{ textField: { size: 'small' } }} />
              <DatePicker label="To"   value={endDate}   onChange={(v) => v && setEndDate(endOfDay(v))} slotProps={{ textField: { size: 'small' } }} />
            </>
          )}
        </Stack>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Transactions', value: filtered.length, icon: <Receipt />, color: 'primary.main' },
            { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: <TrendingUp />, color: 'success.main' },
            { label: 'Completed', value: completedCount, icon: <CheckCircle />, color: 'success.main' },
            { label: 'Pending', value: pendingCount, icon: <HourglassEmpty />, color: 'warning.main' },
          ].map((kpi) => (
            <Grid item xs={6} md={3} key={kpi.label}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
                    </Box>
                    <Box sx={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} alignItems="center">
              <FilterList fontSize="small" color="action" />
              <TextField size="small" placeholder="Search customer or txn #" value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 240 }} />
              <TextField select size="small" label="Status" value={statusFilter}
                onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
                <MenuItem value="all">All Statuses</MenuItem>
                {Object.entries(SALES_STATUSES).map(([k, v]) => (
                  <MenuItem key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        {/* Pending approval banner for managers */}
        {canApproveSales?.() && pendingApprovalCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>{pendingApprovalCount} sale{pendingApprovalCount > 1 ? 's' : ''} pending your approval</strong>
            {' — '}Review the transactions below and approve or reject each one.
          </Alert>
        )}

        {/* Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Txn #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Items</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>No sales transactions found</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600} color="primary">#{s.transactionNumber}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2">{s.customerName || 'Walk-in'}</Typography>
                    {s.customerPhone && <Typography variant="caption" color="text.secondary">{s.customerPhone}</Typography>}
                    {s.submittedByName && (
                      <Typography variant="caption" color="primary.main" display="block">Rep: {s.submittedByName}</Typography>
                    )}
                  </TableCell>
                  <TableCell><Typography variant="caption">{(s.orderType || '').replace(/_/g, ' ')}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{(s.items || []).length} item(s)</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{formatCurrency(s.total)}</Typography></TableCell>
                  <TableCell>
                    <Stack spacing={0.3}>
                      <Typography variant="caption">{(s.paymentMethod || '').replace(/_/g, ' ')}</Typography>
                      <Chip label={s.paymentStatus || 'paid'} size="small"
                        color={PAYMENT_COLOR[s.paymentStatus] || 'default'} sx={{ height: 18, fontSize: 10 }} />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={(s.status || '').replace(/_/g, ' ')} size="small" color={STATUS_COLOR[s.status] || 'default'} />
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{formatDateTime(s.createdAt)}</Typography></TableCell>
                  <TableCell align="center">
                    <Stack direction="row" justifyContent="center" spacing={0.5}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => setViewSale(s)}><Visibility fontSize="small" /></IconButton>
                      </Tooltip>
                      {canApproveSales?.() && s.status === 'pending_approval' && (!s.assignedManagerId || s.assignedManagerId === user?.uid) && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success"
                              onClick={() => setApprovalDialog({ sale: s, type: 'approve' })}>
                              <ThumbUp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton size="small" color="error"
                              onClick={() => setApprovalDialog({ sale: s, type: 'reject' })}>
                              <ThumbDown fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Add Sale Dialog ─────────────────────────────────────────── */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle fontWeight={700}>New Sales Transaction</DialogTitle>
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
                <TextField fullWidth select label="Transaction Type" size="small" value={form.orderType}
                  onChange={(e) => setForm({ ...form, orderType: e.target.value })}>
                  {Object.entries(ORDER_TYPES).map(([k, v]) => (
                    <MenuItem key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Payment Method" size="small" value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, dueDate: null, installmentTotal: '', installmentAmount: '', installmentFrequency: 'monthly', firstInstallmentDue: null })}>
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <MenuItem key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              {form.paymentMethod === 'credit_term' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Overall Due Date (optional)"
                      value={form.dueDate}
                      onChange={(v) => setForm({ ...form, dueDate: v })}
                      slotProps={{ textField: { fullWidth: true, size: 'small', helperText: 'Final settlement deadline' } }}
                    />
                  </Grid>
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
                        const auto = n && total ? (total / Number(n)).toFixed(2) : '';
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
                    const diff = Math.abs(computed - total);
                    if (diff <= 1) return null;
                    return (
                      <Grid item xs={12}>
                        <Alert severity="error" sx={{ py: 0.5 }}>
                          {Number(form.installmentTotal)} × ₱{Number(form.installmentAmount).toLocaleString()} = ₱{computed.toLocaleString()} — must equal order total ₱{total.toLocaleString()} (difference: ₱{diff.toLocaleString()})
                        </Alert>
                      </Grid>
                    );
                  })()}
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="First Installment Due"
                      value={form.firstInstallmentDue}
                      onChange={(v) => setForm({ ...form, firstInstallmentDue: v })}
                      disabled={!form.installmentTotal}
                      slotProps={{ textField: { fullWidth: true, size: 'small', helperText: 'Start of payment schedule' } }}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>Products / Items</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
                    <TableCell>Product</TableCell>
                    <TableCell sx={{ width: 70 }}>Unit</TableCell>
                    <TableCell sx={{ width: 80 }}>Qty</TableCell>
                    <TableCell sx={{ width: 120 }}>Unit Price (₱)</TableCell>
                    <TableCell sx={{ width: 110 }} align="right">Total</TableCell>
                    <TableCell sx={{ width: 36 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {products.length > 0 ? (
                          <TextField select fullWidth size="small" value={item.productId}
                            onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                            <MenuItem value=""><em>Select product</em></MenuItem>
                            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                          </TextField>
                        ) : (
                          <TextField fullWidth size="small" placeholder="Product name" value={item.productName}
                            onChange={(e) => updateItem(idx, 'productName', e.target.value)} />
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={item.unit} sx={{ width: 60 }}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" inputProps={{ min: 1 }} value={item.quantity} sx={{ width: 70 }}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" inputProps={{ min: 0, step: 0.01 }} value={item.unitPrice} sx={{ width: 110 }}
                          onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <IconButton size="small" color="error" onClick={() => removeItem(idx)}>✕</IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" onClick={addItem} sx={{ mt: 1 }}>+ Add Item</Button>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Discount (₱)</Typography>
                  <TextField size="small" type="number" inputProps={{ min: 0, step: 0.01 }} value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })} sx={{ width: 110 }} />
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="primary">{formatCurrency(total)}</Typography>
                </Box>
              </Stack>
            </Box>
            <TextField fullWidth multiline rows={2} label="Notes (optional)" size="small"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} sx={{ mt: 2 }} />
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Transaction'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── View Sale Dialog ────────────────────────────────────────── */}
        <Dialog open={!!viewSale} onClose={() => setViewSale(null)} maxWidth="sm" fullWidth>
          {viewSale && (
            <>
              <DialogTitle fontWeight={700}>
                Transaction #{viewSale.transactionNumber}
                <Chip label={(viewSale.status || '').replace(/_/g, ' ')} size="small"
                  color={STATUS_COLOR[viewSale.status] || 'default'} sx={{ ml: 1 }} />
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: 2 }}>
                <Grid container spacing={1.5}>
                  {[
                    ['Customer',         viewSale.customerName || 'Walk-in'],
                    ['Phone',            viewSale.customerPhone || '—'],
                    ['Address',          viewSale.customerAddress || '—'],
                    ['Transaction Type', (viewSale.orderType || '').replace(/_/g, ' ')],
                    ['Payment Method',   (viewSale.paymentMethod || '').replace(/_/g, ' ')],
                    ['Date',             formatDateTime(viewSale.createdAt)],
                    ['Submitted By',     viewSale.submittedByName || '—'],
                  ].map(([label, val]) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{val}</Typography>
                    </Grid>
                  ))}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Payment Status</Typography>
                    <Box><Chip label={viewSale.paymentStatus || 'paid'} size="small" color={PAYMENT_COLOR[viewSale.paymentStatus] || 'default'} /></Box>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Items</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Qty</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(viewSale.items || []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="center">{item.quantity} {item.unit}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Subtotal</Typography>
                      <Typography variant="body2">{formatCurrency(viewSale.subtotal)}</Typography>
                    </Box>
                    {viewSale.discount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Discount</Typography>
                        <Typography variant="body2">-{formatCurrency(viewSale.discount)}</Typography>
                      </Box>
                    )}
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
                      <Typography variant="subtitle2" fontWeight={700} color="primary">{formatCurrency(viewSale.total)}</Typography>
                    </Box>
                  </Stack>
                </Box>
                {viewSale.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{viewSale.notes}</Typography>
                  </Box>
                )}
                {viewSale.status === 'pending_approval' && canApproveSales?.() && (!viewSale.assignedManagerId || viewSale.assignedManagerId === user?.uid) && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    This sale requires your approval. Verify the pricing and items above.
                  </Alert>
                )}
                {viewSale.approvalNotes && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Approval Notes</Typography>
                    <Typography variant="body2">{viewSale.approvalNotes}</Typography>
                  </Box>
                )}
                {viewSale.rejectionReason && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="error.main">Rejection Reason</Typography>
                    <Typography variant="body2" color="error.main">{viewSale.rejectionReason}</Typography>
                  </Box>
                )}
              </DialogContent>
              <Divider />
              <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button startIcon={<Print />} variant="outlined" size="small" onClick={() => window.print()}>Print</Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {canApproveSales?.() && viewSale.status === 'pending_approval' && (!viewSale.assignedManagerId || viewSale.assignedManagerId === user?.uid) && (
                    <>
                      <Button size="small" color="error" variant="outlined" startIcon={<ThumbDown />}
                        onClick={() => { setViewSale(null); setApprovalDialog({ sale: viewSale, type: 'reject' }); }}>
                        Reject
                      </Button>
                      <Button size="small" color="success" variant="contained" startIcon={<ThumbUp />}
                        onClick={() => { setViewSale(null); setApprovalDialog({ sale: viewSale, type: 'approve' }); }}>
                        Approve
                      </Button>
                    </>
                  )}
                  <Button onClick={() => setViewSale(null)}>Close</Button>
                </Box>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>

      {/* ── Approve Dialog ─────────────────────────────────────────────── */}
      <Dialog open={approvalDialog?.type === 'approve'} onClose={() => setApprovalDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Approve Sale</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Approve transaction{' '}
            <strong>#{approvalDialog?.sale?.transactionNumber}</strong>{' '}for{' '}
            <strong>{approvalDialog?.sale?.customerName || 'Walk-in'}</strong>{' — '}
            <strong>{formatCurrency(approvalDialog?.sale?.total)}</strong>?
          </Typography>
          <TextField
            fullWidth multiline rows={2}
            label="Approval notes (optional)" size="small"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialog(null)} disabled={approvalSaving}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<ThumbUp />}
            onClick={handleApprove} disabled={approvalSaving}>
            {approvalSaving ? 'Approving…' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reject Dialog ──────────────────────────────────────────────── */}
      <Dialog open={approvalDialog?.type === 'reject'} onClose={() => setApprovalDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700} sx={{ color: 'error.main' }}>Reject Sale</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reject transaction{' '}
            <strong>#{approvalDialog?.sale?.transactionNumber}</strong>?
            Please provide a reason so the rep can correct and resubmit.
          </Typography>
          <TextField
            fullWidth multiline rows={3}
            label="Reason for rejection *" size="small"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            error={!rejectReason.trim()}
            helperText={!rejectReason.trim() ? 'A reason is required' : ''}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialog(null)} disabled={approvalSaving}>Cancel</Button>
          <Button variant="contained" color="error" startIcon={<ThumbDown />}
            onClick={handleReject} disabled={approvalSaving || !rejectReason.trim()}>
            {approvalSaving ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
