import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField, Button,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid2 as Grid, MenuItem, Switch, FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete, LocalOffer, ContentCopy } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { demoBlock } from '@/utils/demoGuard';
import { subscribeToCoupons, addCoupon, updateCoupon, deleteCoupon } from '@/services/coupon.service';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { formatCurrency } from '@/utils/formatters';

const initialForm = {
  code: '', type: 'percent', value: '', description: '',
  minOrderAmount: '', maxUses: '', active: true,
};

export default function CouponsTab() {
  const [coupons, setCoupons]       = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(initialForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    return subscribeToCoupons(setCoupons);
  }, []);

  const handleOpenAdd = () => { setEditingId(null); setForm(initialForm); setDialogOpen(true); };

  const handleOpenEdit = (coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code, type: coupon.type || 'percent', value: coupon.value,
      description: coupon.description || '', minOrderAmount: coupon.minOrderAmount || '',
      maxUses: coupon.maxUses || '', active: coupon.active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.value) { toast.error('Code and discount value are required'); return; }
    try {
      const data = {
        code: form.code.toUpperCase().trim(), type: form.type, value: parseFloat(form.value),
        description: form.description || '',
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        active: form.active,
      };
      if (editingId) { await updateCoupon(editingId, data); toast.success('Coupon updated'); }
      else            { await addCoupon(data);               toast.success('Coupon created'); }
      setDialogOpen(false);
    } catch { toast.error('Failed to save coupon'); }
  };

  const handleDelete = async () => {
    if (demoBlock()) { setDeleteTarget(null); return; }
    try { await deleteCoupon(deleteTarget.id); toast.success('Coupon deleted'); }
    catch { toast.error('Failed to delete coupon'); }
    finally { setDeleteTarget(null); }
  };

  const handleToggle = async (coupon) => {
    try {
      await updateCoupon(coupon.id, { active: !coupon.active });
      toast.success(coupon.active ? 'Coupon disabled' : 'Coupon enabled');
    } catch { toast.error('Failed to toggle coupon'); }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalOffer sx={{ fontSize: 32, color: 'secondary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Coupons & Discounts</Typography>
              <Typography variant="body2" color="text.secondary">Manage promotional discount codes</Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>Add Coupon</Button>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Discount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Min Order</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Uses</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No coupons created yet
                  </TableCell>
                </TableRow>
              ) : coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip label={coupon.code} variant="outlined" size="small"
                        sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5 }} />
                      <IconButton size="small"
                        onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success('Copied!'); }}
                        sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
                        <ContentCopy sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {coupon.type === 'percent' ? `${coupon.value}% off` : `${formatCurrency(coupon.value)} off`}
                  </TableCell>
                  <TableCell>{coupon.minOrderAmount ? formatCurrency(coupon.minOrderAmount) : '—'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${coupon.usedCount || 0} / ${coupon.maxUses ?? '∞'}`}
                      size="small"
                      color={coupon.maxUses && coupon.usedCount >= coupon.maxUses ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch checked={!!coupon.active} onChange={() => handleToggle(coupon)} size="small" color="success" />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenEdit(coupon)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(coupon)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create/Edit dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingId ? 'Edit Coupon' : 'Add New Coupon'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Coupon Code" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. SAVE20" inputProps={{ style: { textTransform: 'uppercase' } }} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField select fullWidth label="Discount Type" value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <MenuItem value="percent">Percentage (%)</MenuItem>
                  <MenuItem value="fixed">Fixed Amount (₱)</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Discount Value" type="number" value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  InputProps={{ endAdornment: form.type === 'percent' ? '%' : '₱' }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Description" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional note for this coupon" size="small" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Min Order Amount" type="number" value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  InputProps={{ startAdornment: '₱' }} helperText="Optional" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Max Uses" type="number" value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  helperText="Leave empty for unlimited" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} color="success" />}
                  label="Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </Dialog>
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Coupon"
        message={`Delete coupon "${deleteTarget?.code}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmColor="error"
      />
    </Card>
  );
}
