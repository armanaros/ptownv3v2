import { useRef, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import { generateReceiptHTML } from '@/utils/receiptGenerator';

const PrintReceiptDialog = ({ open, onClose, order }) => {
  const iframeRef = useRef(null);

  const srcdoc = useMemo(() => {
    if (!order) return '';
    const body = generateReceiptHTML(order);
    return `<!DOCTYPE html>
<html>
  <head>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #fff; display: flex; justify-content: center; padding: 16px; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>${body}</body>
</html>`;
  }, [order]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Receipt #{order.orderNumber}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ height: 520, overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            srcDoc={srcdoc}
            title={`Receipt #${order.orderNumber}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{ textTransform: 'none' }}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintReceiptDialog;
