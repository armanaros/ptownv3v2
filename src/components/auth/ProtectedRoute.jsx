import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isEmployee } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullscreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Employees can only access POS
  if (isEmployee() && location.pathname !== '/pos') {
    return <Navigate to="/pos" replace />;
  }

  return children;
};

export default ProtectedRoute;
