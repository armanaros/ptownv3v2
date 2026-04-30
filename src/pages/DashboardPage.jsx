import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid2 as Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  LinearProgress,
  Chip,
  alpha,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  AttachMoney,
  ShoppingCart,
  TrendingUp,
  Cancel,
  Settings,
} from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useAuth from '@/hooks/useAuth';
import useMenu from '@/hooks/useMenu';
import { useRestaurant } from '@/hooks/useRestaurant';
import { getReportData } from '@/services/report.service';
import { formatCurrency } from '@/utils/formatters';
import { getManilaDayRange } from '@/utils/dateHelpers';

const CHART_COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

const PIE_COLORS_ORDER = [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning];
const PIE_COLORS_PAYMENT = [CHART_COLORS.success, CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.warning];

// --- Custom Tooltip ---
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: 'rgba(30,30,40,0.92)',
      borderRadius: 1.5,
      px: 2,
      py: 1.5,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>
        {formatCurrency(payload[0].value)}
      </Typography>
      {payload[0]?.payload?.orders !== undefined && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {payload[0].payload.orders} orders
        </Typography>
      )}
    </Box>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <Box sx={{
      bgcolor: 'rgba(30,30,40,0.92)',
      borderRadius: 1.5,
      px: 2,
      py: 1,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
        {name}
      </Typography>
      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>
        {value} orders
      </Typography>
    </Box>
  );
};

// --- Custom Legend ---
const CustomLegend = ({ payload }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
    {payload?.map((entry, i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          {entry.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

// --- Metric Card ---
const MetricCard = ({ title, value, subtitle, icon, color = 'primary.main' }) => (
  <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ visibility: subtitle ? 'visible' : 'hidden' }}>
            {subtitle || '\u00A0'}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${color.replace('.main', '')} 0%, ${color.replace('.main', '')} 100%)`,
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// --- Active Pie Label (inside donut) ---
const renderCenterLabel = (data) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return ({ viewBox }) => {
    const { cx, cy } = viewBox;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} dy="-0.4em" fontSize="22" fontWeight="700" fill="#333">{total}</tspan>
        <tspan x={cx} dy="1.4em" fontSize="11" fill="#999">total</tspan>
      </text>
    );
  };
};

export default function DashboardPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const { restaurantId } = useRestaurant();
  const { items, loading: menuLoading } = useMenu();

  const [range, setRange] = useState('1');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Widget visibility state (persisted in localStorage)
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : {
      metrics: true,
      salesChart: true,
      orderTypes: true,
      paymentMethods: true,
      topItems: true,
    };
  });

  const toggleWidget = (key) => {
    setWidgets((prev) => {
      const newWidgets = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dashboard_widgets', JSON.stringify(newWidgets));
      return newWidgets;
    });
  };

  useEffect(() => {
    const load = async () => {
      setReportLoading(true);
      let start, end, useManilaTz = false;
      
      if (range === '1') {
        // "Today" - use Manila timezone-aware day range
        const manilaRange = getManilaDayRange();
        start = manilaRange.start;
        end = manilaRange.end;
        useManilaTz = true;
      } else {
        // Other ranges - calculate from today minus N days
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - Number(range) + 1); // +1 so "Last 7 Days" is actually 7 days
        start.setHours(0, 0, 0, 0);
      }
      
      const result = await getReportData(start, end, restaurantId || '', useManilaTz);
      setReportData(result);
      setReportLoading(false);
    };
    load();
  }, [range, restaurantId]);

  const loading = menuLoading || reportLoading;

  const typeData = useMemo(() => {
    if (!reportData) return [];
    return Object.entries(reportData.ordersByType).map(([name, value]) => ({ name, value }));
  }, [reportData]);

  const paymentData = useMemo(() => {
    if (!reportData) return [];
    return Object.entries(reportData.ordersByPayment).map(([name, value]) => ({ name, value }));
  }, [reportData]);

  // Format sales data for nicer X axis labels
  const formattedSalesData = useMemo(() => {
    if (!reportData?.salesByDay) return [];
    return reportData.salesByDay.map((d) => ({
      ...d,
      label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    }));
  }, [reportData]);

  // Top items with percentage bars
  const topItemsMax = useMemo(() => {
    if (!reportData?.topItems?.length) return 0;
    return Math.max(...reportData.topItems.map((i) => i.quantity));
  }, [reportData]);

  if (loading || !reportData) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Welcome back, {user?.firstName || 'User'}
            </Typography>
            <Typography color="text.secondary">
              Here's what's happening at P-Town
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton onClick={() => setSettingsOpen(true)} title="Dashboard Settings">
              <Settings />
            </IconButton>
            <TextField
              select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="1">Today</MenuItem>
              <MenuItem value="7">Last 7 Days</MenuItem>
              <MenuItem value="30">Last 30 Days</MenuItem>
              <MenuItem value="90">Last 90 Days</MenuItem>
            </TextField>
          </Box>
        </Box>

        {/* Metric cards */}
        {widgets.metrics && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <MetricCard
                title="REVENUE"
                value={formatCurrency(reportData.totalRevenue)}
                subtitle={`${reportData.totalOrders} completed`}
                icon={<AttachMoney sx={{ color: '#fff' }} />}
                color="success.main"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <MetricCard
                title="ORDERS"
                value={reportData.totalOrders}
                icon={<ShoppingCart sx={{ color: '#fff' }} />}
                color="info.main"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <MetricCard
                title="AVG ORDER"
                value={formatCurrency(reportData.avgOrder)}
                icon={<TrendingUp sx={{ color: '#fff' }} />}
                color="secondary.main"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <MetricCard
                title="CANCELLED"
                value={reportData.cancelled}
                subtitle={`${items.length} menu items`}
                icon={<Cancel sx={{ color: '#fff' }} />}
                color="error.main"
              />
            </Grid>
          </Grid>
        )}

        {/* Sales Area Chart */}
        {widgets.salesChart && (
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Sales Overview</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Revenue trend for the selected period
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedSalesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.4)} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    dx={-4}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2.5}
                    fill="url(#salesGradient)"
                    dot={{ r: 4, fill: '#fff', stroke: CHART_COLORS.primary, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: CHART_COLORS.primary, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
        )}

        {/* Donut Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {widgets.orderTypes && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Order Types</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Distribution by order type
                </Typography>
                {typeData.length > 0 ? (
                  <Box sx={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={85}
                          dataKey="value"
                          paddingAngle={3}
                          cornerRadius={4}
                          label={false}
                        >
                          {typeData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS_ORDER[i % PIE_COLORS_ORDER.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend content={<CustomLegend />} verticalAlign="bottom" />
                        <text x="50%" y="40%" textAnchor="middle" dominantBaseline="central">
                          <tspan fontSize="22" fontWeight="700" fill={theme.palette.text.primary}>
                            {typeData.reduce((s, d) => s + d.value, 0)}
                          </tspan>
                        </text>
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                          <tspan fontSize="11" fill={theme.palette.text.secondary}>total</tspan>
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No data yet</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          )}

          {widgets.paymentMethods && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Payment Methods</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Distribution by payment type
                </Typography>
                {paymentData.length > 0 ? (
                  <Box sx={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={85}
                          dataKey="value"
                          paddingAngle={3}
                          cornerRadius={4}
                          label={false}
                        >
                          {paymentData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS_PAYMENT[i % PIE_COLORS_PAYMENT.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend content={<CustomLegend />} verticalAlign="bottom" />
                        <text x="50%" y="40%" textAnchor="middle" dominantBaseline="central">
                          <tspan fontSize="22" fontWeight="700" fill={theme.palette.text.primary}>
                            {paymentData.reduce((s, d) => s + d.value, 0)}
                          </tspan>
                        </text>
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                          <tspan fontSize="11" fill={theme.palette.text.secondary}>total</tspan>
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No data yet</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          )}
        </Grid>

        {/* Top Items with progress bars */}
        {widgets.topItems && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Top Selling Items</Typography>
                <Typography variant="caption" color="text.secondary">
                  Best performers for the selected period
                </Typography>
              </Box>
              <Chip label={`${reportData.topItems.length} items`} size="small" variant="outlined" />
            </Box>
            {reportData.topItems.length > 0 ? (
              <Box>
                {reportData.topItems.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 1.5,
                      borderBottom: i < reportData.topItems.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: i < 3
                          ? `linear-gradient(135deg, ${CHART_COLORS.primary}, ${CHART_COLORS.secondary})`
                          : 'action.hover',
                        color: i < 3 ? '#fff' : 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0, ml: 1 }}>
                          {formatCurrency(item.revenue)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={topItemsMax > 0 ? (item.quantity / topItemsMax) * 100 : 0}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(CHART_COLORS.primary, 0.1),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              background: `linear-gradient(90deg, ${CHART_COLORS.primary}, ${CHART_COLORS.secondary})`,
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 50, textAlign: 'right' }}>
                          {item.quantity} sold
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No sales data yet</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        )}

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Dashboard Settings</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose which widgets to display on your dashboard.
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={widgets.metrics} onChange={() => toggleWidget('metrics')} />}
                label="Metric Cards (Revenue, Orders, etc.)"
              />
              <FormControlLabel
                control={<Switch checked={widgets.salesChart} onChange={() => toggleWidget('salesChart')} />}
                label="Sales Overview Chart"
              />
              <FormControlLabel
                control={<Switch checked={widgets.orderTypes} onChange={() => toggleWidget('orderTypes')} />}
                label="Order Types Distribution"
              />
              <FormControlLabel
                control={<Switch checked={widgets.paymentMethods} onChange={() => toggleWidget('paymentMethods')} />}
                label="Payment Methods Distribution"
              />
              <FormControlLabel
                control={<Switch checked={widgets.topItems} onChange={() => toggleWidget('topItems')} />}
                label="Top Selling Items"
              />
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSettingsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}
