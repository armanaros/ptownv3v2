import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid2 as Grid,
  Chip,
  IconButton,
  Switch,
  Stack,
} from '@mui/material';
import { Add, Edit, Delete, Restaurant, Public, PointOfSale } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { demoBlock } from '@/utils/demoGuard';
import MenuItemForm from './MenuItemForm';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { createItem, updateItem, deleteItem } from '@/services/menu.service';
import { formatCurrency } from '@/utils/formatters';

const MenuItemList = ({ items, categories, selectedCategoryId }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredItems = selectedCategoryId
    ? items.filter((item) => item.categoryId === selectedCategoryId)
    : items;

  const getCategoryName = (catId) => {
    return categories.find((c) => c.id === catId)?.name || 'Uncategorized';
  };

  const handleCreate = async (data) => {
    await createItem(data);
    toast.success('Item created');
  };

  const handleUpdate = async (data) => {
    await updateItem(editingItem.id, data);
    toast.success('Item updated');
  };

  const handleDelete = async () => {
    if (demoBlock()) { setDeleteTarget(null); return; }
    await deleteItem(deleteTarget.id);
    toast.success('Item deleted');
    setDeleteTarget(null);
  };

  const handleToggleAvailability = async (item) => {
    await updateItem(item.id, { isAvailable: !item.isAvailable });
    toast.success(item.isAvailable ? 'Item marked unavailable' : 'Item marked available');
  };

  if (filteredItems.length === 0 && !formOpen) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Menu Items</Typography>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setEditingItem(null); setFormOpen(true); }}>
            Add Item
          </Button>
        </Box>
        <EmptyState
          title="No menu items"
          message={selectedCategoryId ? 'No items in this category yet.' : 'Add your first menu item to get started.'}
        />
        {formOpen && (
          <MenuItemForm
            open={formOpen}
            onClose={() => { setFormOpen(false); setEditingItem(null); }}
            onSave={handleCreate}
            categories={categories}
          />
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Menu Items ({filteredItems.length})
        </Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setEditingItem(null); setFormOpen(true); }}>
          Add Item
        </Button>
      </Box>

      <Grid container spacing={2}>
        {filteredItems.map((item) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 6, lg: 4 }}>
            <Card
              sx={{
                opacity: item.isAvailable ? 1 : 0.6,
                border: item.stockLevel <= (item.lowStockThreshold || 5) && item.stockLevel > 0
                  ? '2px solid'
                  : undefined,
                borderColor: 'warning.main',
              }}
            >
              {item.imageUrl ? (
                <CardMedia
                  component="img"
                  height="140"
                  image={item.imageUrl}
                  alt={item.name}
                  sx={{ objectFit: 'cover' }}
                />
              ) : (
                <Box
                  sx={{
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                  }}
                >
                  <Restaurant sx={{ fontSize: 32, color: 'text.disabled' }} />
                </Box>
              )}
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {getCategoryName(item.categoryId)}
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                    {formatCurrency(item.price)}
                  </Typography>
                </Box>

                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
                    {item.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    label={`Stock: ${item.stockLevel || 0}`}
                    size="small"
                    color={
                      (item.stockLevel || 0) <= 0
                        ? 'error'
                        : (item.stockLevel || 0) <= (item.lowStockThreshold || 5)
                        ? 'warning'
                        : 'success'
                    }
                    variant="outlined"
                  />
                  <Chip
                    label={`${item.preparationTime || 15} min`}
                    size="small"
                    variant="outlined"
                  />
                  {item.availableOnline !== false && (
                    <Chip icon={<Public sx={{ fontSize: '14px !important' }} />} label="Online" size="small" color="primary" variant="outlined" />
                  )}
                  {item.availableOnPOS !== false && (
                    <Chip icon={<PointOfSale sx={{ fontSize: '14px !important' }} />} label="POS" size="small" color="secondary" variant="outlined" />
                  )}
                </Stack>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
                  <Switch
                    size="small"
                    checked={item.isAvailable}
                    onChange={() => handleToggleAvailability(item)}
                  />
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingItem(item);
                        setFormOpen(true);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(item)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Item form dialog */}
      {formOpen && (
        <MenuItemForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingItem(null); }}
          onSave={editingItem ? handleUpdate : handleCreate}
          item={editingItem}
          categories={categories}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default MenuItemList;
