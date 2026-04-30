import { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Button,
  Box,
  Chip,
  Paper,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { demoBlock } from '@/utils/demoGuard';
import CategoryForm from './CategoryForm';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { createCategory, updateCategory, deleteCategory } from '@/services/menu.service';

const CategoryList = ({ categories, selectedId, onSelect }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleCreate = async (data) => {
    await createCategory(data);
    toast.success('Category created');
  };

  const handleUpdate = async (data) => {
    await updateCategory(editingCategory.id, data);
    toast.success('Category updated');
  };

  const handleDelete = async () => {
    if (demoBlock()) { setDeleteTarget(null); return; }
    try {
      await deleteCategory(deleteTarget.id);
      toast.success('Category deleted');
      if (selectedId === deleteTarget.id) onSelect(null);
    } catch (err) {
      toast.error(err.message);
    }
    setDeleteTarget(null);
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Categories</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={() => { setEditingCategory(null); setFormOpen(true); }}
        >
          Add
        </Button>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        <ListItemButton
          selected={selectedId === null}
          onClick={() => onSelect(null)}
          sx={{ borderRadius: 2, mb: 0.5 }}
        >
          <ListItemText primary="All Items" />
        </ListItemButton>
        {categories.map((cat) => (
          <ListItemButton
            key={cat.id}
            selected={selectedId === cat.id}
            onClick={() => onSelect(cat.id)}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {cat.name}
                  {cat.isActive === false && (
                    <Chip label="Inactive" size="small" color="default" />
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategory(cat);
                  setFormOpen(true);
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(cat);
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItemButton>
        ))}
      </List>

      {/* Category form dialog */}
      {formOpen && (
        <CategoryForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingCategory(null); }}
          onSave={editingCategory ? handleUpdate : handleCreate}
          category={editingCategory}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmColor="error"
      />
    </Paper>
  );
};

export default CategoryList;
