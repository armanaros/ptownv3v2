import { useState } from 'react';
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
} from '@mui/material';

const CategoryForm = ({ open, onClose, onSave, category = null }) => {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    sortOrder: category?.sortOrder || 0,
    isActive: category?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        sortOrder: Number(form.sortOrder),
      });
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
        <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Category Name"
              value={form.name}
              onChange={handleChange('name')}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={handleChange('description')}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Sort Order"
              type="number"
              value={form.sortOrder}
              onChange={handleChange('sortOrder')}
              fullWidth
            />
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
          <Button type="submit" variant="contained" disabled={saving || !form.name.trim()}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryForm;
