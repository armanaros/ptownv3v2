import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Settings,
  Storage,
  Speed,
  Memory,
  AttachMoney,
  CheckCircle,
  DeleteForever,
  Warning,
  Download,
  Upload,
  History,
  Refresh,
  CloudDone,
  Error as ErrorIcon,
  DataUsage,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { getSystemConfig, saveSystemConfig } from '@/services/config.service';
import { DATA_SECTIONS, deleteSelectedData } from '@/services/datamanagement.service';
import { collection, getDocs, doc, setDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { COLLECTIONS } from '@/config/constants';
import { saveAs } from 'file-saver';

// --- Data Export Helpers ---
const exportMap = {
  orders: COLLECTIONS.ORDERS,
  expenses: COLLECTIONS.EXPENSES,
  cashCloses: COLLECTIONS.CASH_CLOSES,
  coupons: COLLECTIONS.COUPONS,
  menuItems: COLLECTIONS.MENU_ITEMS,
};

function toCSV(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const body = rows.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')).join('\n');
  return `${header}\n${body}`;
}

// --- Data Import Helpers ---
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => {
      let val = values[i] || '';
      // Try to parse JSON values
      try {
        val = JSON.parse(val);
      } catch {
        // Keep as string
      }
      obj[h] = val;
    });
    return obj;
  });
}

export default function SystemManagementTab() {
  const [config, setConfig] = useState({});
  const [revenueTarget, setRevenueTarget] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Clear data dialog state
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState([]);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [importing, setImporting] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    dbConnected: true,
    collections: {},
    lastCheck: null,
  });
  const [loadingHealth, setLoadingHealth] = useState(false);

  const loadSystemHealth = async () => {
    setLoadingHealth(true);
    try {
      const collectionsToCheck = ['orders', 'expenses', 'cash_closes', 'menu_items', 'users', 'coupons'];
      const counts = {};
      for (const col of collectionsToCheck) {
        const snap = await getDocs(collection(db, col));
        counts[col] = snap.size;
      }
      setSystemHealth({
        dbConnected: true,
        collections: counts,
        lastCheck: new Date(),
      });
    } catch (err) {
      console.error('Failed to check system health:', err);
      setSystemHealth((prev) => ({ ...prev, dbConnected: false, lastCheck: new Date() }));
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        const parsed = parseCSV(text);
        setImportPreview(parsed.slice(0, 5)); // Show first 5 rows as preview
      }
    };
    reader.readAsText(file);
  };

  const handleOpenImportDialog = (type) => {
    setImportType(type);
    setImportFile(null);
    setImportPreview([]);
    setImportDialogOpen(true);
  };

  const handleImport = async () => {
    if (!importFile || !importType) return;
    setImporting(importType);
    try {
      const text = await importFile.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        toast.error('No valid data found in CSV');
        return;
      }
      const colName = exportMap[importType];
      if (!colName) {
        toast.error('Invalid import type');
        return;
      }
      // Use batch write for efficiency (max 500 per batch)
      const batchSize = 500;
      let imported = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = rows.slice(i, i + batchSize);
        for (const row of chunk) {
          const docId = row.id || doc(collection(db, colName)).id;
          const { id, ...data } = row;
          batch.set(doc(db, colName, docId), data, { merge: true });
          imported++;
        }
        await batch.commit();
      }
      toast.success(`Imported ${imported} ${importType} records`);
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(null);
    }
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const col = exportMap[type];
      if (!col) {
        toast.error('Invalid export type');
        return;
      }
      const snap = await getDocs(collection(db, col));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!data.length) {
        toast.error('No data to export');
        return;
      }
      const csv = toCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${type}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${data.length} ${type} records`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    loadConfig();
    loadAuditLogs();
    loadSystemHealth();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getSystemConfig();
      setConfig(data || {});
      setRevenueTarget(data?.revenueTarget || '');
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleSaveTarget = async () => {
    setSaving(true);
    try {
      await saveSystemConfig({ revenueTarget: parseFloat(revenueTarget) || 0 });
      toast.success('Revenue target updated');
      loadConfig();
    } catch (err) {
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSection = (key) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (selectedSections.length === DATA_SECTIONS.length) {
      setSelectedSections([]);
    } else {
      setSelectedSections(DATA_SECTIONS.map((s) => s.key));
    }
  };

  const handleOpenClearDialog = () => {
    setSelectedSections([]);
    setConfirmText('');
    setClearDialogOpen(true);
  };

  const handleClearData = async () => {
    if (confirmText !== 'DELETE' || selectedSections.length === 0) return;
    
    setDeleting(true);
    try {
      const results = await deleteSelectedData(selectedSections);
      const totalDeleted = Object.values(results).reduce((sum, n) => sum + n, 0);
      toast.success(`Deleted ${totalDeleted} records from ${selectedSections.length} collections`);
      setClearDialogOpen(false);
      setSelectedSections([]);
      setConfirmText('');
    } catch (err) {
      console.error('Failed to clear data:', err);
      toast.error('Failed to clear data');
    } finally {
      setDeleting(false);
    }
  };

  const systemInfo = [
    { icon: <Storage />, label: 'Database', value: 'Firebase Firestore' },
    { icon: <Speed />, label: 'Environment', value: import.meta.env.MODE },
    { icon: <Memory />, label: 'Version', value: 'POS v2.0' },
    { 
      icon: systemHealth.dbConnected ? <CloudDone color="success" /> : <ErrorIcon color="error" />, 
      label: 'Connection', 
      value: systemHealth.dbConnected ? 'Connected' : 'Disconnected',
      status: systemHealth.dbConnected ? 'success' : 'error'
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Settings sx={{ fontSize: 32, color: 'grey.700' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>System Management</Typography>
            <Typography variant="body2" color="text.secondary">Configure system settings and maintenance</Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Core system modules connected. All Firebase subscriptions active.
        </Alert>

        <Grid container spacing={3}>
          {/* Data Export Panel */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Download fontSize="small" /> Data Export
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download your data as CSV for offline analysis or backup.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.keys(exportMap).map((key) => (
                  <Button
                    key={key}
                    variant="outlined"
                    size="small"
                    onClick={() => handleExport(key)}
                    disabled={exporting !== null}
                    startIcon={exporting === key ? <CircularProgress size={16} /> : <Download />}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Button>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Data Import Panel */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Upload fontSize="small" /> Data Import
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Import data from CSV files. Data will be merged with existing records.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.keys(exportMap).map((key) => (
                  <Button
                    key={key}
                    variant="outlined"
                    size="small"
                    onClick={() => handleOpenImportDialog(key)}
                    disabled={importing !== null}
                    startIcon={importing === key ? <CircularProgress size={16} /> : <Upload />}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Button>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney fontSize="small" /> Daily Revenue Target
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  type="number"
                  value={revenueTarget}
                  onChange={(e) => setRevenueTarget(e.target.value)}
                  InputProps={{ startAdornment: '₱' }}
                  sx={{ flex: 1 }}
                />
                <Button variant="contained" onClick={handleSaveTarget} disabled={saving}>
                  Save
                </Button>
              </Box>
              {config.revenueTarget && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Current target: ₱{config.revenueTarget.toLocaleString()}
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                <DeleteForever fontSize="small" /> Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Permanently delete data from Firebase. This action cannot be undone.
              </Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteForever />}
                onClick={handleOpenClearDialog}
              >
                Clear Firebase Data
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>System Information</Typography>
              <List dense>
                {systemInfo.map((item, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} secondary={item.value} />
                    <CheckCircle color="success" fontSize="small" />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

        {/* System Health Section */}
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DataUsage fontSize="small" /> System Health & Data Statistics
              </Typography>
              <Button
                size="small"
                startIcon={loadingHealth ? <CircularProgress size={14} /> : <Refresh />}
                onClick={loadSystemHealth}
                disabled={loadingHealth}
              >
                Refresh
              </Button>
            </Box>
            <Grid container spacing={2}>
              {Object.entries(systemHealth.collections).map(([col, count]) => (
                <Grid item xs={6} sm={4} md={2} key={col}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{count.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {systemHealth.lastCheck && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Last checked: {systemHealth.lastCheck.toLocaleString()}
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Audit Logs Section */}
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <History fontSize="small" /> Recent Activity Logs
              </Typography>
              <Button
                size="small"
                startIcon={loadingLogs ? <CircularProgress size={14} /> : <Refresh />}
                onClick={loadAuditLogs}
                disabled={loadingLogs}
              >
                Refresh
              </Button>
            </Box>
            {auditLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No recent activity logs found.</Typography>
            ) : (
              <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {auditLogs.map((log) => (
                  <ListItem key={log.id} divider sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={log.action || log.type || 'Activity'}
                            size="small"
                            color={log.action === 'delete' ? 'error' : log.action === 'create' ? 'success' : 'default'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2">{log.description || log.message || log.action || 'Activity logged'}</Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {log.user || log.userId || 'System'} • {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Unknown time'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>

        {/* Clear Data Dialog */}
        <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            Clear Firebase Data
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 3 }}>
              This will permanently delete all selected data from Firebase. This action cannot be undone!
            </Alert>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Select data to delete:
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Button size="small" onClick={handleSelectAll} sx={{ mb: 1 }}>
                {selectedSections.length === DATA_SECTIONS.length ? 'Deselect All' : 'Select All'}
              </Button>
              <FormGroup>
                {DATA_SECTIONS.map((section) => (
                  <FormControlLabel
                    key={section.key}
                    control={
                      <Checkbox
                        checked={selectedSections.includes(section.key)}
                        onChange={() => handleToggleSection(section.key)}
                        color="error"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {section.label}
                        <Chip label={section.collection} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Type <strong>DELETE</strong> to confirm:
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              error={confirmText.length > 0 && confirmText !== 'DELETE'}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleClearData}
              disabled={confirmText !== 'DELETE' || selectedSections.length === 0 || deleting}
              startIcon={<DeleteForever />}
            >
              {deleting ? 'Deleting...' : `Delete ${selectedSections.length} Collection(s)`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Import Data Dialog */}
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Upload color="primary" />
            Import {importType.charAt(0).toUpperCase() + importType.slice(1)} Data
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              Upload a CSV file to import data. Existing records with matching IDs will be updated (merged).
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<Upload />}
                fullWidth
              >
                {importFile ? importFile.name : 'Select CSV File'}
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleImportFileChange}
                />
              </Button>
            </Box>

            {importPreview.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Preview (first {importPreview.length} rows):
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.100', p: 1, borderRadius: 1, fontSize: '0.75rem' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(importPreview, null, 2)}
                  </pre>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)} disabled={importing !== null}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!importFile || importing !== null}
              startIcon={importing ? <CircularProgress size={16} /> : <Upload />}
            >
              {importing ? 'Importing...' : 'Import Data'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
