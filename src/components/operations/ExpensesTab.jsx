import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField, Button,
  MenuItem, IconButton, Stack, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider,
} from '@mui/material';
import { Add, Delete, LocalAtm, Edit } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import toast from 'react-hot-toast';
import { addExpense, updateExpense, getExpensesByDateRange, deleteExpense } from '@/services/expense.service';
import { getManilaDayRange } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/formatters';
import useAuth from '@/hooks/useAuth';

const EXPENSE_CATEGORIES = [
  { value: 'ingredients',  label: 'Ingredients'   },
  { value: 'supplies',     label: 'Supplies'      },
  { value: 'utilities',    label: 'Utilities'     },
  { value: 'salary',       label: 'Salary/Wages'  },
  { value: 'maintenance',  label: 'Maintenance'   },
  { value: 'other',        label: 'Other'         },
];

const EMPTY_FORM = { description: '', amount: '', category: 'ingredients' };

export default function ExpensesTab({ onUpdate }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenses, setExpenses]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);

  // Edit dialog
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState(EMPTY_FORM);
  const [editing, setEditing]       = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const { start, end } = getManilaDayRange(selectedDate);
    const data = await getExpensesByDateRange(start, end);
    setExpenses(data);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleAdd = async () => {
    if (!form.description.trim() || !form.amount) {
      toast.error('Please fill in description and amount');
      return;
    }
    try {
      await addExpense({ ...form, amount: parseFloat(form.amount), createdBy: user?.uid || '' });
      toast.success('Expense added');
      setForm(EMPTY_FORM);
      loadExpenses();
      onUpdate?.();
    } catch {
      toast.error('Failed to add expense');
    }
  };

  const openEdit = (exp) => {
    setEditTarget(exp);
    setEditForm({ description: exp.description, amount: exp.amount, category: exp.category || 'ingredients' });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      await updateExpense(editTarget.id, editForm);
      toast.success('Expense updated');
      setEditTarget(null);
      loadExpenses();
      onUpdate?.();
    } catch {
      toast.error('Failed to update expense');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id);
      toast.success('Expense deleted');
      loadExpenses();
      onUpdate?.();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Category breakdown
  const byCategory = EXPENSE_CATEGORIES.map(({ value, label }) => {
    const total = expenses.filter((e) => e.category === value).reduce((s, e) => s + (e.amount || 0), 0);
    return { value, label, total };
  }).filter((c) => c.total > 0);

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalAtm sx={{ fontSize: 32, color: 'error.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Daily Expenses</Typography>
              <Typography variant="body2" color="text.secondary">Track daily operational expenses</Typography>
            </Box>
          </Box>
          <DatePicker
            value={selectedDate}
            onChange={(d) => setSelectedDate(d || new Date())}
            slotProps={{ textField: { size: 'small' } }}
          />
        </Box>

        {/* Add form */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Add New Expense</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
            <TextField label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size="small" sx={{ flex: 2 }} />
            <TextField label="Amount" type="number" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              size="small" sx={{ flex: 1 }} InputProps={{ startAdornment: '₱' }} />
            <TextField select label="Category" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              size="small" sx={{ flex: 1 }}>
              {EXPENSE_CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
            <Button variant="contained" startIcon={<Add />} onClick={handleAdd} sx={{ whiteSpace: 'nowrap' }}>
              Add
            </Button>
          </Stack>
        </Paper>

        {/* Summary chips + category breakdown */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: byCategory.length > 0 ? 1.5 : 0 }}>
            <Chip label={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`} variant="outlined" />
            <Chip label={`Total: ${formatCurrency(totalExpenses)}`} color="error" />
          </Stack>
          {byCategory.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {byCategory.map(({ value, label, total }) => (
                <Chip key={value} label={`${label}: ${formatCurrency(total)}`} size="small" variant="outlined" color="default" />
              ))}
            </Stack>
          )}
        </Box>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No expenses recorded for this day
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell>
                      <Chip
                        label={EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label || exp.category}
                        size="small" variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {formatCurrency(exp.amount)}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton size="small" onClick={() => openEdit(exp)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(exp.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <form onSubmit={handleEdit}>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Description" value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required fullWidth />
              <TextField label="Amount" type="number" value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                required fullWidth InputProps={{ startAdornment: '₱' }} />
              <TextField select label="Category" value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                fullWidth>
                {EXPENSE_CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={editing}>
              {editing ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
}
