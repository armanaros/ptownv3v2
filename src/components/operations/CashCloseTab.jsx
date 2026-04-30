import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, Grid2 as Grid,
  TextField, Button, Paper, Divider, Alert, Chip,
} from '@mui/material';
import { AccountBalance, CheckCircle, Calculate } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import toast from 'react-hot-toast';
import { saveCashClose, getCashCloseByDateRange } from '@/services/cashclose.service';
import { getManilaDayRange } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/formatters';
import useAuth from '@/hooks/useAuth';

const EMPTY_FORM = {
  startingCash: '', endingCash: '',
  cashSales: '', gcashSales: '', mayaSales: '', grabSales: '', foodpandaSales: '',
  expenses: '', notes: '',
};

export default function CashCloseTab({ onUpdate }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [existingClose, setExistingClose] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const loadExisting = useCallback(async () => {
    setLoading(true);
    const { start, end } = getManilaDayRange(selectedDate);
    const data = await getCashCloseByDateRange(start, end);
    if (data) {
      setExistingClose(data);
      setForm({
        startingCash:  data.startingCash  ?? '',
        endingCash:    data.endingCash    ?? '',
        cashSales:     data.cashSales     ?? '',
        gcashSales:    data.gcashSales    ?? '',
        mayaSales:     data.mayaSales     ?? '',
        grabSales:     data.grabSales     ?? '',
        foodpandaSales: data.foodpandaSales ?? '',
        expenses:      data.expenses      ?? '',
        notes:         data.notes         ?? '',
      });
    } else {
      setExistingClose(null);
      setForm(EMPTY_FORM);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const n = (v) => parseFloat(v) || 0;

  const totalSales    = n(form.cashSales) + n(form.gcashSales) + n(form.mayaSales) + n(form.grabSales) + n(form.foodpandaSales);
  const expectedCash  = n(form.startingCash) + n(form.cashSales) - n(form.expenses);
  const actualCash    = n(form.endingCash);
  const variance      = actualCash - expectedCash;

  const f = (field) => ({ value: form[field], onChange: (e) => setForm({ ...form, [field]: e.target.value }) });

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = {
        startingCash:   n(form.startingCash),
        endingCash:     n(form.endingCash),
        cashSales:      n(form.cashSales),
        gcashSales:     n(form.gcashSales),
        mayaSales:      n(form.mayaSales),
        grabSales:      n(form.grabSales),
        foodpandaSales: n(form.foodpandaSales),
        expenses:       n(form.expenses),
        notes:          form.notes,
        expectedCash, variance, totalSales,
        date: selectedDate,
        closedBy: user?.uid || '',
      };
      await saveCashClose(data);
      toast.success('Cash close saved');
      loadExisting();
      onUpdate?.(data);
    } catch {
      toast.error('Failed to save cash close');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountBalance sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Cash Close</Typography>
              <Typography variant="body2" color="text.secondary">End of day cash reconciliation</Typography>
            </Box>
          </Box>
          <DatePicker
            value={selectedDate}
            onChange={(d) => setSelectedDate(d || new Date())}
            slotProps={{ textField: { size: 'small' } }}
          />
        </Box>

        {existingClose && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
            Cash close recorded for this day
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Cash Drawer */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Cash Drawer</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth label="Starting Cash" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('startingCash')} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth label="Ending Cash" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('endingCash')} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth label="Cash Expenses" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('expenses')} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Sales by payment method */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Sales by Payment Method</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth label="Cash Sales" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('cashSales')} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth label="GCash" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('gcashSales')} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth label="Maya" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('mayaSales')} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth label="GrabFood" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('grabSales')} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="FoodPanda" type="number" size="small" InputProps={{ startAdornment: '₱' }} {...f('foodpandaSales')} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Notes */}
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Notes" multiline rows={2} size="small"
              placeholder="Any notes for this cash close…" {...f('notes')} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Summary */}
        <Paper sx={{ p: 2, bgcolor: variance >= 0 ? 'success.50' : 'error.50', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Calculate color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Summary</Typography>
          </Box>
          <Grid container spacing={2}>
            {[
              { label: 'Total Sales',    value: formatCurrency(totalSales)   },
              { label: 'Expected Cash',  value: formatCurrency(expectedCash) },
              { label: 'Actual Cash',    value: formatCurrency(actualCash)   },
            ].map(({ label, value }) => (
              <Grid key={label} size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{value}</Typography>
              </Grid>
            ))}
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Variance</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: variance >= 0 ? 'success.main' : 'error.main' }}>
                  {formatCurrency(variance)}
                </Typography>
                <Chip size="small" label={variance >= 0 ? 'OVER' : 'SHORT'} color={variance >= 0 ? 'success' : 'error'} />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Button variant="contained" size="large" onClick={handleSave} disabled={loading}>
          {existingClose ? 'Update Cash Close' : 'Save Cash Close'}
        </Button>
      </CardContent>
    </Card>
  );
}
