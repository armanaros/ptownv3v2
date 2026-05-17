import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider,
  Stack, InputAdornment, Tooltip, Alert, CircularProgress, Stepper, Step, StepLabel,
} from '@mui/material';
import {
  Add, Search, Visibility, LocalShipping, CheckCircle,
  Schedule, FilterList, Edit, Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import AppLayout from '@/components/layout/AppLayout';
import useAuth from '@/hooks/useAuth';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS, DELIVERY_STATUSES } from '@/config/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { logActivity } from '@/services/activity.service';

const STATUS_COLOR = {
  scheduled: 'default', dispatched: 'primary', in_transit: 'warning',
  delivered: 'success', failed: 'error', returned: 'secondary',
};

const DELIVERY_STEPS = ['scheduled', 'dispatched', 'in_transit', 'delivered'];

const stepIndex = (status) => DELIVERY_STEPS.indexOf(status);

export default function LogisticsPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [viewDel, setViewDel]       = useState(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [statusOpen, setStatusOpen] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [newStatus, setNewStatus]   = useState('');

  const [form, setForm] = useState({
    deliveryNumber: '', recipientName: '', recipientAddress: '', recipientPhone: '',
    driverName: '', vehiclePlate: '', scheduledDate: null, notes: '',
    items: [{ description: '', quantity: 1, unit: 'pcs' }],
  });

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.DELIVERIES), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDeliveries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = deliveries.filter((d) => {
    const matchSearch = !search ||
      d.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
      d.deliveryNumber?.toLowerCase().includes(search.toLowerCase()) ||
      d.driverName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const scheduledCount  = deliveries.filter((d) => d.status === 'scheduled').length;
  const inTransitCount  = deliveries.filter((d) => d.status === 'in_transit' || d.status === 'dispatched').length;
  const deliveredCount  = deliveries.filter((d) => d.status === 'delivered').length;
  const failedCount     = deliveries.filter((d) => d.status === 'failed' || d.status === 'returned').length;

  const resetForm = () => {
    setForm({
      deliveryNumber: '', recipientName: '', recipientAddress: '', recipientPhone: '',
      driverName: '', vehiclePlate: '', scheduledDate: null, notes: '',
      items: [{ description: '', quantity: 1, unit: 'pcs' }],
    });
    setSaveError('');
  };

  const handleAdd = async () => {
    if (!form.recipientName.trim()) { setSaveError('Recipient name is required'); return; }
    if (!form.recipientAddress.trim()) { setSaveError('Delivery address is required'); return; }
    setSaveError(''); setSaving(true);
    try {
      const delRef = await addDoc(collection(db, COLLECTIONS.DELIVERIES), {
        deliveryNumber:   form.deliveryNumber.trim(),
        recipientName:    form.recipientName.trim(),
        recipientAddress: form.recipientAddress.trim(),
        recipientPhone:   form.recipientPhone.trim(),
        driverName:       form.driverName.trim(),
        vehiclePlate:     form.vehiclePlate.trim(),
        scheduledDate:    form.scheduledDate ? Timestamp.fromDate(new Date(form.scheduledDate)) : null,
        notes:            form.notes.trim(),
        status:           'scheduled',
        itemCount:        form.items.filter((i) => i.description).length,
        createdBy:        user?.uid || '',
        createdAt:        serverTimestamp(),
        updatedAt:        serverTimestamp(),
      });
      // Save items
      for (const item of form.items.filter((i) => i.description)) {
        await addDoc(collection(db, COLLECTIONS.DELIVERY_ITEMS), {
          deliveryId: delRef.id, ...item, createdAt: serverTimestamp(),
        });
      }
      await logActivity({ type: 'delivery_created', description: `Delivery scheduled for ${form.recipientName}`, userId: user?.uid });
      setAddOpen(false); resetForm();
    } catch (e) { setSaveError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !statusOpen) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.DELIVERIES, statusOpen.id), {
        status: newStatus, updatedAt: serverTimestamp(),
        ...(newStatus === 'delivered' ? { deliveredAt: serverTimestamp() } : {}),
        ...(newStatus === 'dispatched' ? { dispatchedAt: serverTimestamp() } : {}),
      });
      await logActivity({ type: 'delivery_updated', description: `Delivery ${statusOpen.deliveryNumber || statusOpen.id} status → ${newStatus}`, userId: user?.uid });
      setStatusOpen(null); setNewStatus('');
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit: 'pcs' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, val) => {
    const items = [...form.items]; items[i] = { ...items[i], [field]: val }; setForm({ ...form, items });
  };

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Logistics & Deliveries</Typography>
            <Typography variant="body2" color="text.secondary">Delivery scheduling, shipment tracking, and route coordination</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setAddOpen(true); }}>
            Schedule Delivery
          </Button>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Scheduled',   value: scheduledCount,  icon: <Schedule />,      color: 'text.secondary' },
            { label: 'In Transit',  value: inTransitCount,  icon: <LocalShipping />, color: 'warning.main' },
            { label: 'Delivered',   value: deliveredCount,  icon: <CheckCircle />,   color: 'success.main' },
            { label: 'Failed / Returned', value: failedCount, icon: <Refresh />,    color: 'error.main' },
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
              <TextField size="small" placeholder="Search recipient, driver, delivery #" value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 280 }} />
              <TextField select size="small" label="Status" value={statusFilter}
                onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="all">All</MenuItem>
                {Object.entries(DELIVERY_STATUSES).map(([k, v]) => (
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
                <TableCell>Delivery #</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>No deliveries found</TableCell></TableRow>
              ) : filtered.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell><Typography variant="caption" color="primary">{d.deliveryNumber || '—'}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{d.recipientName}</Typography>
                    {d.recipientPhone && <Typography variant="caption" color="text.secondary">{d.recipientPhone}</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="caption">{d.recipientAddress}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{d.driverName || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{d.vehiclePlate || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{d.scheduledDate ? formatDate(d.scheduledDate) : '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{d.itemCount || 0}</Typography></TableCell>
                  <TableCell><Chip label={(d.status || '').replace(/_/g, ' ')} size="small" color={STATUS_COLOR[d.status] || 'default'} /></TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="View"><IconButton size="small" onClick={() => setViewDel(d)}><Visibility fontSize="small" /></IconButton></Tooltip>
                      {d.status !== 'delivered' && d.status !== 'failed' && (
                        <Tooltip title="Update Status">
                          <IconButton size="small" color="primary" onClick={() => { setStatusOpen(d); setNewStatus(d.status); }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Add Delivery Dialog ──────────────────────────────────────── */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle fontWeight={700}>Schedule Delivery</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Delivery Number" size="small" value={form.deliveryNumber}
                  onChange={(e) => setForm({ ...form, deliveryNumber: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Recipient Name *" size="small" value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Recipient Phone" size="small" value={form.recipientPhone}
                  onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Delivery Address *" size="small" value={form.recipientAddress}
                  onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Driver Name" size="small" value={form.driverName}
                  onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Vehicle Plate #" size="small" value={form.vehiclePlate}
                  onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <DatePicker label="Scheduled Date" value={form.scheduledDate}
                  onChange={(v) => setForm({ ...form, scheduledDate: v })}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Items</Typography>
                <Stack spacing={1}>
                  {form.items.map((item, idx) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                      <TextField label="Description" size="small" sx={{ flex: 3 }} value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                      <TextField label="Qty" type="number" size="small" sx={{ flex: 1 }} value={item.quantity}
                        inputProps={{ min: 1 }} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                      <TextField label="Unit" size="small" sx={{ flex: 1 }} value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)} />
                      {form.items.length > 1 && (
                        <Button size="small" color="error" onClick={() => removeItem(idx)}>✕</Button>
                      )}
                    </Stack>
                  ))}
                  <Button size="small" onClick={addItem} sx={{ alignSelf: 'flex-start' }}>+ Add Item</Button>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Notes" size="small" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Schedule Delivery'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Update Status Dialog ─────────────────────────────────────── */}
        <Dialog open={!!statusOpen} onClose={() => setStatusOpen(null)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Update Delivery Status</DialogTitle>
          <Divider />
          {statusOpen && (
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {statusOpen.recipientName} — {statusOpen.deliveryNumber || statusOpen.id}
              </Typography>
              <Stepper activeStep={Math.max(0, stepIndex(statusOpen.status))} sx={{ mb: 3 }} alternativeLabel>
                {DELIVERY_STEPS.map((s) => <Step key={s}><StepLabel>{s.replace(/_/g, ' ')}</StepLabel></Step>)}
              </Stepper>
              <TextField fullWidth select label="New Status" size="small" value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}>
                {Object.entries(DELIVERY_STATUSES).map(([k, v]) => (
                  <MenuItem key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                ))}
              </TextField>
            </DialogContent>
          )}
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setStatusOpen(null)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleStatusUpdate} disabled={saving || !newStatus}>
              {saving ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── View Delivery Dialog ─────────────────────────────────────── */}
        <Dialog open={!!viewDel} onClose={() => setViewDel(null)} maxWidth="sm" fullWidth>
          {viewDel && (
            <>
              <DialogTitle fontWeight={700}>
                Delivery — {viewDel.recipientName}
                <Chip label={(viewDel.status || '').replace(/_/g, ' ')} size="small"
                  color={STATUS_COLOR[viewDel.status] || 'default'} sx={{ ml: 1 }} />
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: 2 }}>
                <Stepper activeStep={Math.max(0, stepIndex(viewDel.status))} sx={{ mb: 3 }} alternativeLabel>
                  {DELIVERY_STEPS.map((s) => <Step key={s}><StepLabel>{s.replace(/_/g, ' ')}</StepLabel></Step>)}
                </Stepper>
                <Grid container spacing={1.5}>
                  {[
                    ['Delivery #',  viewDel.deliveryNumber || '—'],
                    ['Phone',       viewDel.recipientPhone || '—'],
                    ['Driver',      viewDel.driverName || '—'],
                    ['Vehicle',     viewDel.vehiclePlate || '—'],
                    ['Scheduled',   viewDel.scheduledDate ? formatDate(viewDel.scheduledDate) : '—'],
                    ['Created',     viewDel.createdAt ? formatDateTime(viewDel.createdAt) : '—'],
                  ].map(([label, val]) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{val}</Typography>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Delivery Address</Typography>
                    <Typography variant="body2">{viewDel.recipientAddress}</Typography>
                  </Grid>
                </Grid>
                {viewDel.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{viewDel.notes}</Typography>
                  </Box>
                )}
              </DialogContent>
              <Divider />
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setViewDel(null)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </AppLayout>
  );
}
