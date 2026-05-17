import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Switch, FormControlLabel,
} from '@mui/material';

const CategoryForm = ({ open, onClose, onSave, category = null }) => {
  const isEdit = !!category;
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name:        category?.name        || '',
        description: category?.description || '',
        sortOrder:   category?.sortOrder   ?? 0,
        isActive:    category?.isActive    !== false,
      });
    }
  }, [open, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, sortOrder: Number(form.sortOrder) });
      onClose();
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
            <TextField label="Category Name" value={form.name} required autoFocus fullWidth
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <TextField label="Description" value={form.description} multiline rows={2} fullWidth
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <TextField label="Sort Order" type="number" value={form.sortOrder} fullWidth
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} />
            {isEdit && (
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />}
                label="Active"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryForm;
