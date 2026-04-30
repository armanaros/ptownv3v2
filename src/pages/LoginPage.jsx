import { Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import useAuth from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const LoginPage = () => {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) return <LoadingSpinner fullscreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #B85C38 0%, #8E4529 100%)',
      p: 2,
    }}>
      <LoginForm onLogin={login} />
    </Box>
  );
};

export default LoginPage;
