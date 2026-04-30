import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Grid2 as Grid, Card, CardContent, CardActions,
  Chip, Stack, Avatar, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Collapse,
  Divider, Tooltip, Paper, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, Menu,
} from '@mui/material';
import {
  Add, Edit, Delete, ExpandMore, ExpandLess, CalendarToday, AccessTime,
  Today, Person, ChevronLeft, ChevronRight, ContentCopy, Download,
  Phone, CheckCircle, Schedule as ScheduleIcon, Warning, Cancel,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { subscribeToUsers } from '@/services/user.service';
import {
  createShift, updateShift, updateShiftStatus, deleteShift, subscribeToShifts,
} from '@/services/schedule.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  admin: 'error', manager: 'warning', employee: 'primary', delivery: 'secondary',
};

const ATTENDANCE = {
  scheduled: { label: 'Scheduled', color: 'default',  Icon: ScheduleIcon },
  attended:  { label: 'Attended',  color: 'success',  Icon: CheckCircle  },
  late:      { label: 'Late',      color: 'warning',  Icon: Warning      },
  absent:    { label: 'Absent',    color: 'error',    Icon: Cancel       },
};

const EMPTY_SHIFT = {
  employeeId: '', date: '', startTime: '', endTime: '',
  note: '', repeatWeeks: 0, status: 'scheduled',
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function toDateStr(date) { return date.toISOString().split('T')[0]; }
function getTodayStr()    { return toDateStr(new Date()); }
function getWeekStart(offsetWeeks = 0) {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 0;
}

// ── ShiftRow ──────────────────────────────────────────────────────────────────

function ShiftRow({ shift, onEdit, onDelete, onCopy, onStatusChange, past }) {
  const [anchor, setAnchor] = useState(null);
  const att = ATTENDANCE[shift.status || 'scheduled'] || ATTENDANCE.scheduled;
  const { Icon: AttIcon } = att;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.75,
      borderRadius: 1, bgcolor: past ? 'transparent' : 'action.hover', opacity: past ? 0.65 : 1,
    }}>
      <CalendarToday sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>{shift.date}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
          {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
          {' '}({calcHours(shift.startTime, shift.endTime).toFixed(1)}h)
        </Typography>
        {shift.note && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
            {shift.note}
          </Typography>
        )}
      </Box>

      {/* Attendance chip — click to change */}
      <Tooltip title="Change attendance status">
        <Chip
          icon={<AttIcon style={{ fontSize: 12 }} />}
          label={att.label}
          size="small"
          color={att.color}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ height: 20, fontSize: 10, cursor: 'pointer' }}
        />
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {Object.entries(ATTENDANCE).map(([key, val]) => (
          <MenuItem
            key={key}
            selected={shift.status === key}
            onClick={() => { onStatusChange(shift.id, key); setAnchor(null); }}
          >
            <val.Icon fontSize="small" sx={{ mr: 1 }} />
            {val.label}
          </MenuItem>
        ))}
      </Menu>

      <Tooltip title="Copy to next week">
        <IconButton size="small" onClick={() => onCopy(shift)} sx={{ p: 0.25 }}>
          <ContentCopy sx={{ fontSize: 13 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(shift)} sx={{ p: 0.25 }}>
          <Edit sx={{ fontSize: 13 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => onDelete(shift)} sx={{ p: 0.25 }}>
          <Delete sx={{ fontSize: 13 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── EmployeeCard ──────────────────────────────────────────────────────────────

function EmployeeCard({ emp, shifts, onAddShift, onEditShift, onDeleteShift, onCopyShift, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const today = getTodayStr();

  const upcoming = shifts.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past     = shifts.filter((s) => s.date < today) .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const isOnShiftToday = shifts.some((s) => s.date === today);

  // Hours summaries
  const weekStart  = toDateStr(getWeekStart(0));
  const weekEnd    = toDateStr(getWeekStart(1));
  const monthStr   = today.slice(0, 7);
  const weeklyHrs  = shifts.filter((s) => s.date >= weekStart && s.date < weekEnd).reduce((n, s) => n + calcHours(s.startTime, s.endTime), 0);
  const monthlyHrs = shifts.filter((s) => s.date.startsWith(monthStr)).reduce((n, s) => n + calcHours(s.startTime, s.endTime), 0);

  const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase() || 'E';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        {/* Avatar + name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{
            bgcolor: isOnShiftToday ? 'success.main' : 'grey.400',
            width: 44, height: 44, fontSize: 16, fontWeight: 700,
          }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {emp.firstName} {emp.lastName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip label={emp.role} size="small" color={ROLE_COLORS[emp.role] || 'default'}
                sx={{ textTransform: 'capitalize', height: 20, fontSize: 11 }} />
              {isOnShiftToday && (
                <Chip label="On Shift Today" size="small" color="success" sx={{ height: 20, fontSize: 11 }} />
              )}
            </Box>
          </Box>
        </Box>

        {/* Contact — phone is a tap-to-call link */}
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" noWrap>{emp.email}</Typography>
          {emp.phone && (
            <Typography
              component="a"
              href={`tel:${emp.phone}`}
              variant="body2"
              sx={{ color: 'primary.main', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Phone sx={{ fontSize: 14 }} />
              {emp.phone}
            </Typography>
          )}
        </Stack>

        {/* Stats grid */}
        <Grid container spacing={0.75}>
          {[
            { label: 'Upcoming', value: upcoming.length },
            { label: 'Total',    value: shifts.length   },
            { label: 'Wk Hrs',   value: `${weeklyHrs.toFixed(1)}h`  },
            { label: 'Mo Hrs',   value: `${monthlyHrs.toFixed(1)}h` },
          ].map(({ label, value }) => (
            <Grid key={label} size={{ xs: 6 }}>
              <Paper variant="outlined" sx={{ p: 0.75, textAlign: 'center', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1 }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 1, pt: 0, justifyContent: 'space-between' }}>
        <Button size="small" startIcon={<Add />} onClick={() => onAddShift(emp)}>Add Shift</Button>
        <Button
          size="small"
          endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
          onClick={() => setExpanded((v) => !v)}
          disabled={shifts.length === 0}
        >
          {shifts.length} Shift{shifts.length !== 1 ? 's' : ''}
        </Button>
      </CardActions>

      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          {upcoming.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                UPCOMING
              </Typography>
              <Stack spacing={0.5} sx={{ mb: past.length > 0 ? 1.5 : 0 }}>
                {upcoming.map((s) => (
                  <ShiftRow key={s.id} shift={s}
                    onEdit={onEditShift} onDelete={onDeleteShift}
                    onCopy={onCopyShift} onStatusChange={onStatusChange}
                  />
                ))}
              </Stack>
            </>
          )}
          {past.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                RECENT PAST
              </Typography>
              <Stack spacing={0.5}>
                {past.map((s) => (
                  <ShiftRow key={s.id} shift={s} past
                    onEdit={onEditShift} onDelete={onDeleteShift}
                    onCopy={onCopyShift} onStatusChange={onStatusChange}
                  />
                ))}
              </Stack>
            </>
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

// ── WeeklyScheduleView ────────────────────────────────────────────────────────

function WeeklyScheduleView({ users, shifts, onAddShift, onEditShift, onDeleteShift }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = getTodayStr();

  const weekDays = useMemo(() => {
    const start = getWeekStart(weekOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekLabel = `${weekDays[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const exportCSV = () => {
    const rows = [['Employee', 'Date', 'Day', 'Start', 'End', 'Hours', 'Status', 'Note']];
    users.forEach((emp) => {
      weekDays.forEach((day) => {
        const ds = toDateStr(day);
        shifts
          .filter((s) => s.employeeId === emp.id && s.date === ds)
          .forEach((s) => {
            rows.push([
              `${emp.firstName} ${emp.lastName}`, ds,
              day.toLocaleDateString('en-PH', { weekday: 'short' }),
              s.startTime, s.endTime,
              calcHours(s.startTime, s.endTime).toFixed(1),
              s.status || 'scheduled', s.note || '',
            ]);
          });
      });
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `schedule-${toDateStr(weekDays[0])}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Box>
      {/* Week navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <IconButton onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft /></IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>{weekLabel}</Typography>
        <IconButton onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight /></IconButton>
        <Button size="small" variant="outlined" onClick={() => setWeekOffset(0)}>This Week</Button>
        <Button size="small" variant="outlined" startIcon={<Download />} onClick={exportCSV}>Export CSV</Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700, minWidth: 140, position: 'sticky', left: 0, bgcolor: 'grey.50', zIndex: 1 }}>
                Employee
              </TableCell>
              {weekDays.map((day) => {
                const ds = toDateStr(day);
                const isToday = ds === today;
                return (
                  <TableCell key={ds} align="center" sx={{
                    fontWeight: 700, minWidth: 100,
                    bgcolor: isToday ? 'primary.main' : 'grey.50',
                    color: isToday ? '#fff' : 'inherit',
                  }}>
                    <Box>{day.toLocaleDateString('en-PH', { weekday: 'short' })}</Box>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </Typography>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {users.map((emp) => (
              <TableRow key={emp.id} hover>
                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: 'grey.300' }}>
                      {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {emp.firstName} {emp.lastName}
                    </Typography>
                  </Box>
                </TableCell>

                {weekDays.map((day) => {
                  const ds = toDateStr(day);
                  const isToday = ds === today;
                  const dayShifts = shifts.filter((s) => s.employeeId === emp.id && s.date === ds);
                  return (
                    <TableCell key={ds} align="center" sx={{
                      bgcolor: isToday ? 'rgba(99,102,241,0.05)' : 'inherit',
                      verticalAlign: 'top', p: 0.75,
                    }}>
                      <Stack spacing={0.4} alignItems="center">
                        {dayShifts.map((s) => {
                          const att = ATTENDANCE[s.status || 'scheduled'] || ATTENDANCE.scheduled;
                          return (
                            <Tooltip key={s.id} title={`${formatTime(s.startTime)}–${formatTime(s.endTime)} · ${att.label}${s.note ? ` · ${s.note}` : ''}`}>
                              <Chip
                                label={formatTime(s.startTime)}
                                size="small"
                                color={att.color}
                                onClick={() => onEditShift(s)}
                                sx={{ fontSize: 10, height: 20, cursor: 'pointer' }}
                              />
                            </Tooltip>
                          );
                        })}
                        <Tooltip title="Add shift">
                          <IconButton
                            size="small"
                            onClick={() => onAddShift(emp, ds)}
                            sx={{ p: 0.25, opacity: 0.3, '&:hover': { opacity: 1 } }}
                          >
                            <Add sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {/* Daily hours totals */}
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', position: 'sticky', left: 0, bgcolor: 'grey.50' }}>
                Total Hrs
              </TableCell>
              {weekDays.map((day) => {
                const ds = toDateStr(day);
                const total = shifts.filter((s) => s.date === ds).reduce((n, s) => n + calcHours(s.startTime, s.endTime), 0);
                return (
                  <TableCell key={ds} align="center" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {total > 0 ? `${total.toFixed(1)}h` : '—'}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [users, setUsers]   = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState(0);
  const [search, setSearch]   = useState('');

  // Shift dialog
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift]         = useState(null);
  const [shiftForm, setShiftForm]               = useState(EMPTY_SHIFT);
  const [shiftSubmitting, setShiftSubmitting]   = useState(false);
  const [conflictWarning, setConflictWarning]   = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const unsubUsers  = subscribeToUsers((data) => {
      setUsers(
        data
          .filter((u) => u.role !== 'admin')
          .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
      );
      setLoading(false);
    });
    const unsubShifts = subscribeToShifts(setShifts);
    return () => { unsubUsers(); unsubShifts(); };
  }, []);

  const today = getTodayStr();

  const todayShifts = useMemo(() =>
    shifts
      .filter((s) => s.date === today)
      .map((s) => ({ ...s, emp: users.find((u) => u.id === s.employeeId) }))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    [shifts, users, today]
  );

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  // Conflict detection
  const checkConflict = (form, excludeId = null) =>
    shifts.filter((s) =>
      s.employeeId === form.employeeId &&
      s.date === form.date &&
      s.id !== excludeId &&
      form.startTime < s.endTime &&
      form.endTime > s.startTime
    );

  const openAddShift = (emp, date) => {
    setEditingShift(null);
    setConflictWarning('');
    setShiftForm({ ...EMPTY_SHIFT, employeeId: emp.id, date: date || today });
    setShiftDialogOpen(true);
  };

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setConflictWarning('');
    setShiftForm({
      employeeId: shift.employeeId, date: shift.date,
      startTime: shift.startTime, endTime: shift.endTime,
      note: shift.note || '', repeatWeeks: 0, status: shift.status || 'scheduled',
    });
    setShiftDialogOpen(true);
  };

  const handleFormChange = (field, value) => {
    const updated = { ...shiftForm, [field]: value };
    setShiftForm(updated);
    if (['employeeId', 'date', 'startTime', 'endTime'].includes(field) &&
        updated.date && updated.startTime && updated.endTime) {
      const c = checkConflict(updated, editingShift?.id);
      setConflictWarning(c.length > 0
        ? `Conflict: existing shift ${formatTime(c[0].startTime)}–${formatTime(c[0].endTime)}`
        : '');
    }
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    if (conflictWarning && !editingShift) { toast.error(conflictWarning); return; }
    setShiftSubmitting(true);
    try {
      const { repeatWeeks, ...shiftData } = shiftForm;
      if (editingShift) {
        await updateShift(editingShift.id, shiftData);
        toast.success('Shift updated');
      } else {
        await createShift(shiftData);
        let created = 1;
        for (let w = 1; w <= (repeatWeeks || 0); w++) {
          const d = new Date(shiftForm.date);
          d.setDate(d.getDate() + w * 7);
          const nextDate = toDateStr(d);
          if (checkConflict({ ...shiftData, date: nextDate }).length === 0) {
            await createShift({ ...shiftData, date: nextDate });
            created++;
          }
        }
        toast.success(created > 1 ? `${created} shifts created` : 'Shift created');
      }
      setShiftDialogOpen(false);
      setShiftForm(EMPTY_SHIFT);
      setEditingShift(null);
    } catch {
      toast.error('Failed to save shift');
    } finally {
      setShiftSubmitting(false);
    }
  };

  const handleCopyShift = async (shift) => {
    const d = new Date(shift.date);
    d.setDate(d.getDate() + 7);
    const nextDate = toDateStr(d);
    if (checkConflict({ ...shift, date: nextDate }).length > 0) {
      toast.error(`Conflict next week — shift not copied`);
      return;
    }
    await createShift({
      employeeId: shift.employeeId, date: nextDate,
      startTime: shift.startTime, endTime: shift.endTime,
      note: shift.note || '', status: 'scheduled',
    });
    toast.success(`Copied to ${nextDate}`);
  };

  const handleStatusChange = async (shiftId, status) => {
    try {
      await updateShiftStatus(shiftId, status);
      toast.success(`Marked as ${ATTENDANCE[status].label}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteShift = async () => {
    try {
      await deleteShift(deleteTarget.id);
      toast.success('Shift deleted');
    } catch {
      toast.error('Failed to delete shift');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>;

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Employees</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {mainTab === 0 && (
              <TextField
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{ width: 190 }}
              />
            )}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setEditingShift(null);
                setShiftForm({ ...EMPTY_SHIFT, date: today });
                setConflictWarning('');
                setShiftDialogOpen(true);
              }}
            >
              Add Shift
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Employees" iconPosition="start" icon={<Person fontSize="small" />} />
          <Tab label="Weekly Schedule" iconPosition="start" icon={<CalendarToday fontSize="small" />} />
        </Tabs>

        {/* ── Tab 0: Employee cards ── */}
        {mainTab === 0 && (
          <>
            {/* Today's schedule banner */}
            <Card sx={{ mb: 3, bgcolor: 'primary.main', color: '#fff' }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: todayShifts.length > 0 ? 2 : 0 }}>
                  <Today />
                  <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                    Today's Schedule — {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Typography>
                  <Chip
                    label={todayShifts.length}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700 }}
                  />
                </Box>
                {todayShifts.length === 0 ? (
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>No shifts scheduled today.</Typography>
                ) : (
                  <Grid container spacing={1}>
                    {todayShifts.map((s) => (
                      <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <Paper sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.15)' }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'rgba(255,255,255,0.3)', color: '#fff', fontWeight: 700 }}>
                            {s.emp ? `${s.emp.firstName?.charAt(0)}${s.emp.lastName?.charAt(0)}` : '?'}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }} noWrap>
                              {s.emp ? `${s.emp.firstName} ${s.emp.lastName}` : 'Unknown'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 12, opacity: 0.8 }} />
                              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                {formatTime(s.startTime)} – {formatTime(s.endTime)}
                              </Typography>
                            </Box>
                          </Box>
                          {s.status && s.status !== 'scheduled' && (
                            <Chip
                              label={ATTENDANCE[s.status]?.label}
                              size="small"
                              color={ATTENDANCE[s.status]?.color}
                              sx={{ height: 18, fontSize: 10 }}
                            />
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>

            {/* Employee cards */}
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={Person}
                title={search ? 'No matches' : 'No employees yet'}
                description={search ? 'Try a different name or role.' : 'Add employees in User Management.'}
              />
            ) : (
              <Grid container spacing={2}>
                {filteredUsers.map((emp) => (
                  <Grid key={emp.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <EmployeeCard
                      emp={emp}
                      shifts={shifts.filter((s) => s.employeeId === emp.id)}
                      onAddShift={openAddShift}
                      onEditShift={openEditShift}
                      onDeleteShift={setDeleteTarget}
                      onCopyShift={handleCopyShift}
                      onStatusChange={handleStatusChange}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* ── Tab 1: Weekly schedule grid ── */}
        {mainTab === 1 && (
          <WeeklyScheduleView
            users={filteredUsers}
            shifts={shifts}
            onAddShift={openAddShift}
            onEditShift={openEditShift}
            onDeleteShift={setDeleteTarget}
          />
        )}
      </Box>

      {/* Shift create / edit dialog */}
      <Dialog open={shiftDialogOpen} onClose={() => setShiftDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleShiftSubmit}>
          <DialogTitle>{editingShift ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {conflictWarning && <Alert severity="warning">{conflictWarning}</Alert>}

              <TextField
                select label="Employee" value={shiftForm.employeeId}
                onChange={(e) => handleFormChange('employeeId', e.target.value)}
                required fullWidth
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} — <em style={{ opacity: 0.6 }}>{u.role}</em>
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Date" type="date" value={shiftForm.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                required fullWidth InputLabelProps={{ shrink: true }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Start Time" type="time" value={shiftForm.startTime}
                  onChange={(e) => handleFormChange('startTime', e.target.value)}
                  required fullWidth InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End Time" type="time" value={shiftForm.endTime}
                  onChange={(e) => handleFormChange('endTime', e.target.value)}
                  required fullWidth InputLabelProps={{ shrink: true }}
                />
              </Box>

              {!editingShift && (
                <TextField
                  select label="Repeat" value={shiftForm.repeatWeeks}
                  onChange={(e) => setShiftForm({ ...shiftForm, repeatWeeks: parseInt(e.target.value) })}
                  fullWidth
                >
                  <MenuItem value={0}>No repeat</MenuItem>
                  {[1, 2, 3, 4].map((w) => (
                    <MenuItem key={w} value={w}>Repeat {w} more week{w > 1 ? 's' : ''}</MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                select label="Attendance Status" value={shiftForm.status}
                onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value })}
                fullWidth
              >
                {Object.entries(ATTENDANCE).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Note (optional)"
                placeholder="e.g. Opening shift, cover for Juan"
                value={shiftForm.note}
                onChange={(e) => setShiftForm({ ...shiftForm, note: e.target.value })}
                fullWidth multiline rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setShiftDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit" variant="contained"
              disabled={shiftSubmitting || (!!conflictWarning && !editingShift)}
            >
              {editingShift ? 'Save Changes' : 'Create Shift'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Shift"
        message={`Delete the shift on ${deleteTarget?.date}? This cannot be undone.`}
        onConfirm={handleDeleteShift}
        onCancel={() => setDeleteTarget(null)}
        confirmColor="error"
      />
    </AppLayout>
  );
}
