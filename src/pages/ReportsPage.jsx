import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid2 as Grid,
  Card,
  CardContent,
  TextField,
  Stack,
  Divider,
  Chip,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  AttachMoney,
  Cancel,
  CheckCircle,
  Print,
  CalendarMonth,
  AccountBalanceWallet,
  TrendingDown,
  Savings,
  AccessTime,
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useRestaurant } from '@/hooks/useRestaurant';
import { getReportData } from '@/services/report.service';
import { formatCurrency } from '@/utils/formatters';

const ACCENT = '#667eea';
const PIE_COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#764ba2', '#3b82f6'];

const toInputDate = (d) => d.toISOString().split('T')[0];

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
  { label: 'Custom', value: 'custom' },
];

const STATUS_COLORS = {
  completed: '#10b981', served: '#10b981', delivered: '#10b981',
  cancelled: '#ef4444',
  pending: '#f59e0b',
  preparing: '#667eea',
  ready: '#3b82f6',
};

function SectionLabel({ children }) {
  return (
    <Typography
      variant="overline"
      sx={{
        fontWeight: 700,
        letterSpacing: 1.5,
        color: 'text.secondary',
        display: 'block',
        mb: 1.5,
        pl: 1.5,
        borderLeft: '3px solid #667eea',
        lineHeight: 1,
        fontSize: '0.68rem',
      }}
    >
      {children}
    </Typography>
  );
}

function MetricCard({ label, value, sub, icon, color }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.63rem' }}>
              {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.1 }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Card variant="outlined" sx={{ p: 1.5, minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: ACCENT }}>{formatCurrency(payload[0].value)}</Typography>
      {payload[0]?.payload?.orders != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {payload[0].payload.orders} orders
        </Typography>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const { restaurantId } = useRestaurant();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [preset, setPreset] = useState('7');
  const todayRef = useRef(new Date());
  // refresh todayRef each time the component is used
  useEffect(() => { todayRef.current = new Date(); }, []);
  const today = todayRef.current;
  const [customStart, setCustomStart] = useState(toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(toInputDate(today));
  const [appliedCustom, setAppliedCustom] = useState(false);

  useEffect(() => {
    if (preset === 'custom' && !appliedCustom) return;
    const load = async () => {
      setLoading(true);
      let start, end;
      if (preset === 'custom') {
        start = new Date(customStart);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      } else if (preset === 'today') {
        start = new Date(); start.setHours(0, 0, 0, 0);
        end = new Date(); end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - Number(preset));
      }
      const result = await getReportData(start, end, restaurantId || '');
      setData(result);
      setLoading(false);
      setAppliedCustom(false);
    };
    load();
  }, [preset, appliedCustom, restaurantId]);

  const periodLabel = preset === 'today'
    ? 'Today'
    : preset === 'custom'
    ? customStart + ' \u2013 ' + customEnd
    : 'Last ' + preset + ' Days';

  const completionRate = data && data.totalOrders > 0
    ? ((data.totalOrders - data.cancelled) / data.totalOrders * 100).toFixed(1)
    : '0.0';

  const typeData = data ? Object.entries(data.ordersByType).map(([name, value]) => ({ name, value })) : [];
  const paymentData = data ? Object.entries(data.ordersByPayment).map(([name, value]) => ({ name, value })) : [];
  const statusData = data ? Object.entries(data.ordersByStatus).map(([name, value]) => ({ name, value })) : [];
  const totalRevenue = data?.totalRevenue || 0;

  // Hourly chart: only show hours with activity, or 6am–11pm window
  const hourlyData = data?.salesByHour
    ? data.salesByHour.filter((h) => h.hour >= 6 && h.hour <= 23)
    : [];
  const hasHourlyData = hourlyData.some((h) => h.orders > 0);

  return (
    <AppLayout>
      <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc', minHeight: '100vh' }}>

        {/* Report Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)',
            px: { xs: 2.5, md: 4 },
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 2.5, fontSize: '0.62rem' }}>
              Business Intelligence
            </Typography>
            <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.2 }}>
              Sales Report
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>
              Period: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{periodLabel}</strong>
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
            sx={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.3)',
              textTransform: 'none',
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Print / Export
          </Button>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3 } }}>

          {/* Date Filter */}
          <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  <CalendarMonth sx={{ fontSize: 17, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Date Range
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  value={preset}
                  exclusive
                  onChange={(_, val) => { if (val) { setPreset(val); setAppliedCustom(false); } }}
                  size="small"
                  sx={{ flexWrap: 'wrap' }}
                >
                  {PRESETS.map((p) => (
                    <ToggleButton
                      key={p.value}
                      value={p.value}
                      sx={{
                        px: 2,
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        '&.Mui-selected': {
                          bgcolor: ACCENT,
                          color: '#fff',
                          borderColor: ACCENT,
                          '&:hover': { bgcolor: '#5a6fd6' },
                        },
                      }}
                    >
                      {p.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {preset === 'custom' && (
                  <>
                    <TextField
                      label="From"
                      type="date"
                      size="small"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ max: customEnd }}
                      sx={{ width: 150 }}
                    />
                    <TextField
                      label="To"
                      type="date"
                      size="small"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: customStart, max: toInputDate(today) }}
                      sx={{ width: 150 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setAppliedCustom(true)}
                      disabled={!customStart || !customEnd}
                      sx={{ bgcolor: ACCENT, textTransform: 'none', '&:hover': { bgcolor: '#5a6fd6' } }}
                    >
                      Apply
                    </Button>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {loading ? (
            <Box sx={{ py: 12, display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </Box>
          ) : !data ? null : (
            <>
              {/* Executive Summary */}
              <SectionLabel>Executive Summary</SectionLabel>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                  { label: 'Total Revenue', value: formatCurrency(data.totalRevenue), icon: <AttachMoney sx={{ fontSize: 20 }} />, color: '#667eea' },
                  { label: 'Total Orders', value: data.totalOrders, sub: (data.totalOrders - data.cancelled) + ' completed', icon: <ShoppingCart sx={{ fontSize: 20 }} />, color: '#10b981' },
                  { label: 'Avg Order Value', value: formatCurrency(data.avgOrder), icon: <TrendingUp sx={{ fontSize: 20 }} />, color: '#f59e0b' },
                  { label: 'Completion Rate', value: completionRate + '%', icon: <CheckCircle sx={{ fontSize: 20 }} />, color: '#10b981' },
                  { label: 'Cancelled Orders', value: data.cancelled, icon: <Cancel sx={{ fontSize: 20 }} />, color: '#ef4444' },
                ].map((card, i) => (
                  <Grid key={i} size={{ xs: 6, sm: 4, md: 'grow' }}>
                    <MetricCard {...card} />
                  </Grid>
                ))}
              </Grid>

              {/* Expenses vs Revenue */}
              <SectionLabel>Revenue vs Expenses</SectionLabel>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                  { label: 'Total Revenue', value: formatCurrency(data.totalRevenue), icon: <AccountBalanceWallet sx={{ fontSize: 20 }} />, color: '#667eea' },
                  { label: 'Total Expenses', value: formatCurrency(data.totalExpenses), icon: <TrendingDown sx={{ fontSize: 20 }} />, color: '#ef4444' },
                  {
                    label: 'Net Profit',
                    value: formatCurrency(data.netProfit),
                    sub: data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) + '% margin' : undefined,
                    icon: <Savings sx={{ fontSize: 20 }} />,
                    color: data.netProfit >= 0 ? '#10b981' : '#ef4444',
                  },
                ].map((card, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 4 }}>
                    <MetricCard {...card} />
                  </Grid>
                ))}
              </Grid>

              {/* Revenue Over Time */}
              <SectionLabel>{preset === 'today' ? 'Sales by Hour' : 'Revenue Over Time'}</SectionLabel>
              <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                <CardContent sx={{ pt: 2.5 }}>
                  {preset === 'today' ? (
                    !hasHourlyData ? (
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <AccessTime sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" sx={{ fontWeight: 600 }}>No sales recorded yet today</Typography>
                        <Typography variant="caption" color="text.disabled">Sales will appear here as orders are completed</Typography>
                      </Box>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={hourlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis
                            dataKey="hour"
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickFormatter={(h) => h === 0 ? '12am' : h < 12 ? h + 'am' : h === 12 ? '12pm' : (h - 12) + 'pm'}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickFormatter={(v) => '₱' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
                            width={56}
                          />
                          <Tooltip
                            formatter={(val, name) => name === 'revenue' ? [formatCurrency(val), 'Revenue'] : [val, 'Orders']}
                            labelFormatter={(h) => h === 0 ? '12:00 AM' : h < 12 ? h + ':00 AM' : h === 12 ? '12:00 PM' : (h - 12) + ':00 PM'}
                          />
                          <Bar dataKey="revenue" fill={ACCENT} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  ) : data.salesByDay.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Typography color="text.secondary">No sales data for this period</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={data.salesByDay} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ACCENT} stopOpacity={0.18} />
                            <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#9ca3af' }}
                          tickFormatter={(v) =>
                            new Date(v + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                          }
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#9ca3af' }}
                          tickFormatter={(v) => '\u20b1' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
                          width={56}
                        />
                        <Tooltip content={<RevenueTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke={ACCENT}
                          strokeWidth={2.5}
                          fill="url(#revGrad)"
                          dot={data.salesByDay.length <= 14}
                          activeDot={{ r: 5, fill: ACCENT }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Selling Items */}
              <SectionLabel>Top Selling Items</SectionLabel>
              <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                {data.topItems.length === 0 ? (
                  <CardContent>
                    <Typography color="text.secondary" variant="body2">No items sold in this period</Typography>
                  </CardContent>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                          {['#', 'ITEM', 'CATEGORY', 'UNITS SOLD', 'REVENUE', '% OF TOTAL'].map((h, i) => (
                            <TableCell
                              key={h}
                              align={i >= 3 ? 'right' : 'left'}
                              sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary', py: 1.5, letterSpacing: 0.5, ...(i === 0 && { width: 52 }), ...(i === 5 && { width: 100 }) }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.topItems.map((item, i) => {
                          const pct = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
                          const medalBg = i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : null;
                          return (
                            <TableRow
                              key={i}
                              sx={{
                                '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : ACCENT + '08' },
                                '&:last-child td': { borderBottom: 0 },
                              }}
                            >
                              <TableCell sx={{ py: 1.5 }}>
                                {medalBg ? (
                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: medalBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.65rem', lineHeight: 1 }}>{i + 1}</Typography>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>{i + 1}</Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                {item.categoryName ? (
                                  <Chip label={item.categoryName} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                                ) : (
                                  <Typography variant="caption" color="text.disabled">—</Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.5 }}>
                                <Typography variant="body2">{item.quantity.toLocaleString()}</Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(item.revenue)}</Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.5 }}>
                                <Chip
                                  label={pct + '%'}
                                  size="small"
                                  sx={{ fontSize: '0.68rem', fontWeight: 700, height: 20, bgcolor: ACCENT + '18', color: ACCENT, borderRadius: 1 }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Card>

              {/* Order Breakdown */}
              <SectionLabel>Order Breakdown</SectionLabel>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                  { title: 'By Order Type', rows: typeData },
                  { title: 'By Payment Method', rows: paymentData },
                ].map(({ title, rows }) => (
                  <Grid key={title} size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{title}</Typography>
                        {rows.length === 0 ? (
                          <Typography color="text.secondary" variant="body2">No data</Typography>
                        ) : (
                          <>
                            <ResponsiveContainer width="100%" height={175}>
                              <PieChart>
                                <Pie data={rows} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                                  {rows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(val) => [val + ' orders', '']} />
                              </PieChart>
                            </ResponsiveContainer>
                            <Divider sx={{ my: 1.5 }} />
                            <Stack spacing={0.75}>
                              {rows.map((r, i) => {
                                const total = rows.reduce((s, x) => s + x.value, 0);
                                const pct = total > 0 ? ((r.value / total) * 100).toFixed(0) : 0;
                                return (
                                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{r.name}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.value}</Typography>
                                      <Typography variant="caption" color="text.secondary">({pct}%)</Typography>
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Cancelled Orders Detail */}
              {data.cancelledOrders?.length > 0 && (
                <>
                  <SectionLabel>Cancelled Orders</SectionLabel>
                  <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                            {['ORDER #', 'TYPE', 'AMOUNT', 'TIME', 'REASON'].map((h) => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary', py: 1.5, letterSpacing: 0.5 }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.cancelledOrders.map((o) => (
                            <TableRow key={o.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                              <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>#{o.orderNumber}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{o.orderType || '—'}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="body2">{formatCurrency(o.total)}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {o.createdAt ? o.createdAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {o.cancelReason || <em style={{ opacity: 0.5 }}>No reason provided</em>}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </>
              )}

              {/* Order Status Summary */}
              <SectionLabel>Order Status Summary</SectionLabel>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  {statusData.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">No data</Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {statusData.map((s, i) => {
                        const color = STATUS_COLORS[s.name] || '#9ca3af';
                        const pct = data.totalOrders > 0 ? ((s.value / data.totalOrders) * 100).toFixed(0) : 0;
                        return (
                          <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: color + '10', border: '1px solid ' + color + '28', textAlign: 'center' }}>
                              <Typography variant="h5" sx={{ fontWeight: 800, color }}>{s.value}</Typography>
                              <Typography variant="caption" sx={{ textTransform: 'capitalize', color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                {s.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{pct}% of orders</Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
}
