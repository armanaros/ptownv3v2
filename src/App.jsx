import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { Toaster } from 'react-hot-toast';
import theme from '@/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DemoTour from '@/components/common/DemoTour';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const POSPage = lazy(() => import('@/pages/POSPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));

const DeliveriesPage = lazy(() => import('@/pages/DeliveriesPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const OperationsPage = lazy(() => import('@/pages/OperationsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const OnlineOrderPage = lazy(() => import('@/pages/OnlineOrderPage'));
const OrderTrackPage = lazy(() => import('@/pages/OrderTrackPage'));
const SetupPage = lazy(() => import('@/pages/SetupPage'));

const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner fullscreen />}>
    <Routes>
      {/* Public routes */}
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/onlineorders" element={<OnlineOrderPage />} />
      <Route path="/order" element={<OrderTrackPage />} />
      <Route path="/order/:id" element={<OrderTrackPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />

      <Route path="/deliveries" element={<ProtectedRoute><DeliveriesPage /></ProtectedRoute>} />
      <Route path="/operations" element={<ProtectedRoute><OperationsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <NotificationProvider>
                <AppRoutes />
                {IS_DEMO && <DemoTour />}
              </NotificationProvider>
            </AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { borderRadius: 8, background: '#333', color: '#fff' },
              }}
            />
          </BrowserRouter>
        </ErrorBoundary>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
