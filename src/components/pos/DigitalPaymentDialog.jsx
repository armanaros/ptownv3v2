import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Divider,
} from '@mui/material';
import { CheckCircle, PhoneAndroid, AccountBalance, Print as PrintIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/utils/formatters';

const METHOD_CONFIG = {
  gcash: {
    label: 'GCash',
    color: '#1d4ed8',
    bg: '#eff6ff',
    icon: <PhoneAndroid sx={{ fontSize: 32 }} />,
    hint: 'Ask customer to send via GCash and enter the reference number.',
    refLabel: 'GCash Reference No.',
  },
  paymaya: {
    label: 'Maya',
    color: '#16a34a',
    bg: '#f0fdf4',
    icon: <PhoneAndroid sx={{ fontSize: 32 }} />,
    hint: 'Ask customer to send via Maya and enter the reference number.',
    refLabel: 'Maya Reference No.',
  },
  bank_transfer: {
    label: 'Bank Transfer',
    color: '#7c3aed',
    bg: '#faf5ff',
    icon: <AccountBalance sx={{ fontSize: 32 }} />,
    hint: 'Confirm bank transfer has been received before completing.',
    refLabel: 'Reference / Transaction No.',
  },
};

const DigitalPaymentDialog = ({ open, onClose, orderTotal, paymentMethod, onPrintReceipt }) => {
  const [refNumber, setRefNumber] = useState('');

  useEffect(() => {
    if (open) setRefNumber('');
  }, [open]);

  const cfg = METHOD_CONFIG[paymentMethod] || METHOD_CONFIG.gcash;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      onKeyDown={(e) => { if (e.key === 'Enter' && refNumber.trim()) onClose(); }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem', pb: 0 }}>
        {cfg.label} Payment
      </DialogTitle>

      <DialogContent>
        {/* Amount + icon */}
        <Box
          sx={{
            mt: 1.5,
            mb: 2.5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: cfg.bg,
            color: cfg.color,
          }}
        >
          {cfg.icon}
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Amount to Collect
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: cfg.color }}>
            {formatCurrency(orderTotal)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          {cfg.hint}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Reference number */}
        <TextField
          label={cfg.refLabel}
          value={refNumber}
          onChange={(e) => setRefNumber(e.target.value)}
          size="small"
          fullWidth
          placeholder="Optional — for record keeping"
          helperText="Leave blank if not needed"
          autoFocus
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', flex: 1 }}>
          Cancel
        </Button>
        {onPrintReceipt && (
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={onPrintReceipt}
            sx={{ textTransform: 'none', flex: 1 }}
          >
            Print Receipt
          </Button>
        )}
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          startIcon={<CheckCircle />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: cfg.color,
            '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.9)' },
          }}
        >
          Payment Received
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DigitalPaymentDialog;
