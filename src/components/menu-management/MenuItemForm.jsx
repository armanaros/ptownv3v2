import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Switch,
  FormControlLabel,
  MenuItem,
  Grid2 as Grid,
  InputAdornment,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Storefront, PointOfSale, Public } from '@mui/icons-material';

const MenuItemForm = ({ open, onClose, onSave, item = null, categories = [] }) => {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    costOfGoods: '',
    stockLevel: '',
    lowStockThreshold: '5',
    preparationTime: '15',
    sortOrder: '0',
    isAvailable: true,
    isActive: true,
    imageUrl: '',
    availableOnline: true,
    availableOnPOS: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        description: item.description || '',
        categoryId: item.categoryId || '',
        price: item.price?.toString() || '',
        costOfGoods: item.costOfGoods?.toString() || '',
        stockLevel: item.stockLevel?.toString() || '',
        lowStockThreshold: item.lowStockThreshold?.toString() || '5',
        preparationTime: item.preparationTime?.toString() || '15',
        sortOrder: item.sortOrder?.toString() || '0',
        isAvailable: item.isAvailable !== false,
        isActive: item.isActive !== false,
        imageUrl: item.imageUrl || '',
        availableOnline: item.availableOnline !== false,
        availableOnPOS: item.availableOnPOS !== false,
      });
    } else {
      setForm({
        name: '',
        description: '',
        categoryId: '',
        price: '',
        costOfGoods: '',
        stockLevel: '',
        lowStockThreshold: '5',
        preparationTime: '15',
        sortOrder: '0',
        isAvailable: true,
        isActive: true,
        imageUrl: '',
        availableOnline: true,
        availableOnPOS: true,
      });
    }
  }, [item]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.categoryId || !form.price) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        price: Number(form.price),
        costOfGoods: Number(form.costOfGoods || 0),
        stockLevel: Number(form.stockLevel || 0),
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        preparationTime: Number(form.preparationTime || 15),
        sortOrder: Number(form.sortOrder || 0),
        isAvailable: form.isAvailable,
        isActive: form.isActive,
        imageUrl: form.imageUrl.trim(),
        availableOnline: form.availableOnline,
        availableOnPOS: form.availableOnPOS,
      };

      await onSave(data);
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Image URL */}
            <TextField
              label="Image URL"
              value={form.imageUrl}
              onChange={handleChange('imageUrl')}
              fullWidth
              placeholder="https://..."
            />
            {form.imageUrl.trim() && (
              <Box
                component="img"
                src={form.imageUrl.trim()}
                alt="Preview"
                sx={{
                  width: '100%',
                  maxHeight: 180,
                  objectFit: 'cover',
                  borderRadius: 1,
                  display: 'block',
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
                onLoad={(e) => { e.target.style.display = 'block'; }}
              />
            )}

            <TextField
              label="Item Name"
              value={form.name}
              onChange={handleChange('name')}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Category"
              select
              value={form.categoryId}
              onChange={handleChange('categoryId')}
              required
              fullWidth
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={form.description}
              onChange={handleChange('description')}
              multiline
              rows={2}
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Price"
                  type="number"
                  value={form.price}
                  onChange={handleChange('price')}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Cost of Goods"
                  type="number"
                  value={form.costOfGoods}
                  onChange={handleChange('costOfGoods')}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Stock Level"
                  type="number"
                  value={form.stockLevel}
                  onChange={handleChange('stockLevel')}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Low Stock Alert"
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={handleChange('lowStockThreshold')}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Prep Time (min)"
                  type="number"
                  value={form.preparationTime}
                  onChange={handleChange('preparationTime')}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Sort Order"
                  type="number"
                  value={form.sortOrder}
                  onChange={handleChange('sortOrder')}
                  fullWidth
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isAvailable}
                  onChange={handleChange('isAvailable')}
                />
              }
              label="Available for ordering"
            />

            {/* Channel availability */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Available on</Typography>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.availableOnline}
                      onChange={handleChange('availableOnline')}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Public fontSize="small" />
                      <span>Online Orders</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.availableOnPOS}
                      onChange={handleChange('availableOnPOS')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PointOfSale fontSize="small" />
                      <span>POS</span>
                    </Box>
                  }
                />
              </Stack>
            </Box>
            {isEdit && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={handleChange('isActive')}
                  />
                }
                label="Active"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !form.name.trim() || !form.categoryId || !form.price}
          >
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MenuItemForm;
