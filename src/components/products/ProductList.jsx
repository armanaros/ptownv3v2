import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid2 as Grid,
  Chip, IconButton, Stack, TextField, InputAdornment,
  Tooltip, Switch, FormControlLabel, Divider, LinearProgress,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, MedicalServices,
  WarningAmber, Medication, QrCode,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import ProductForm from './ProductForm';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { createProduct, updateProduct, deleteProduct } from '@/services/product.service';
import { formatCurrency } from '@/utils/formatters';

const ProductList = ({ products, categories, selectedCategoryId }) => {
  const [formOpen, setFormOpen]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]             = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const getCategory = (catId) => categories.find((c) => c.id === catId)?.name || '—';

  const filtered = products.filter((p) => {
    if (!showInactive && p.isActive === false) return false;
    if (selectedCategoryId && p.categoryId !== selectedCategoryId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.genericName?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.manufacturer?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = async (data) => {
    await createProduct(data);
    toast.success('Product added');
  };

  const handleUpdate = async (data) => {
    await updateProduct(editing.id, data);
    toast.success('Product updated');
  };

  const handleDelete = async () => {
    await deleteProduct(deleteTarget.id);
    toast.success('Product deleted');
    setDeleteTarget(null);
  };

  const handleToggleAvailability = async (p) => {
    await updateProduct(p.id, { isAvailable: !p.isAvailable });
    toast.success(!p.isAvailable ? 'Marked available on POS' : 'Removed from POS');
  };

  const stockPercent = (p) => {
    if (!p.reorderLevel) return 100;
    return Math.min(100, Math.round((p.stockLevel / (p.reorderLevel * 3)) * 100));
  };

  const stockColor = (p) => {
    if (p.stockLevel === 0) return 'error';
    if (p.stockLevel <= p.reorderLevel) return 'warning';
    return 'success';
  };

  return (
    <Box>
      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Products
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({filtered.length})
          </Typography>
        </Typography>
        <TextField
          size="small" placeholder="Search name, generic, barcode…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <FormControlLabel
          control={<Switch size="small" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
          label="Show inactive"
          sx={{ mr: 0 }}
        />
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add Product
        </Button>
      </Box>

      {filtered.length === 0 ? (
        <EmptyState
          title="No products found"
          message={search ? 'Try a different search term.' : 'Add your first pharmaceutical product to get started.'}
        />
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => {
            const isLowStock  = p.stockLevel > 0 && p.stockLevel <= p.reorderLevel;
            const isOutOfStock = p.stockLevel === 0;

            return (
              <Grid key={p.id} size={{ xs: 12, sm: 6, md: 6, lg: 4 }}>
                <Card
                  sx={{
                    opacity: p.isActive === false ? 0.55 : 1,
                    border: isOutOfStock ? '2px solid' : isLowStock ? '1px solid' : undefined,
                    borderColor: isOutOfStock ? 'error.main' : 'warning.main',
                    position: 'relative',
                  }}
                >
                  {/* Prescription badge */}
                  {p.requiresPrescription && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <Chip label="Rx" size="small" color="error" sx={{ fontWeight: 700 }} />
                    </Box>
                  )}

                  <CardContent>
                    {/* Product header */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                      <Box sx={{
                        width: 44, height: 44, borderRadius: 2,
                        bgcolor: 'primary.50', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {p.imageUrl
                          ? <Box component="img" src={p.imageUrl} sx={{ width: 44, height: 44, borderRadius: 2, objectFit: 'cover' }} />
                          : <Medication color="primary" />
                        }
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>{p.name}</Typography>
                        {p.genericName && (
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {p.genericName}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled" noWrap display="block">
                          {getCategory(p.categoryId)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Details row */}
                    <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                      {p.dosageForm && <Chip label={p.dosageForm} size="small" variant="outlined" />}
                      {p.strength   && <Chip label={p.strength}   size="small" variant="outlined" color="primary" />}
                      {p.unit       && <Chip label={`per ${p.unit}`} size="small" />}
                    </Stack>

                    {/* Barcode */}
                    {p.barcode && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <QrCode sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{p.barcode}</Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 1 }} />

                    {/* Price */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" color="primary" fontWeight={700}>
                        {formatCurrency(p.price)}
                      </Typography>
                      {p.costPrice > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Cost: {formatCurrency(p.costPrice)}
                        </Typography>
                      )}
                    </Box>

                    {/* Stock level */}
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color={`${stockColor(p)}.main`} fontWeight={600}>
                          {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'In Stock'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.stockLevel} / reorder @ {p.reorderLevel}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={stockPercent(p)}
                        color={stockColor(p)}
                        sx={{ borderRadius: 1, height: 5 }}
                      />
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <Tooltip title={p.isAvailable ? 'Available on POS' : 'Hidden from POS'}>
                        <Switch
                          size="small"
                          checked={p.isAvailable !== false}
                          onChange={() => handleToggleAvailability(p)}
                        />
                      </Tooltip>
                      <Box>
                        <IconButton size="small" onClick={() => { setEditing(p); setFormOpen(true); }}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(p)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={editing ? handleUpdate : handleCreate}
        product={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default ProductList;
