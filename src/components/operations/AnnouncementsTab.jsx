import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Box, TextField, Button, Paper,
  Stack, Avatar, Chip, IconButton, Tooltip,
} from '@mui/material';
import { Campaign, Send, Person, Delete } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { demoBlock } from '@/utils/demoGuard';
import { createAnnouncement, deleteAnnouncement, subscribeToAnnouncements } from '@/services/announcement.service';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import useAuth from '@/hooks/useAuth';

export default function AnnouncementsTab() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async () => {
    if (!newAnnouncement.trim()) {
      toast.error('Please enter an announcement');
      return;
    }
    setPosting(true);
    try {
      await createAnnouncement({
        message: newAnnouncement.trim(),
        createdBy: user?.uid || '',
        authorName: user?.displayName || user?.email || 'Unknown',
      });
      toast.success('Announcement posted');
      setNewAnnouncement('');
    } catch {
      toast.error('Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    if (demoBlock()) { setDeleteTarget(null); return; }
    try {
      await deleteAnnouncement(deleteTarget.id);
      toast.success('Announcement deleted');
    } catch {
      toast.error('Failed to delete announcement');
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Campaign sx={{ fontSize: 32, color: 'info.main' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Team Announcements</Typography>
            <Typography variant="body2" color="text.secondary">Post updates visible to all staff</Typography>
          </Box>
        </Box>

        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Post New Announcement</Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            placeholder="Write your announcement here..."
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handlePost}
            disabled={posting || !newAnnouncement.trim()}
          >
            Post Announcement
          </Button>
        </Paper>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>Recent Announcements</Typography>
        
        {announcements.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No announcements yet</Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {announcements.map((ann, idx) => (
              <Paper key={ann.id || idx} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                    <Person fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {ann.authorName || 'Staff'}
                      </Typography>
                      <Chip label={formatDate(ann.createdAt)} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {ann.message}
                    </Typography>
                  </Box>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(ann)}
                      sx={{ flexShrink: 0, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Announcement"
        message="Delete this announcement? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmColor="error"
      />
    </Card>
  );
}
