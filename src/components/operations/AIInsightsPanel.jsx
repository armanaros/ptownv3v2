import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Stack, Grid2 as Grid, Alert,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Paper, Divider,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Warning, Error as ErrorIcon,
  Info as InfoIcon, ShoppingCart, LocalOffer, AttachMoney,
  Lightbulb, ArrowForward, Edit,
} from '@mui/icons-material';
import {
  calculateDailyMetrics, calculateHourlyTrends, analyzeFoodPerformance,
  analyzeCashierPerformance, detectAnomalies, generateAlerts,
  calculateRevenueForecast, analyzePairings, generateSmartRecommendations,
} from '@/services/analytics.service';
import { createAnnouncement } from '@/services/announcement.service';
import { saveSystemConfig } from '@/services/config.service';
import { formatCurrency } from '@/utils/formatters';
import useConfig from '@/hooks/useConfig';

const AIInsightsPanel = ({ orders = [], menuItems = [], expenses = [], cashClose = null, onTabChange }) => {
  const config = useConfig();
  const navigate = useNavigate();
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);

  // Edit revenue target — keep a local override so UI updates immediately after save
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetOverride, setTargetOverride] = useState(null);

  const TARGET_REVENUE = targetOverride ?? config?.revenueTarget ?? 50000;

  const handleSaveTarget = async () => {
    const val = parseFloat(targetValue);
    if (!val || val <= 0) { return; }
    setTargetSaving(true);
    try {
      await saveSystemConfig({ revenueTarget: val });
      setTargetOverride(val);
      setTargetDialogOpen(false);
    } catch {
      // silently fail — config is non-critical
    } finally {
      setTargetSaving(false);
    }
  };

  const handleRecommendationAction = (rec) => {
    switch (rec.type) {
      case 'revenue':
        // Go to Coupons tab (index 5 in Operations)
        if (onTabChange) onTabChange(5);
        break;
      case 'menu':
        navigate('/menu');
        break;
      case 'profit':
        navigate('/menu');
        break;
      case 'marketing':
        setAnnouncementText(`🔥 Special Promo Today! Come visit us and enjoy our delicious meals. Limited time offer!`);
        setAnnouncementOpen(true);
        break;
      case 'upsell':
        navigate('/menu');
        break;
      default:
        break;
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setAnnouncementSending(true);
    try {
      await createAnnouncement({
        message: announcementText.trim(),
        createdBy: '',
        authorName: 'AI Insights',
        title: 'Promotion',
      });
      setAnnouncementOpen(false);
      setAnnouncementText('');
    } catch (err) {
      console.error('Failed to send announcement:', err);
    } finally {
      setAnnouncementSending(false);
    }
  };

  // Calculate all analytics in useMemo for performance
  const analytics = useMemo(() => {
    const metrics = calculateDailyMetrics(orders, TARGET_REVENUE);
    const hourlyTrends = calculateHourlyTrends(orders);
    const foodData = analyzeFoodPerformance(orders, menuItems);
    const cashierData = analyzeCashierPerformance(orders);
    const anomalies = detectAnomalies(orders, cashClose);
    const alertsList = generateAlerts(metrics, anomalies, menuItems);
    const forecast = calculateRevenueForecast(orders, TARGET_REVENUE);
    const pairings = analyzePairings(orders);
    const recommendations = generateSmartRecommendations(orders, menuItems, metrics, foodData);

    return { metrics, hourlyTrends, foodData, cashierData, anomalies, alertsList, forecast, pairings, recommendations };
  }, [orders, menuItems, cashClose, TARGET_REVENUE]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon sx={{ color: '#C62828', fontSize: 20 }} />;
      case 'warning':
        return <Warning sx={{ color: '#F57F17', fontSize: 20 }} />;
      case 'info':
        return <InfoIcon sx={{ color: '#1565C0', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#C62828';
      case 'warning':
        return '#F57F17';
      case 'info':
        return '#1565C0';
      default:
        return '#6B7280';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Revenue Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Daily Revenue
                </Typography>
                <AttachMoney sx={{ fontSize: 24, color: '#B85C38' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(analytics.metrics.totalRevenue)}
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Target: {formatCurrency(TARGET_REVENUE)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: analytics.metrics.percentOfTarget >= 100 ? '#2E7D32' : '#F57F17' }}>
                      {analytics.metrics.percentOfTarget.toFixed(0)}%
                    </Typography>
                    <Edit
                      sx={{ fontSize: 13, color: 'text.disabled', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                      onClick={() => { setTargetValue(String(TARGET_REVENUE)); setTargetDialogOpen(true); }}
                    />
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(analytics.metrics.percentOfTarget, 100)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {analytics.metrics.trending === 'up' && <TrendingUp sx={{ fontSize: 16, color: '#2E7D32' }} />}
                {analytics.metrics.trending === 'down' && <TrendingDown sx={{ fontSize: 16, color: '#C62828' }} />}
                <Typography variant="caption" color="text.secondary">
                  {analytics.metrics.trending === 'up' ? 'Trending strong' : analytics.metrics.trending === 'down' ? 'Below target' : 'On pace'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Orders Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Orders Today
                </Typography>
                <ShoppingCart sx={{ fontSize: 24, color: '#D4A017' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {analytics.metrics.orderCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg: {formatCurrency(analytics.metrics.avgOrderValue)} per order
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Forecast Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Projected Revenue
                </Typography>
                <TrendingUp sx={{ fontSize: 24, color: analytics.forecast?.willMakeTarget ? '#2E7D32' : '#C62828' }} />
              </Box>
              {analytics.forecast ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatCurrency(Math.round(analytics.forecast.projectedRevenue))}
                  </Typography>
                  <Typography variant="caption" color={analytics.forecast.willMakeTarget ? '#2E7D32' : '#C62828'} sx={{ fontWeight: 600 }}>
                    {analytics.forecast.willMakeTarget ? '✓ Will meet target' : '✗ Below target'}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Need more data
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Food Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Top Seller
                </Typography>
                <LocalOffer sx={{ fontSize: 24, color: '#B85C38' }} />
              </Box>
              {analytics.foodData.topItems.length > 0 ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {analytics.foodData.topItems[0].name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.foodData.topItems[0].quantity} sold • {formatCurrency(analytics.foodData.topItems[0].revenue)}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No sales yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Alerts Section */}
      {analytics.alertsList.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            ⚠️ Alerts & Insights
          </Typography>
          <Stack spacing={1}>
            {analytics.alertsList.slice(0, 5).map((alert, idx) => (
              <Alert
                key={idx}
                severity={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                icon={getSeverityIcon(alert.severity)}
                sx={{
                  '& .MuiAlert-message': { width: '100%' },
                  backgroundColor: alert.severity === 'critical' ? 'rgba(198,40,40,0.08)' : alert.severity === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(21,101,192,0.08)',
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {alert.message}
                  </Typography>
                  {alert.details && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {Object.entries(alert.details)
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                        .join(' • ')}
                    </Typography>
                  )}
                </Box>
              </Alert>
            ))}
            {analytics.alertsList.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                +{analytics.alertsList.length - 5} more alerts
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {/* No Alerts */}
      {analytics.alertsList.length === 0 && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ✓ All systems running smoothly - no anomalies detected
        </Alert>
      )}

      {/* Anomaly Detection Panel */}
      {analytics.anomalies.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            🔍 Anomaly Detection
          </Typography>
          <Grid container spacing={2}>
            {analytics.anomalies.map((anomaly, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: anomaly.severity === 'critical' ? 'error.50' : 'warning.50',
                    borderLeft: 4,
                    borderColor: anomaly.severity === 'critical' ? 'error.main' : 'warning.main',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={anomaly.type.replace(/_/g, ' ')}
                      size="small"
                      color={anomaly.severity === 'critical' ? 'error' : 'warning'}
                      sx={{ fontSize: '0.65rem', fontWeight: 600 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {anomaly.message}
                  </Typography>
                  {anomaly.details && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {Object.entries(anomaly.details)
                        .filter(([k]) => k !== 'employeeId')
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                        .join(' • ')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Smart AI Recommendations */}
      {analytics.recommendations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lightbulb sx={{ color: '#F59E0B' }} /> Smart Recommendations
          </Typography>
          <Grid container spacing={2}>
            {analytics.recommendations.map((rec, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    borderLeft: 4,
                    borderColor:
                      rec.priority === 'high' ? 'error.main' : rec.priority === 'success' ? 'success.main' : rec.priority === 'medium' ? 'warning.main' : 'info.main',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <Typography variant="h5" sx={{ lineHeight: 1 }}>{rec.icon}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {rec.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {rec.message}
                  </Typography>
                  {rec.action && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      endIcon={<ArrowForward fontSize="small" />}
                      onClick={() => handleRecommendationAction(rec)}
                      sx={{ mt: 0.5, textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      {rec.action}
                    </Button>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Detailed Forecasting Section */}
      {analytics.forecast && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            📈 Revenue Forecasting
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                <Typography variant="caption" color="text.secondary">Hourly Run Rate</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatCurrency(Math.round(analytics.forecast.hourlyRunRate))}/hr
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: analytics.forecast.willMakeTarget ? 'success.50' : 'warning.50' }}>
                <Typography variant="caption" color="text.secondary">End of Day Projection</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: analytics.forecast.willMakeTarget ? 'success.main' : 'warning.main' }}>
                  {formatCurrency(Math.round(analytics.forecast.projectedRevenue))}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Weekly Projection</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatCurrency(Math.round(analytics.forecast.weeklyProjection))}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Monthly Projection</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatCurrency(Math.round(analytics.forecast.monthlyProjection))}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Optimistic:</strong> {formatCurrency(Math.round(analytics.forecast.optimisticProjection))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong>Pessimistic:</strong> {formatCurrency(Math.round(analytics.forecast.pessimisticProjection))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong>Hours Remaining:</strong> {analytics.forecast.hoursRemaining.toFixed(1)} hrs
            </Typography>
          </Box>
        </Box>
      )}

      {/* Hourly Trends */}
      {analytics.hourlyTrends.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            📊 Hourly Sales Breakdown
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Hour</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Revenue
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Orders
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Avg Order Value
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.hourlyTrends.map((trend) => (
                  <TableRow key={trend.hour}>
                    <TableCell>{trend.label}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#B85C38' }}>
                      {formatCurrency(trend.revenue)}
                    </TableCell>
                    <TableCell align="right">{trend.orderCount}</TableCell>
                    <TableCell align="right">{formatCurrency(trend.avgOrderValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Top & Bottom Products */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Top Performers */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            🏆 Top 5 Sellers
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Revenue
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Margin %
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.foodData.topItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={`${item.profitMargin.toFixed(0)}%`} size="small" color={item.profitMargin > 40 ? 'success' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Bottom Performers */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            📉 Bottom 5 Sellers
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Revenue
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Margin %
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.foodData.bottomItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={`${item.profitMargin.toFixed(0)}%`} size="small" color={item.profitMargin < 20 ? 'error' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Cashier Performance */}
      {analytics.cashierData.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            👥 Cashier Performance
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Cashier</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Orders
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Revenue
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Avg Order
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Completion %
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Refund %
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.cashierData.map((cashier) => (
                  <TableRow key={cashier.employeeId} sx={{ opacity: cashier.refundRate > 15 ? 0.7 : 1 }}>
                    <TableCell sx={{ fontWeight: 500 }}>{cashier.employeeId === 'Unknown' ? 'Unknown User' : cashier.employeeId}</TableCell>
                    <TableCell align="right">{cashier.ordersProcessed}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(cashier.totalRevenue)}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(cashier.avgOrderValue)}</TableCell>
                    <TableCell align="right">
                      <Chip label={`${cashier.completionRate.toFixed(0)}%`} size="small" color={cashier.completionRate > 90 ? 'success' : 'warning'} />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${cashier.refundRate.toFixed(0)}%`}
                        size="small"
                        color={cashier.refundRate > 15 ? 'error' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Announcement / Promotion Dialog */}
      <Dialog open={announcementOpen} onClose={() => setAnnouncementOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Promotion Announcement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will be posted as an active announcement visible to customers and staff.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Promotion Message"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnouncementOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSendAnnouncement} disabled={announcementSending || !announcementText.trim()}>
            {announcementSending ? 'Sending...' : 'Post Announcement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit revenue target dialog */}
      <Dialog open={targetDialogOpen} onClose={() => setTargetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Daily Revenue Target</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="number"
            label="Revenue Target (₱)"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            InputProps={{ startAdornment: '₱' }}
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTargetDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTarget} disabled={targetSaving || !targetValue || parseFloat(targetValue) <= 0}>
            {targetSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIInsightsPanel;
