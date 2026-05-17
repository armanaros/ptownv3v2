import { useState } from 'react';
import {
  List, ListItemButton, ListItemText, ListItemSecondaryAction,
  IconButton, Typography, Button, Box, Chip, Paper,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CategoryForm from './CategoryForm';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { createCategory, updateCategory, deleteCategory } from '@/services/product.service';

const CategoryList = ({ categories, selectedId, onSelect }) => {
  const [formOpen, setFormOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleSave = async (data) => {
    if (editing) {
      await updateCategory(editing.id, data);
      toast.success('Category updated');
    } else {
      await createCategory(data);
      toast.success('Category created');
    }
  };

  const handleDelete = async () => {
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
        <Button variant="contained" size="small" startIcon={<Add />}
          onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add
        </Button>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        <ListItemButton selected={selectedId === null} onClick={() => onSelect(null)}
          sx={{ borderRadius: 2, mb: 0.5 }}>
          <ListItemText primary="All Products" secondary={`${categories.reduce((a, c) => a, 0)}`} />
        </ListItemButton>

        {categories.map((cat) => (
          <ListItemButton key={cat.id} selected={selectedId === cat.id}
            onClick={() => onSelect(cat.id)} sx={{ borderRadius: 2, mb: 0.5 }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {cat.name}
                  {cat.isActive === false && <Chip label="Inactive" size="small" />}
                </Box>
              }
              secondary={cat.description || ''}
            />
            <ListItemSecondaryAction>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditing(cat); setFormOpen(true); }}>
                <Edit fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(cat); }}>
                <Delete fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItemButton>
        ))}
      </List>

      <CategoryForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        category={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Paper>
  );
};

export default CategoryList;
