import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Avatar,
  Divider,
} from '@mui/material';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import useAuth from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>My Profile</Typography>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.main', fontSize: '1.5rem' }}>
                {user?.firstName?.charAt(0) || 'U'}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {user?.role}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="First Name" value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required fullWidth
                />
                <TextField
                  label="Last Name" value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required fullWidth
                />
                <TextField
                  label="Email" value={form.email} disabled fullWidth
                  helperText="Email cannot be changed"
                />
                <TextField
                  label="Phone" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  fullWidth
                />
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Profile'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>
    </AppLayout>
  );
}
