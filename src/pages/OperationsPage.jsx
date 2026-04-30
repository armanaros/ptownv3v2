import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Tabs, Tab, Chip } from '@mui/material';
import { Insights, Store, StorefrontOutlined, LocalAtm, LocalOffer, Announcement, Settings, AccountBalance } from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AIInsightsPanel from '@/components/operations/AIInsightsPanel';
import StoreStatusTab from '@/components/operations/StoreStatusTab';
import QuickStockTab from '@/components/operations/QuickStockTab';
import ExpensesTab from '@/components/operations/ExpensesTab';
import CashCloseTab from '@/components/operations/CashCloseTab';
import CouponsTab from '@/components/operations/CouponsTab';
import AnnouncementsTab from '@/components/operations/AnnouncementsTab';
import SystemManagementTab from '@/components/operations/SystemManagementTab';
import useOrders from '@/hooks/useOrders';
import useMenu from '@/hooks/useMenu';
import { getExpensesByDateRange } from '@/services/expense.service';
import { getCashCloseByDateRange } from '@/services/cashclose.service';
import { getManilaDayRange } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/formatters';

export default function OperationsPage() {
  const [tab, setTab] = useState(0);
  
  // Fetch real-time data
  const { orders, loading: ordersLoading, todaysOrders } = useOrders();
  const { items: menuItems, loading: menuLoading } = useMenu();
  const [expenses, setExpenses] = useState([]);
  const [cashClose, setCashClose] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadTodayData = async () => {
      setDataLoading(true);
      try {
        const { start, end } = getManilaDayRange();
        const [expData, cashData] = await Promise.all([
          getExpensesByDateRange(start, end),
          getCashCloseByDateRange(start, end),
        ]);
        setExpenses(expData || []);
        setCashClose(cashData);
      } catch (err) {
        console.error('[Operations] Failed to load data:', err);
      } finally {
        setDataLoading(false);
      }
    };
    loadTodayData();
    const interval = setInterval(loadTodayData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate quick stats for header
  const stats = useMemo(() => {
    const todayRevenue = todaysOrders
      .filter((o) => ['served', 'completed', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    return {
      orders: todaysOrders.length,
      revenue: todayRevenue,
      expenses: totalExpenses,
      net: todayRevenue - totalExpenses,
    };
  }, [todaysOrders, expenses]);

  const loading = ordersLoading || menuLoading || dataLoading;

  const tabs = [
    { label: 'AI Insights', icon: <Insights /> },
    { label: 'Store Status', icon: <Store /> },
    { label: 'Quick Stock', icon: <StorefrontOutlined /> },
    { label: 'Expenses', icon: <LocalAtm /> },
    { label: 'Cash Close', icon: <AccountBalance /> },
    { label: 'Coupons', icon: <LocalOffer /> },
    { label: 'Announcements', icon: <Announcement /> },
    { label: 'System Management', icon: <Settings /> },
  ];

  const renderTabContent = () => {
    switch (tab) {
      case 0:
        return (
          <AIInsightsPanel
            orders={todaysOrders}
            menuItems={menuItems}
            expenses={expenses}
            cashClose={cashClose}
            onTabChange={setTab}
          />
        );
      case 1:
        return <StoreStatusTab />;
      case 2:
        return <QuickStockTab />;
      case 3:
        return <ExpensesTab onUpdate={() => {
          const { start, end } = getManilaDayRange();
          getExpensesByDateRange(start, end).then(setExpenses);
        }} />;
      case 4:
        return <CashCloseTab onUpdate={(data) => setCashClose(data)} />;
      case 5:
        return <CouponsTab />;
      case 6:
        return <AnnouncementsTab />;
      case 7:
        return <SystemManagementTab orders={orders} menuItems={menuItems} />;
      default:
        return null;
    }
  };

  if (loading && tab === 0) {
    return (
      <AppLayout>
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Operations
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${stats.orders} orders`} size="small" variant="outlined" />
            <Chip label={formatCurrency(stats.revenue)} size="small" color="success" />
            <Chip label={`-${formatCurrency(stats.expenses)}`} size="small" color="error" variant="outlined" />
            <Chip label={`Net: ${formatCurrency(stats.net)}`} size="small" color={stats.net >= 0 ? 'primary' : 'error'} />
          </Box>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3, borderBottom: '1px solid #eee' }}
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{ textTransform: 'none', fontSize: '0.95rem' }}
            />
          ))}
        </Tabs>

        <Box>{renderTabContent()}</Box>
      </Box>
    </AppLayout>
  );
}
