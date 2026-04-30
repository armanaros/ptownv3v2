import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Stack,
  Chip,
  alpha,
} from '@mui/material';
import { Add, Delete, LocalAtm, TrendingUp } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { addExpense, getExpensesByDateRange, deleteExpense } from '@/services/expense.service';
import { getManilaDayRange } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/formatters';
import useAuth from '@/hooks/useAuth';

const EXPENSE_CATEGORIES = [
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salary', label: 'Salary/Wages' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS = {
  ingredients: 'success',
  supplies: 'info',
  utilities: 'warning',
  salary: 'secondary',
  maintenance: 'error',
  other: 'default',
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ description: '', amount: '', category: 'ingredients' });

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const { start, end } = getManilaDayRange(selectedDate);
      const data = await getExpensesByDateRange(start, end);
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedDate]);

  const handleAdd = async () => {
    if (!form.description.trim() || !form.amount) {
      toast.error('Please fill in description and amount');
      return;
    }
    try {
      await addExpense({
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        createdBy: user?.uid || '',
        createdByName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'Unknown',
      });
      toast.success('Expense added');
      setForm({ description: '', amount: '', category: 'ingredients' });
      loadExpenses();
    } catch (err) {
      toast.error('Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      toast.success('Expense deleted');
      loadExpenses();
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
    return acc;
  }, {});

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalAtm color="primary" /> Expense Management
          </Typography>
          <Typography color="text.secondary">
            Track and manage daily expenses
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1, bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Today's Total</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {formatCurrency(totalExpenses)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded
              </Typography>
            </CardContent>
          </Card>
          
          {Object.entries(categoryTotals).slice(0, 3).map(([cat, total]) => (
            <Card key={cat} sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {cat}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {formatCurrency(total)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Add Expense Form */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Add New Expense
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                size="small"
                sx={{ flex: 2 }}
                placeholder="What was purchased?"
              />
              <TextField
                label="Amount (₱)"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                size="small"
                sx={{ flex: 1, minWidth: 140 }}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAdd}
                sx={{ minWidth: 100 }}
              >
                Add
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Date Picker & Expense List */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Expense History
              </Typography>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={setSelectedDate}
                slotProps={{ textField: { size: 'small' } }}
              />
            </Stack>

            {loading ? (
              <LoadingSpinner />
            ) : expenses.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LocalAtm sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">No expenses recorded for this date</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Added By</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} hover>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={expense.category}
                            size="small"
                            color={CATEGORY_COLORS[expense.category] || 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {expense.createdByName || expense.createdBy?.slice(0, 8) || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(expense.id)}
                            title="Delete expense"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalExpenses)}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </AppLayout>
  );
}
