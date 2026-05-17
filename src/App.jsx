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

const LoginPage               = lazy(() => import('@/pages/LoginPage'));
const SetupPage               = lazy(() => import('@/pages/SetupPage'));
const DashboardPage           = lazy(() => import('@/pages/DashboardPage'));
const POSPage                 = lazy(() => import('@/pages/POSPage'));
const SalesPage               = lazy(() => import('@/pages/SalesPage'));
const ProductsPage            = lazy(() => import('@/pages/ProductsPage'));
const InventoryPage           = lazy(() => import('@/pages/InventoryPage'));
const AccountsReceivablePage  = lazy(() => import('@/pages/AccountsReceivablePage'));
const MedicalRepsPage         = lazy(() => import('@/pages/MedicalRepsPage'));
const LogisticsPage           = lazy(() => import('@/pages/LogisticsPage'));
const ExpensesPage            = lazy(() => import('@/pages/ExpensesPage'));
const ReportsPage             = lazy(() => import('@/pages/ReportsPage'));
const UsersPage               = lazy(() => import('@/pages/UsersPage'));
const OperationsPage          = lazy(() => import('@/pages/OperationsPage'));
const ProfilePage             = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage            = lazy(() => import('@/pages/SettingsPage'));

const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner fullscreen />}>
    <Routes>
      {/* Public routes */}
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route path="/dashboard"           element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/pos"                 element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
      <Route path="/sales"               element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/products"            element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/inventory"           element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
      <Route path="/accounts-receivable" element={<ProtectedRoute><AccountsReceivablePage /></ProtectedRoute>} />
      <Route path="/medical-reps"        element={<ProtectedRoute><MedicalRepsPage /></ProtectedRoute>} />
      <Route path="/logistics"           element={<ProtectedRoute><LogisticsPage /></ProtectedRoute>} />
      <Route path="/expenses"            element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/reports"             element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/users"               element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/operations"          element={<ProtectedRoute><OperationsPage /></ProtectedRoute>} />
      <Route path="/profile"             element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings"            element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

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
