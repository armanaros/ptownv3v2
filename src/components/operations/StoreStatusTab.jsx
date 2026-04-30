import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Switch,
  TextField,
  Button,
  Alert,
  FormControlLabel,
} from '@mui/material';
import { Store, StoreOutlined } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { subscribeToStoreStatus, setStoreStatus } from '@/services/settings.service';
import { useRestaurant } from '@/hooks/useRestaurant';

export default function StoreStatusTab() {
  const { restaurantId } = useRestaurant();
  const [status, setStatus] = useState({ isOpen: true, closedMessage: '' });
  const [closedMessage, setClosedMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStoreStatus((data) => {
      setStatus(data);
      setClosedMessage(data.closedMessage || '');
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = async () => {
    setSaving(true);
    try {
      await setStoreStatus(!status.isOpen, closedMessage, restaurantId);
      toast.success(status.isOpen ? 'Store closed' : 'Store opened');
    } catch (err) {
      toast.error('Failed to update store status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessage = async () => {
    setSaving(true);
    try {
      await setStoreStatus(status.isOpen, closedMessage, restaurantId);
      toast.success('Message updated');
    } catch (err) {
      toast.error('Failed to update message');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {status.isOpen ? (
            <Store sx={{ fontSize: 48, color: 'success.main' }} />
          ) : (
            <StoreOutlined sx={{ fontSize: 48, color: 'error.main' }} />
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Store Status
            </Typography>
            <Typography color="text.secondary">
              {status.isOpen ? 'Store is currently OPEN' : 'Store is currently CLOSED'}
            </Typography>
          </Box>
        </Box>

        <Alert severity={status.isOpen ? 'success' : 'warning'} sx={{ mb: 3 }}>
          {status.isOpen
            ? 'Online ordering is enabled. Customers can place orders.'
            : 'Online ordering is disabled. Customers will see the closed message.'}
        </Alert>

        <FormControlLabel
          control={
            <Switch
              checked={status.isOpen}
              onChange={handleToggle}
              disabled={saving}
              color="success"
              size="medium"
            />
          }
          label={status.isOpen ? 'Store Open' : 'Store Closed'}
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Closed Message (shown when store is closed)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={closedMessage}
          onChange={(e) => setClosedMessage(e.target.value)}
          placeholder="Sorry, we are currently closed. Please check back later!"
          sx={{ mb: 2 }}
        />
        <Button
          variant="outlined"
          onClick={handleSaveMessage}
          disabled={saving}
        >
          Save Message
        </Button>
      </CardContent>
    </Card>
  );
}
