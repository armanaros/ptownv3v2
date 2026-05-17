import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider,
  Stack, InputAdornment, Tooltip, Alert, CircularProgress, Tabs, Tab,
  LinearProgress, Avatar,
} from '@mui/material';
import {
  Add, Search, Visibility, FilterList, Edit, Person,
  Assignment, TrendingUp, CheckCircle, Warning,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import useAuth from '@/hooks/useAuth';
import { subscribeToUsers, updateUser } from '@/services/user.service';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { logActivity } from '@/services/activity.service';

const STATUS_COLOR = { active: 'success', inactive: 'default', on_leave: 'warning' };
const REP_STATUSES = ['active', 'inactive', 'on_leave'];

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function MedicalRepsPage() {
  const { user } = useAuth();
  const [tab, setTab]         = useState(0);
  const [reps, setReps]       = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [viewRep, setViewRep] = useState(null);
  const [assignOpen, setAssignOpen] = useState(null); // rep to assign stock/territory to
  const [salesOpen, setSalesOpen]   = useState(null); // rep to encode sales for
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');
  const [users, setUsers] = useState([]);

  const managerUsers = users.filter((u) => ['super_admin', 'ceo', 'admin'].includes(u.role));
  const salesRepUsers = users.filter((u) => u.role === 'sales_rep');

  const [form, setForm] = useState({
    name: '', phone: '', email: '', territory: '', address: '',
    status: 'active', quotaMonthly: 0, notes: '',
    managerId: '', userId: '',
  });
  const [assignForm, setAssignForm] = useState({ productName: '', quantity: 0, batchNumber: '', territory: '', notes: '' });
  const [salesForm, setSalesForm]   = useState({ customerName: '', productName: '', quantity: 0, unitPrice: 0, notes: '' });

  useEffect(() => {
    const q1 = query(collection(db, COLLECTIONS.MEDICAL_REPS), orderBy('createdAt', 'desc'));
    const q2 = query(collection(db, COLLECTIONS.REP_ASSIGNMENTS), orderBy('createdAt', 'desc'));
    const unsub1 = onSnapshot(q1, (snap) => {
      setReps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsub2 = onSnapshot(q2, (snap) => {
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsub3 = subscribeToUsers(setUsers);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const filteredReps = reps.filter((r) => {
    const matchSearch = !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.territory?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = reps.filter((r) => r.status === 'active').length;
  const totalSales  = assignments.filter((a) => a.type === 'sale').reduce((s, a) => s + (a.totalAmount || 0), 0);
  const totalAssigned = assignments.filter((a) => a.type === 'stock').reduce((s, a) => s + (a.quantity || 0), 0);

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', territory: '', address: '', status: 'active', quotaMonthly: 0, notes: '', managerId: '', userId: '' });
    setSaveError('');
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { setSaveError('Rep name is required'); return; }
    setSaveError(''); setSaving(true);
    try {
      const repRef = await addDoc(collection(db, COLLECTIONS.MEDICAL_REPS), {
        name:          form.name.trim(),
        phone:         form.phone.trim(),
        email:         form.email.trim(),
        territory:     form.territory.trim(),
        address:       form.address.trim(),
        status:        form.status,
        quotaMonthly:  Number(form.quotaMonthly),
        salesThisMonth: 0,
        notes:         form.notes.trim(),
        managerId:     form.managerId || '',
        userId:        form.userId || '',
        createdBy:     user?.uid || '',
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });
      // Link the system account to this rep and propagate managerId
      if (form.userId) {
        await updateUser(form.userId, {
          managerId: form.managerId || '',
          repId:     repRef.id,
        });
      }
      await logActivity({ type: 'med_rep_added', description: `Medical rep ${form.name} added`, userId: user?.uid });
      setAddOpen(false); resetForm();
    } catch (e) { setSaveError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignForm.productName.trim() || !assignForm.quantity) return;
    setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.REP_ASSIGNMENTS), {
        repId:        assignOpen.id,
        repName:      assignOpen.name,
        type:         'stock',
        productName:  assignForm.productName.trim(),
        quantity:     Number(assignForm.quantity),
        batchNumber:  assignForm.batchNumber.trim(),
        territory:    assignForm.territory.trim() || assignOpen.territory,
        notes:        assignForm.notes.trim(),
        status:       'active',
        createdBy:    user?.uid || '',
        createdAt:    serverTimestamp(),
      });
      await logActivity({ type: 'stock_assigned', description: `${assignForm.quantity} units of ${assignForm.productName} assigned to ${assignOpen.name}`, userId: user?.uid });
      setAssignOpen(null); setAssignForm({ productName: '', quantity: 0, batchNumber: '', territory: '', notes: '' });
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleEncodeSale = async () => {
    if (!salesForm.customerName.trim() || !salesForm.productName.trim()) return;
    const totalAmount = Number(salesForm.quantity) * Number(salesForm.unitPrice);
    setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.REP_ASSIGNMENTS), {
        repId:        salesOpen.id,
        repName:      salesOpen.name,
        type:         'sale',
        customerName: salesForm.customerName.trim(),
        productName:  salesForm.productName.trim(),
        quantity:     Number(salesForm.quantity),
        unitPrice:    Number(salesForm.unitPrice),
        totalAmount,
        notes:        salesForm.notes.trim(),
        status:       'encoded',
        createdBy:    user?.uid || '',
        createdAt:    serverTimestamp(),
      });
      // update monthly sales on rep doc
      const repDoc = doc(db, COLLECTIONS.MEDICAL_REPS, salesOpen.id);
      await updateDoc(repDoc, {
        salesThisMonth: (salesOpen.salesThisMonth || 0) + totalAmount,
        updatedAt:      serverTimestamp(),
      });
      await logActivity({ type: 'rep_sale_encoded', description: `Sale of ${formatCurrency(totalAmount)} encoded for ${salesOpen.name}`, userId: user?.uid });
      setSalesOpen(null); setSalesForm({ customerName: '', productName: '', quantity: 0, unitPrice: 0, notes: '' });
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  const repSales = (repId) => assignments.filter((a) => a.repId === repId && a.type === 'sale');
  const repStock = (repId) => assignments.filter((a) => a.repId === repId && a.type === 'stock');

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Medical Representatives</Typography>
            <Typography variant="body2" color="text.secondary">Territory management, assigned stock monitoring, and performance tracking</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setAddOpen(true); }}>
            Add Rep
          </Button>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Reps',       value: reps.length,     icon: <Person />,     color: 'primary.main' },
            { label: 'Active',           value: activeCount,     icon: <CheckCircle />, color: 'success.main' },
            { label: 'Total Sales',      value: formatCurrency(totalSales), icon: <TrendingUp />, color: 'warning.main' },
            { label: 'Units Assigned',   value: totalAssigned,   icon: <Assignment />,  color: 'info.main' },
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

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Representatives" />
          <Tab label="Assigned Stock" />
          <Tab label="Encoded Sales" />
        </Tabs>

        {/* ── Tab 0: Representatives ───────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          {/* Filters */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} alignItems="center">
                <FilterList fontSize="small" color="action" />
                <TextField size="small" placeholder="Search rep or territory" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                  sx={{ minWidth: 240 }} />
                <TextField select size="small" label="Status" value={statusFilter}
                  onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130 }}>
                  <MenuItem value="all">All</MenuItem>
                  {REP_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            {loading ? (
              <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Grid>
            ) : filteredReps.length === 0 ? (
              <Grid item xs={12} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No medical reps found</Grid>
            ) : filteredReps.map((rep) => {
              const quota = rep.quotaMonthly || 0;
              const sales = rep.salesThisMonth || 0;
              const pct   = quota > 0 ? Math.min(100, (sales / quota) * 100) : 0;
              return (
                <Grid item xs={12} sm={6} md={4} key={rep.id}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                          {rep.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={700}>{rep.name}</Typography>
                          <Chip label={rep.status} size="small" color={STATUS_COLOR[rep.status] || 'default'} />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary">Territory: </Typography>
                      <Typography variant="body2" component="span">{rep.territory || '—'}</Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">Phone: </Typography>
                      <Typography variant="body2" component="span">{rep.phone || '—'}</Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">Manager: </Typography>
                      <Typography variant="body2" component="span">
                        {rep.managerId
                          ? (managerUsers.find((u) => u.id === rep.managerId)
                              ? `${managerUsers.find((u) => u.id === rep.managerId).firstName || ''} ${managerUsers.find((u) => u.id === rep.managerId).lastName || ''}`.trim() || 'Assigned'
                              : 'Assigned')
                          : <em style={{ color: '#aaa' }}>Unassigned</em>}
                      </Typography>

                      {quota > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Monthly Quota</Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {formatCurrency(sales)} / {formatCurrency(quota)}
                            </Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }}
                            color={pct >= 100 ? 'success' : pct >= 50 ? 'warning' : 'error'} />
                        </Box>
                      )}

                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => setViewRep(rep)}>
                          View
                        </Button>
                        <Button size="small" variant="outlined" color="info" startIcon={<Assignment />}
                          onClick={() => { setAssignOpen(rep); setAssignForm({ productName: '', quantity: 0, batchNumber: '', territory: rep.territory || '', notes: '' }); }}>
                          Assign
                        </Button>
                        <Button size="small" variant="outlined" color="success" startIcon={<TrendingUp />}
                          onClick={() => { setSalesOpen(rep); setSalesForm({ customerName: '', productName: '', quantity: 0, unitPrice: 0, notes: '' }); }}>
                          Sale
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        {/* ── Tab 1: Assigned Stock ────────────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                  <TableCell>Rep</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Batch #</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Territory</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.filter((a) => a.type === 'stock').length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No stock assignments yet</TableCell></TableRow>
                ) : assignments.filter((a) => a.type === 'stock').map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{a.repName}</Typography></TableCell>
                    <TableCell>{a.productName}</TableCell>
                    <TableCell><Typography variant="caption">{a.batchNumber || '—'}</Typography></TableCell>
                    <TableCell align="right">{a.quantity}</TableCell>
                    <TableCell>{a.territory || '—'}</TableCell>
                    <TableCell><Typography variant="caption">{a.createdAt ? formatDate(a.createdAt) : '—'}</Typography></TableCell>
                    <TableCell><Chip label={a.status || 'active'} size="small" color="success" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── Tab 2: Encoded Sales ─────────────────────────────────────── */}
        <TabPanel value={tab} index={2}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                  <TableCell>Rep</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.filter((a) => a.type === 'sale').length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No sales encoded yet</TableCell></TableRow>
                ) : assignments.filter((a) => a.type === 'sale').map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{a.repName}</Typography></TableCell>
                    <TableCell>{a.customerName}</TableCell>
                    <TableCell>{a.productName}</TableCell>
                    <TableCell align="right">{a.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(a.unitPrice || 0)}</TableCell>
                    <TableCell align="right"><Typography fontWeight={700} color="success.main">{formatCurrency(a.totalAmount || 0)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{a.createdAt ? formatDate(a.createdAt) : '—'}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── Add Rep Dialog ───────────────────────────────────────────── */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Add Medical Representative</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name *" size="small" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone" size="small" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" size="small" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Territory" size="small" value={form.territory}
                  onChange={(e) => setForm({ ...form, territory: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Address" size="small" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Status" size="small" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {REP_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Monthly Quota (₱)" type="number" size="small"
                  inputProps={{ min: 0 }} value={form.quotaMonthly}
                  onChange={(e) => setForm({ ...form, quotaMonthly: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Notes" size="small" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Assigned Manager" size="small" value={form.managerId}
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                  helperText="Manager who approves this rep's orders">
                  <MenuItem value=""><em>None</em></MenuItem>
                  {managerUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username} ({u.role.replace(/_/g, ' ')})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Linked System Account" size="small" value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  helperText="Optional: rep's login account">
                  <MenuItem value=""><em>None</em></MenuItem>
                  {salesRepUsers.filter((u) => !reps.some((r) => r.userId === u.id) || u.id === form.userId).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Add Rep'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Assign Stock Dialog ──────────────────────────────────────── */}
        <Dialog open={!!assignOpen} onClose={() => setAssignOpen(null)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Assign Stock to {assignOpen?.name}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField fullWidth label="Product Name *" size="small" value={assignForm.productName}
                onChange={(e) => setAssignForm({ ...assignForm, productName: e.target.value })} />
              <TextField fullWidth label="Quantity *" type="number" size="small"
                inputProps={{ min: 1 }} value={assignForm.quantity}
                onChange={(e) => setAssignForm({ ...assignForm, quantity: e.target.value })} />
              <TextField fullWidth label="Batch Number" size="small" value={assignForm.batchNumber}
                onChange={(e) => setAssignForm({ ...assignForm, batchNumber: e.target.value })} />
              <TextField fullWidth label="Territory" size="small" value={assignForm.territory}
                onChange={(e) => setAssignForm({ ...assignForm, territory: e.target.value })} />
              <TextField fullWidth label="Notes" size="small" value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} />
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAssignOpen(null)} disabled={saving}>Cancel</Button>
            <Button variant="contained" color="info" onClick={handleAssign} disabled={saving}>
              {saving ? 'Assigning...' : 'Assign Stock'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Encode Sale Dialog ───────────────────────────────────────── */}
        <Dialog open={!!salesOpen} onClose={() => setSalesOpen(null)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Encode Sale — {salesOpen?.name}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField fullWidth label="Customer Name *" size="small" value={salesForm.customerName}
                onChange={(e) => setSalesForm({ ...salesForm, customerName: e.target.value })} />
              <TextField fullWidth label="Product Name *" size="small" value={salesForm.productName}
                onChange={(e) => setSalesForm({ ...salesForm, productName: e.target.value })} />
              <TextField fullWidth label="Quantity" type="number" size="small"
                inputProps={{ min: 1 }} value={salesForm.quantity}
                onChange={(e) => setSalesForm({ ...salesForm, quantity: e.target.value })} />
              <TextField fullWidth label="Unit Price (₱)" type="number" size="small"
                inputProps={{ min: 0, step: 0.01 }} value={salesForm.unitPrice}
                onChange={(e) => setSalesForm({ ...salesForm, unitPrice: e.target.value })} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
                Total: <strong>{formatCurrency((salesForm.quantity || 0) * (salesForm.unitPrice || 0))}</strong>
              </Typography>
              <TextField fullWidth label="Notes" size="small" value={salesForm.notes}
                onChange={(e) => setSalesForm({ ...salesForm, notes: e.target.value })} />
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSalesOpen(null)} disabled={saving}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handleEncodeSale} disabled={saving}>
              {saving ? 'Encoding...' : 'Encode Sale'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── View Rep Dialog ──────────────────────────────────────────── */}
        <Dialog open={!!viewRep} onClose={() => setViewRep(null)} maxWidth="sm" fullWidth>
          {viewRep && (
            <>
              <DialogTitle fontWeight={700}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>{viewRep.name?.charAt(0)}</Avatar>
                  {viewRep.name}
                  <Chip label={viewRep.status} size="small" color={STATUS_COLOR[viewRep.status] || 'default'} />
                </Box>
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: 2 }}>
                <Grid container spacing={1.5}>
                  {[
                    ['Territory', viewRep.territory || '—'],
                    ['Phone',     viewRep.phone || '—'],
                    ['Email',     viewRep.email || '—'],
                    ['Address',   viewRep.address || '—'],
                  ].map(([label, val]) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{val}</Typography>
                    </Grid>
                  ))}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Assigned Manager</Typography>
                    <Typography variant="body2">
                      {viewRep.managerId
                        ? (() => { const m = managerUsers.find((u) => u.id === viewRep.managerId); return m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.username : 'Unknown'; })()
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">System Account</Typography>
                    <Typography variant="body2">
                      {viewRep.userId
                        ? (() => { const u = users.find((u) => u.id === viewRep.userId); return u ? (u.username || `${u.firstName} ${u.lastName}`.trim()) : 'Linked'; })()
                        : '—'}
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={1} sx={{ textAlign: 'center' }}>
                  {[
                    ['Monthly Quota',   formatCurrency(viewRep.quotaMonthly || 0), 'primary.main'],
                    ['Sales This Month', formatCurrency(viewRep.salesThisMonth || 0), 'success.main'],
                    ['Assigned Stock',  repStock(viewRep.id).reduce((s, a) => s + (a.quantity || 0), 0) + ' units', 'info.main'],
                  ].map(([label, val, color]) => (
                    <Grid item xs={4} key={label}>
                      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="subtitle2" fontWeight={700} color={color}>{val}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {viewRep.quotaMonthly > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Quota Achievement</Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {Math.round(Math.min(100, ((viewRep.salesThisMonth || 0) / viewRep.quotaMonthly) * 100))}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, ((viewRep.salesThisMonth || 0) / viewRep.quotaMonthly) * 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={((viewRep.salesThisMonth || 0) / viewRep.quotaMonthly) >= 1 ? 'success' : ((viewRep.salesThisMonth || 0) / viewRep.quotaMonthly) >= 0.5 ? 'warning' : 'error'}
                    />
                  </Box>
                )}
                {viewRep.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{viewRep.notes}</Typography>
                  </Box>
                )}
              </DialogContent>
              <Divider />
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setViewRep(null)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </AppLayout>
  );
}
