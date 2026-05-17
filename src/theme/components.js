export const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '10px 20px',
        minHeight: 44,
        fontSize: '0.9rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
      },
      contained: {
        '&.MuiButton-containedPrimary': {
          background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)' },
        },
        '&.MuiButton-containedSecondary': {
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          color: '#ffffff',
          '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)',
        backgroundColor: '#ffffff',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundColor: '#ffffff',
      },
    },
  },
  MuiTextField: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          minHeight: 44,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#16A34A' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#16A34A', borderWidth: 2 },
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 6, fontWeight: 500 },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: '#ffffff',
        color: '#2D2D2D',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: '#ffffff',
        borderRight: '1px solid rgba(0,0,0,0.06)',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        margin: '2px 8px',
        minHeight: 48,
        '&.Mui-selected': {
          backgroundColor: 'rgba(22,163,74,0.1)',
          color: '#16A34A',
          '& .MuiListItemIcon-root': { color: '#16A34A' },
          '&:hover': { backgroundColor: 'rgba(22,163,74,0.15)' },
        },
        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
      },
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.06)',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-head': {
          backgroundColor: '#FAFAFA',
          fontWeight: 600,
          color: '#2D2D2D',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
  },
};
