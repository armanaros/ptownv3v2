import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider,
  Stack, InputAdornment, Tooltip, Alert, CircularProgress, Tab, Tabs,
} from '@mui/material';
import {
  Add, Search, Edit, Warning, CheckCircle, Inventory2,
  FilterList, LocalPharmacy, SwapHoriz,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import AppLayout from '@/components/layout/AppLayout';
import useAuth from '@/hooks/useAuth';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS, PRODUCT_CATEGORIES } from '@/config/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { logActivity } from '@/services/activity.service';

const STOCK_STATUS = (qty, threshold) => {
  if (qty <= 0)          return { label: 'Out of Stock',  color: 'error' };
  if (qty <= threshold)  return { label: 'Low Stock',     color: 'warning' };
  return                        { label: 'In Stock',      color: 'success' };
};

const EXPIRY_STATUS = (expiryDate) => {
  if (!expiryDate) return null;
  const d = expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate);
  const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0)   return { label: 'Expired',     color: 'error',   days: daysLeft };
  if (daysLeft <= 30) return { label: `${daysLeft}d`, color: 'error',   days: daysLeft };
  if (daysLeft <= 90) return { label: `${daysLeft}d`, color: 'warning', days: daysLeft };
  return                     { label: `${daysLeft}d`, color: 'success', days: daysLeft };
};

const EMPTY_BATCH = { batchNumber: '', quantity: 0, unitCost: 0, expiryDate: null, supplier: '', notes: '' };

export default function InventoryPage() {
  const { user } = useAuth();
  const [tab, setTab]           = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [catFilter, setCat]     = useState('all');
  const [stockFilter, setStock] = useState('all');

  // Stock-in dialog
  const [stockInOpen, setStockInOpen]   = useState(false);
  const [selectedProd, setSelectedProd] = useState(null);
  const [batch, setBatch]               = useState({ ...EMPTY_BATCH });
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');

  // Adjustment dialog
  const [adjOpen, setAdjOpen]     = useState(false);
  const [adjProd, setAdjProd]     = useState(null);
  const [adjQty, setAdjQty]       = useState(0);
  const [adjReason, setAdjReason] = useState('');

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.PRODUCTS), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'all' || p.category === catFilter;
    const qty = p.stockLevel || 0;
    const thr = p.lowStockThreshold || 10;
    const matchStock = stockFilter === 'all' ||
      (stockFilter === 'low'  && qty > 0 && qty <= thr) ||
      (stockFilter === 'out'  && qty <= 0) ||
      (stockFilter === 'ok'   && qty > thr);
    return matchSearch && matchCat && matchStock;
  });

  const totalProducts  = products.length;
  const lowStockCount  = products.filter((p) => { const q = p.stockLevel || 0; const t = p.lowStockThreshold || 10; return q > 0 && q <= t; }).length;
  const outOfStock     = products.filter((p) => (p.stockLevel || 0) <= 0).length;
  const nearExpiry     = products.filter((p) => {
    if (!p.nearestExpiry) return false;
    const d = p.nearestExpiry?.toDate ? p.nearestExpiry.toDate() : new Date(p.nearestExpiry);
    return Math.ceil((d - new Date()) / 86400000) <= 90;
  }).length;

  const openStockIn = (prod) => {
    setSelectedProd(prod);
    setBatch({ ...EMPTY_BATCH });
    setSaveError('');
    setStockInOpen(true);
  };

  const handleStockIn = async () => {
    if (!batch.batchNumber.trim()) { setSaveError('Batch number is required'); return; }
    if (!batch.quantity || batch.quantity <= 0) { setSaveError('Quantity must be greater than 0'); return; }
    setSaveError(''); setSaving(true);
    try {
      // Save batch record
      await addDoc(collection(db, COLLECTIONS.BATCHES), {
        productId:   selectedProd.id,
        productName: selectedProd.name,
        batchNumber: batch.batchNumber.trim(),
        quantity:    Number(batch.quantity),
        remaining:   Number(batch.quantity),
        unitCost:    Number(batch.unitCost) || 0,
        expiryDate:  batch.expiryDate || null,
        supplier:    batch.supplier?.trim() || '',
        notes:       batch.notes?.trim() || '',
        createdBy:   user?.uid || '',
        createdAt:   serverTimestamp(),
      });
      // Update product stock level
      const newStock = (selectedProd.stockLevel || 0) + Number(batch.quantity);
      const updates = { stockLevel: newStock, updatedAt: serverTimestamp() };
      if (batch.expiryDate) {
        const current = selectedProd.nearestExpiry?.toDate?.() || null;
        const incoming = batch.expiryDate?.toDate ? batch.expiryDate.toDate() : new Date(batch.expiryDate);
        if (!current || incoming < current) updates.nearestExpiry = batch.expiryDate;
      }
      await updateDoc(doc(db, COLLECTIONS.PRODUCTS, selectedProd.id), updates);
      await logActivity({ type: 'stock_in', description: `Stock-in: ${batch.quantity} units of ${selectedProd.name} (Batch: ${batch.batchNumber})`, userId: user?.uid });
      setStockInOpen(false);
    } catch (e) { setSaveError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const openAdjust = (prod) => {
    setAdjProd(prod); setAdjQty(0); setAdjReason(''); setAdjOpen(true);
  };

  const handleAdjust = async () => {
    if (!adjReason.trim()) return;
    setSaving(true);
    try {
      const newStock = Math.max(0, (adjProd.stockLevel || 0) + Number(adjQty));
      await updateDoc(doc(db, COLLECTIONS.PRODUCTS, adjProd.id), { stockLevel: newStock, updatedAt: serverTimestamp() });
      await logActivity({ type: 'inventory_adjustment', description: `Adjusted ${adjProd.name} by ${adjQty >= 0 ? '+' : ''}${adjQty} (${adjReason})`, userId: user?.uid });
      setAdjOpen(false);
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Inventory Management</Typography>
            <Typography variant="body2" color="text.secondary">Real-time stock monitoring, batch tracking, and expiry alerts</Typography>
          </Box>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Products',  value: totalProducts, icon: <Inventory2 />,    color: 'primary.main' },
            { label: 'Low Stock',       value: lowStockCount, icon: <Warning />,        color: 'warning.main' },
            { label: 'Out of Stock',    value: outOfStock,    icon: <Warning />,        color: 'error.main' },
            { label: 'Near Expiry',     value: nearExpiry,    icon: <LocalPharmacy />,  color: 'secondary.main' },
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
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Stock Overview" />
          <Tab label="Low Stock Alerts" />
          <Tab label="Near Expiry" />
        </Tabs>

        {/* Filters */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} alignItems="center">
              <FilterList fontSize="small" color="action" />
              <TextField size="small" placeholder="Search product or SKU" value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 220 }} />
              <TextField select size="small" label="Category" value={catFilter}
                onChange={(e) => setCat(e.target.value)} sx={{ minWidth: 160 }}>
                <MenuItem value="all">All Categories</MenuItem>
                {Object.entries(PRODUCT_CATEGORIES).map(([k, v]) => <MenuItem key={k} value={v}>{v}</MenuItem>)}
              </TextField>
              {tab === 0 && (
                <TextField select size="small" label="Stock Status" value={stockFilter}
                  onChange={(e) => setStock(e.target.value)} sx={{ minWidth: 140 }}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="ok">In Stock</MenuItem>
                  <MenuItem value="low">Low Stock</MenuItem>
                  <MenuItem value="out">Out of Stock</MenuItem>
                </TextField>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="center">Stock Level</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Nearest Expiry</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : (() => {
                const rows = tab === 0 ? filtered
                  : tab === 1 ? filtered.filter((p) => { const q = p.stockLevel || 0; const t = p.lowStockThreshold || 10; return q <= t; })
                  : filtered.filter((p) => {
                      if (!p.nearestExpiry) return false;
                      const d = p.nearestExpiry?.toDate ? p.nearestExpiry.toDate() : new Date(p.nearestExpiry);
                      return Math.ceil((d - new Date()) / 86400000) <= 90;
                    });
                return rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No products found</TableCell></TableRow>
                ) : rows.map((p) => {
                  const ss = STOCK_STATUS(p.stockLevel || 0, p.lowStockThreshold || 10);
                  const es = EXPIRY_STATUS(p.nearestExpiry);
                  return (
                    <TableRow key={p.id} hover sx={{ bgcolor: (p.stockLevel || 0) <= 0 ? 'error.50' : 'inherit' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                        {p.genericName && <Typography variant="caption" color="text.secondary">{p.genericName}</Typography>}
                      </TableCell>
                      <TableCell><Typography variant="caption">{p.category || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{p.sku || '—'}</Typography></TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={700} color={ss.color + '.main'}>
                          {p.stockLevel || 0} <Typography component="span" variant="caption">{p.unit || 'pcs'}</Typography>
                        </Typography>
                      </TableCell>
                      <TableCell align="center"><Chip label={ss.label} size="small" color={ss.color} /></TableCell>
                      <TableCell align="center">
                        {es ? <Chip label={es.label} size="small" color={es.color} /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                      </TableCell>
                      <TableCell align="right"><Typography variant="body2">{formatCurrency(p.price || 0)}</Typography></TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Stock In">
                            <IconButton size="small" color="primary" onClick={() => openStockIn(p)}><Add fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Adjust Stock">
                            <IconButton size="small" color="warning" onClick={() => openAdjust(p)}><SwapHoriz fontSize="small" /></IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Stock-In Dialog ─────────────────────────────────────────── */}
        <Dialog open={stockInOpen} onClose={() => setStockInOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Stock In — {selectedProd?.name}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Batch Number *" size="small" value={batch.batchNumber}
                  onChange={(e) => setBatch({ ...batch, batchNumber: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Quantity *" type="number" size="small"
                  inputProps={{ min: 1 }} value={batch.quantity}
                  onChange={(e) => setBatch({ ...batch, quantity: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Unit Cost (₱)" type="number" size="small"
                  inputProps={{ min: 0, step: 0.01 }} value={batch.unitCost}
                  onChange={(e) => setBatch({ ...batch, unitCost: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker label="Expiry Date" value={batch.expiryDate}
                  onChange={(v) => setBatch({ ...batch, expiryDate: v })}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Supplier" size="small" value={batch.supplier}
                  onChange={(e) => setBatch({ ...batch, supplier: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Notes" size="small" multiline rows={2} value={batch.notes}
                  onChange={(e) => setBatch({ ...batch, notes: e.target.value })} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
              <Typography variant="body2">
                Current stock: <strong>{selectedProd?.stockLevel || 0}</strong> → After stock-in: <strong>{(selectedProd?.stockLevel || 0) + Number(batch.quantity || 0)}</strong> {selectedProd?.unit || 'pcs'}
              </Typography>
            </Box>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setStockInOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleStockIn} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Stock In'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Adjust Dialog ───────────────────────────────────────────── */}
        <Dialog open={adjOpen} onClose={() => setAdjOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Adjust Stock — {adjProd?.name}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Current stock: <strong>{adjProd?.stockLevel || 0} {adjProd?.unit || 'pcs'}</strong>
              </Typography>
              <TextField fullWidth label="Adjustment (+ add / - deduct)" type="number" size="small"
                value={adjQty} onChange={(e) => setAdjQty(e.target.value)}
                helperText={`New stock will be: ${Math.max(0, (adjProd?.stockLevel || 0) + Number(adjQty || 0))} ${adjProd?.unit || 'pcs'}`} />
              <TextField fullWidth label="Reason *" size="small" value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="e.g. Damaged goods, Count correction, Return" />
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAdjOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" color="warning" onClick={handleAdjust}
              disabled={saving || !adjReason.trim()}>
              {saving ? 'Saving...' : 'Apply Adjustment'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}
