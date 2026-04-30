import { useState, useEffect, useMemo } from 'react';
import {
  Card, CardContent, Typography, Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField, IconButton,
  Chip, Alert, FormControlLabel, Switch, InputAdornment,
} from '@mui/material';
import { Add, Remove, Warning, Search } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { subscribeToAllStockItems, subscribeToLowStockItems } from '@/services/inventory.service';
import { updateItem } from '@/services/menu.service';

export default function QuickStockTab() {
  const [allItems, setAllItems]         = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stockUpdates, setStockUpdates] = useState({});
  const [showAll, setShowAll]           = useState(false);
  const [search, setSearch]             = useState('');

  useEffect(() => {
    const unsubAll = subscribeToAllStockItems(setAllItems);
    const unsubLow = subscribeToLowStockItems(setLowStockItems);
    return () => { unsubAll(); unsubLow(); };
  }, []);

  const baseItems = useMemo(
    () => (showAll ? allItems : lowStockItems),
    [showAll, allItems, lowStockItems]
  );

  const displayItems = useMemo(() => {
    if (!search.trim()) return baseItems;
    const q = search.toLowerCase();
    return baseItems.filter((i) => (i.name || '').toLowerCase().includes(q));
  }, [baseItems, search]);

  const handleStockChange = (itemId, delta) => {
    const item = allItems.find((i) => i.id === itemId);
    const current = stockUpdates[itemId] ?? item?.stockLevel ?? 0;
    setStockUpdates((prev) => ({ ...prev, [itemId]: Math.max(0, current + delta) }));
  };

  const handleSaveStock = async (itemId) => {
    const newStock = stockUpdates[itemId];
    if (newStock === undefined) return;
    try {
      await updateItem(itemId, { stockLevel: newStock });
      toast.success('Stock updated');
      setStockUpdates((prev) => { const c = { ...prev }; delete c[itemId]; return c; });
    } catch {
      toast.error('Failed to update stock');
    }
  };

  const getDisplayStock = (item) => stockUpdates[item.id] ?? item.stockLevel ?? 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Warning sx={{ fontSize: 32, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Quick Stock Management</Typography>
              <Typography variant="body2" color="text.secondary">
                {showAll ? `All ${allItems.length} items` : `${lowStockItems.length} low-stock item${lowStockItems.length !== 1 ? 's' : ''}`}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: 180 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
            <FormControlLabel
              control={<Switch checked={showAll} onChange={(e) => setShowAll(e.target.checked)} size="small" />}
              label="Show all items"
            />
          </Box>
        </Box>

        {!showAll && lowStockItems.length === 0 ? (
          <Alert severity="success">All items are well stocked! No low stock alerts at this time.</Alert>
        ) : displayItems.length === 0 ? (
          <Alert severity="info">No items match your search.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Stock</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Threshold</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Adjust</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Save</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayItems.map((item) => {
                  const displayStock = getDisplayStock(item);
                  const hasChange    = stockUpdates[item.id] !== undefined;
                  const threshold    = item.lowStockThreshold || 5;
                  const isOut        = displayStock === 0;
                  const isLow        = displayStock <= threshold;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.name}
                          {isOut && <Chip label="OUT" size="small" color="error" />}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={displayStock}
                          size="small"
                          color={isOut ? 'error' : isLow ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell align="center">{threshold}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => handleStockChange(item.id, -1)}>
                            <Remove fontSize="small" />
                          </IconButton>
                          <TextField
                            size="small"
                            value={displayStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 0)
                                setStockUpdates((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            sx={{ width: 60 }}
                            inputProps={{ style: { textAlign: 'center' } }}
                          />
                          <IconButton size="small" onClick={() => handleStockChange(item.id, 1)}>
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {hasChange && (
                          <Chip label="Save" size="small" color="primary"
                            onClick={() => handleSaveStock(item.id)} sx={{ cursor: 'pointer' }} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

