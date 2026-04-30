import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableBody, TableRow,
  TableCell, Paper, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Stack, Tooltip,
  TableContainer, InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Search, Block, CheckCircle, Phone } from '@mui/icons-material';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import useAuth from '@/hooks/useAuth';
import { subscribeToUsers, createUser, updateUser, deleteUser } from '@/services/user.service';
import { ROLES } from '@/config/constants';

const ROLE_COLORS = {
  admin: 'error', manager: 'warning', employee: 'primary', delivery: 'secondary',
};

const EMPTY_CREATE = {
  username: '', email: '', password: '', firstName: '', lastName: '', role: 'employee', phone: '',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creating, setCreating]     = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [editing, setEditing]       = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const unsub = subscribeToUsers((data) => {
      setUsers(data.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser(createForm);
      toast.success('User created');
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (u) => {
    setEditTarget(u);
    setEditForm({
      firstName: u.firstName || '',
      lastName:  u.lastName  || '',
      phone:     u.phone     || '',
      role:      u.role      || 'employee',
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      await updateUser(editTarget.id, editForm);
      toast.success('User updated');
      setEditTarget(null);
    } catch {
      toast.error('Failed to update user');
    } finally {
      setEditing(false);
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────────
  const handleToggleActive = async (u) => {
    const next = u.isActive === false ? true : false;
    try {
      await updateUser(u.id, { isActive: next });
      toast.success(next ? `${u.firstName} reactivated` : `${u.firstName} deactivated`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await deleteUser(deleteTarget.id);
      toast.success('User deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>;

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>User Management</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: 200 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              }}
            />
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Add User
            </Button>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((u) => {
                const isMe = u.id === currentUser?.uid;
                const active = u.isActive !== false;
                return (
                  <TableRow key={u.id} sx={{ opacity: active ? 1 : 0.55 }}>
                    <TableCell sx={{ fontWeight: 600 }}>{u.username}</TableCell>
                    <TableCell>{u.firstName} {u.lastName}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{u.email}</TableCell>
                    <TableCell>
                      {u.phone ? (
                        <Typography
                          component="a" href={`tel:${u.phone}`} variant="body2"
                          sx={{ color: 'primary.main', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          <Phone sx={{ fontSize: 14 }} />{u.phone}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.role}
                        size="small"
                        color={ROLE_COLORS[u.role] || 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={active ? 'Active' : 'Inactive'}
                        size="small"
                        color={active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(u)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!isMe && (
                          <Tooltip title={active ? 'Deactivate' : 'Reactivate'}>
                            <IconButton size="small" color={active ? 'warning' : 'success'} onClick={() => handleToggleActive(u)}>
                              {active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isMe && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(u)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {search ? 'No users match your search.' : 'No users found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle>Create New User</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Username" value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                required fullWidth />
              <TextField label="Email" type="email" value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required fullWidth />
              <TextField label="Password" type="password" value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required fullWidth inputProps={{ minLength: 6 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="First Name" value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  required fullWidth />
                <TextField label="Last Name" value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  required fullWidth />
              </Box>
              <TextField label="Phone" value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                fullWidth inputProps={{ inputMode: 'tel' }} />
              <TextField select label="Role" value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                fullWidth>
                {Object.values(ROLES).map((r) => (
                  <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <form onSubmit={handleEdit}>
          <DialogTitle>Edit User — {editTarget?.username}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="First Name" value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  required fullWidth />
                <TextField label="Last Name" value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  required fullWidth />
              </Box>
              <TextField label="Phone" value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                fullWidth inputProps={{ inputMode: 'tel' }}
                helperText="Used for tap-to-call on the Employees page" />
              <TextField select label="Role" value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                fullWidth>
                {Object.values(ROLES).map((r) => (
                  <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={editing}>
              {editing ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Delete user "${deleteTarget?.username}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmColor="error"
      />
    </AppLayout>
  );
}
