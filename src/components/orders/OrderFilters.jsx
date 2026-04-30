import { Tabs, Tab, Box, Chip, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'served', label: 'Served' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const toStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const OrderFilters = ({ selectedStatus, onStatusChange, orderCounts, dateFrom, dateTo, onDateFromChange, onDateToChange }) => {
  const currentIndex = statuses.findIndex((s) => s.value === selectedStatus);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tabs
          value={currentIndex >= 0 ? currentIndex : 0}
          onChange={(_, v) => onStatusChange(statuses[v].value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            flex: 1,
            minHeight: 40,
            '& .MuiTab-root': { minHeight: 40, py: 0.5, px: 1.5, fontSize: '0.8rem' },
          }}
        >
          {statuses.map((s) => (
            <Tab
              key={s.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {s.label}
                  {orderCounts[s.value] > 0 && (
                    <Chip
                      label={orderCounts[s.value]}
                      size="small"
                      color={s.value === 'pending' ? 'warning' : 'default'}
                      sx={{ height: 18, fontSize: '0.65rem', minWidth: 18 }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Date range pickers */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, flexShrink: 0 }}>
          <DatePicker
            value={dateFrom}
            onChange={(val) => val && onDateFromChange(toStartOfDay(val))}
            disableFuture
            maxDate={dateTo}
            slotProps={{
              textField: {
                size: 'small',
                label: 'From',
                sx: { width: 140, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } },
              },
            }}
          />
          <Typography variant="body2" color="text.secondary">–</Typography>
          <DatePicker
            value={dateTo}
            onChange={(val) => val && onDateToChange(toEndOfDay(val))}
            disableFuture
            minDate={dateFrom}
            slotProps={{
              textField: {
                size: 'small',
                label: 'To',
                sx: { width: 140, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } },
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default OrderFilters;
