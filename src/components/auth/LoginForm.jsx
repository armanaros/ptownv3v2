import { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Chip, Stack } from '@mui/material';
import { Person, Lock, Visibility, VisibilityOff, AdminPanelSettings, ManageAccounts, Badge } from '@mui/icons-material';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_ACCOUNTS = [
  { label: 'Admin', username: 'demo_admin', password: 'Demo@2026', icon: <AdminPanelSettings fontSize="small" />, color: 'error' },
  { label: 'Manager', username: 'demo_manager', password: 'Demo@2026', icon: <ManageAccounts fontSize="small" />, color: 'warning' },
  { label: 'Cashier', username: 'demo_cashier', password: 'Demo@2026', icon: <Badge fontSize="small" />, color: 'info' },
];

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address');
      return;
    }
    setResetError('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMsg(`Password reset email sent to "${resetEmail}". Check your inbox.`);
    } catch (err) {
      setResetError(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetClose = () => {
    setResetOpen(false);
    setResetEmail('');
    setResetMsg('');
    setResetError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err.message === 'Username not found' ? 'Invalid username' : 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 400, width: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="P-Town"
            sx={{ width: 180, height: 'auto', mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">System Management</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
            autoFocus
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ py: 1.5 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="text" size="small" onClick={() => setResetOpen(true)} sx={{ textTransform: 'none', color: 'text.secondary' }}>
              Forgot password?
            </Button>
          </Box>
        </Box>

        {IS_DEMO && (
          <>
            <Divider sx={{ mt: 3, mb: 2 }}>
              <Chip label="DEMO — Quick Login" size="small" color="warning" />
            </Divider>
            <Stack spacing={1}>
              {DEMO_ACCOUNTS.map((acc) => (
                <Button
                  key={acc.label}
                  variant="outlined"
                  color={acc.color}
                  startIcon={acc.icon}
                  fullWidth
                  size="small"
                  onClick={() => { setUsername(acc.username); setPassword(acc.password); }}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>{acc.label}</span>
                    <Typography variant="caption" color="text.secondary">{acc.username}</Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
              Click a role to pre-fill credentials, then press Sign In
            </Typography>
          </>
        )}
      </CardContent>

      <Dialog open={resetOpen} onClose={handleResetClose} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          {resetMsg ? (
            <Alert severity="success">{resetMsg}</Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your email address and we'll send a password reset link.
              </Typography>
              {resetError && <Alert severity="error" sx={{ mb: 2 }}>{resetError}</Alert>}
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoFocus
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetClose}>Cancel</Button>
          {!resetMsg && (
            <Button variant="contained" onClick={handleForgotPassword} disabled={resetLoading}>
              {resetLoading ? 'Sending...' : 'Send Reset Email'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default LoginForm;
