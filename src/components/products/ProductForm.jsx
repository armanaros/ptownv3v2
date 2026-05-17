import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Switch, FormControlLabel,
  MenuItem, Grid2 as Grid, InputAdornment, Typography, Divider,
} from '@mui/material';
import {
  MedicalServices, QrCode, Medication, Business,
} from '@mui/icons-material';

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup / Suspension', 'Solution',
  'Injection / Vial', 'Cream / Ointment', 'Drops',
  'Inhaler', 'Patch', 'Suppository', 'Powder', 'Other',
];

const UNITS = ['piece', 'box', 'bottle', 'vial', 'sachet', 'ampoule', 'strip', 'tube', 'pack'];

const EMPTY = {
  name: '', genericName: '', manufacturer: '', dosageForm: '',
  strength: '', unit: 'piece', categoryId: '',
  price: '', costPrice: '', stockLevel: '', reorderLevel: '10',
  barcode: '', requiresPrescription: false,
  isAvailable: true, isActive: true, notes: '', imageUrl: '',
};

const ProductForm = ({ open, onClose, onSave, product = null, categories = [] }) => {
  const isEdit = !!product;
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(product ? {
        name:                 product.name                || '',
        genericName:          product.genericName         || '',
        manufacturer:         product.manufacturer        || '',
        dosageForm:           product.dosageForm          || '',
        strength:             product.strength            || '',
        unit:                 product.unit                || 'piece',
        categoryId:           product.categoryId          || '',
        price:                product.price?.toString()   || '',
        costPrice:            product.costPrice?.toString()|| '',
        stockLevel:           product.stockLevel?.toString()|| '',
        reorderLevel:         product.reorderLevel?.toString() || '10',
        barcode:              product.barcode             || '',
        requiresPrescription: product.requiresPrescription === true,
        isAvailable:          product.isAvailable         !== false,
        isActive:             product.isActive            !== false,
        notes:                product.notes               || '',
        imageUrl:             product.imageUrl            || '',
      } : EMPTY);
    }
  }, [open, product]);

  const set = (field) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        price:        Number(form.price),
        costPrice:    Number(form.costPrice  || 0),
        stockLevel:   Number(form.stockLevel || 0),
        reorderLevel: Number(form.reorderLevel || 10),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MedicalServices color="primary" />
          {isEdit ? 'Edit Product' : 'Add Pharmaceutical Product'}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>

            {/* ── Basic Info ── */}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
              PRODUCT INFORMATION
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Brand / Product Name" value={form.name} onChange={set('name')}
                  required fullWidth autoFocus
                  InputProps={{ startAdornment: <InputAdornment position="start"><MedicalServices fontSize="small" /></InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Generic Name" value={form.genericName} onChange={set('genericName')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Manufacturer / Supplier" value={form.manufacturer} onChange={set('manufacturer')} fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><Business fontSize="small" /></InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Category" value={form.categoryId} onChange={set('categoryId')} fullWidth>
                  <MenuItem value=""><em>— Select Category —</em></MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Divider />

            {/* ── Pharmaceutical Details ── */}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
              PHARMACEUTICAL DETAILS
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Dosage Form" value={form.dosageForm} onChange={set('dosageForm')} fullWidth>
                  <MenuItem value=""><em>— Select —</em></MenuItem>
                  {DOSAGE_FORMS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Strength / Concentration" value={form.strength} onChange={set('strength')}
                  fullWidth placeholder="e.g. 500mg, 10ml"
                  InputProps={{ startAdornment: <InputAdornment position="start"><Medication fontSize="small" /></InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Unit of Measure" value={form.unit} onChange={set('unit')} fullWidth>
                  {UNITS.map((u) => <MenuItem key={u} value={u} sx={{ textTransform: 'capitalize' }}>{u}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Barcode / SKU" value={form.barcode} onChange={set('barcode')} fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><QrCode fontSize="small" /></InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch checked={form.requiresPrescription} onChange={set('requiresPrescription')} color="warning" />}
                  label="Requires Prescription (Rx)"
                />
              </Grid>
            </Grid>

            <Divider />

            {/* ── Pricing & Stock ── */}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
              PRICING & STOCK
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Selling Price" type="number" value={form.price} onChange={set('price')}
                  required fullWidth inputProps={{ min: 0, step: '0.01' }}
                  InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Cost Price" type="number" value={form.costPrice} onChange={set('costPrice')}
                  fullWidth inputProps={{ min: 0, step: '0.01' }}
                  InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Current Stock" type="number" value={form.stockLevel} onChange={set('stockLevel')}
                  fullWidth inputProps={{ min: 0 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Reorder Level" type="number" value={form.reorderLevel} onChange={set('reorderLevel')}
                  fullWidth inputProps={{ min: 0 }} helperText="Alert threshold" />
              </Grid>
            </Grid>

            <Divider />

            {/* ── Additional ── */}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
              ADDITIONAL
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Notes" value={form.notes} onChange={set('notes')}
                  multiline rows={2} fullWidth placeholder="Storage instructions, handling notes…" />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Image URL" value={form.imageUrl} onChange={set('imageUrl')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={form.isAvailable} onChange={set('isAvailable')} />}
                  label="POS Available"
                />
                {isEdit && (
                  <FormControlLabel
                    control={<Switch checked={form.isActive} onChange={set('isActive')} />}
                    label="Active"
                  />
                )}
              </Grid>
            </Grid>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Add Product'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductForm;
