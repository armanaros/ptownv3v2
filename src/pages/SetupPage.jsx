import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';

export default function SetupPage() {
  const navigate = useNavigate();
  const [hasUsers, setHasUsers] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS));
      if (!snap.empty) {
        setHasUsers(true);
      } else {
        setHasUsers(false);
      }
    };
    check();
  }, []);

  if (hasUsers === null) return null;

  if (hasUsers) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Setup Already Complete</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              An admin account already exists. Use the login page to sign in.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password, firstName, lastName, email } = form;

    if (!username.trim() || !password || !firstName.trim() || !lastName.trim()) {
      setError('All fields except email are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const emailToUse = email.trim() || `${username.trim().toLowerCase()}@ptown.local`;
      const cred = await createUserWithEmailAndPassword(auth, emailToUse, password);

      await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
        username: username.trim().toLowerCase(),
        email: emailToUse,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'admin',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Card elevation={3} sx={{ maxWidth: 440, width: '100%', borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="P-Town"
              sx={{ width: 180, height: 'auto', mb: 1 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Initial Setup</Typography>
            <Typography variant="body2" color="text.secondary">
              Create the first admin account
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                helperText="Minimum 6 characters"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </Box>
              <TextField
                fullWidth
                label="Email (optional)"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                helperText="Leave blank to auto-generate"
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Creating...' : 'Create Admin Account'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
