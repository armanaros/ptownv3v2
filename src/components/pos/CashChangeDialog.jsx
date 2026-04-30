import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  InputAdornment,
  Grid2 as Grid,
  IconButton,
} from '@mui/material';
import { Backspace, Print as PrintIcon } from '@mui/icons-material';
import { formatCurrency } from '@/utils/formatters';

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20];

const CashChangeDialog = ({ open, onClose, orderTotal, onPrintReceipt }) => {
  const [amountReceived, setAmountReceived] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [useManual, setUseManual] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountReceived(0);
      setManualInput('');
      setUseManual(false);
    }
  }, [open]);

  const received = useManual ? (Number(manualInput) || 0) : amountReceived;
  const change = received - orderTotal;

  const handleDenomination = (amount) => {
    setUseManual(false);
    setAmountReceived((prev) => prev + amount);
  };

  const handleExact = () => {
    setUseManual(false);
    setAmountReceived(orderTotal);
  };

  const handleClear = () => {
    setAmountReceived(0);
    setManualInput('');
    setUseManual(false);
  };

  const handleManualChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setManualInput(val);
    setUseManual(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth onKeyDown={(e) => { if (e.key === 'Enter') onClose(); }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.3rem', pb: 0 }}>Cash Payment</DialogTitle>
      <DialogContent>
        {/* Order total */}
        <Box sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Order Total</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{formatCurrency(orderTotal)}</Typography>
        </Box>

        {/* Denomination buttons */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Tap the bills received:
        </Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {DENOMINATIONS.map((amt) => (
            <Grid key={amt} size={4}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => handleDenomination(amt)}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2 },
                }}
              >
                ₱{amt.toLocaleString()}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Exact + Clear row */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="outlined"
            color="success"
            fullWidth
            onClick={handleExact}
            sx={{ py: 1.2, fontWeight: 600, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            Exact Amount
          </Button>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={handleClear}
            sx={{ py: 1.2, fontWeight: 600, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            Clear
          </Button>
        </Box>

        {/* Amount received display */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="body2" color="text.secondary">Received:</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {formatCurrency(received)}
          </Typography>
          {!useManual && amountReceived > 0 && (
            <IconButton size="small" onClick={handleClear} title="Clear">
              <Backspace fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Change box */}
        {received > 0 && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              backgroundColor: change >= 0 ? 'success.light' : 'error.light',
              textAlign: 'center',
              mb: 2,
            }}
          >
            <Typography variant="body1" sx={{ color: change >= 0 ? 'success.dark' : 'error.dark', fontWeight: 500 }}>
              {change >= 0 ? 'Change Due' : 'Not Enough'}
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, color: change >= 0 ? 'success.dark' : 'error.dark' }}
            >
              {formatCurrency(Math.abs(change))}
            </Typography>
          </Box>
        )}

        {/* Manual input fallback */}
        <TextField
          label="Or type amount"
          value={manualInput}
          onChange={handleManualChange}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start">₱</InputAdornment>,
            inputMode: 'decimal',
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1, justifyContent: 'space-between' }}>
        {onPrintReceipt && (
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={onPrintReceipt}
            sx={{ textTransform: 'none' }}
          >
            Print Receipt
          </Button>
        )}
        <Button onClick={onClose} variant="contained" size="large" sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem', flexGrow: 1 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CashChangeDialog;
