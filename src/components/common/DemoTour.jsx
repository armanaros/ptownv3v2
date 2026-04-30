import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Stack, IconButton, LinearProgress, Backdrop } from '@mui/material';
import { Close, ArrowForward, ArrowBack, TipsAndUpdates } from '@mui/icons-material';

// ── Tour steps ────────────────────────────────────────────────────────────────
// Each step can optionally navigate to a route before showing.

const TOUR_STEPS = [
  {
    title: 'Welcome to P-Town POS! 👋',
    body: "This is a live demo — all data is pre-loaded so you can explore every feature. We'll walk you through the key sections in about 2 minutes.",
    route: '/dashboard',
  },
  {
    title: 'Dashboard',
    body: 'Get a real-time overview of today\'s sales, order counts, and revenue trends. Charts update live as orders come in.',
    route: '/dashboard',
  },
  {
    title: 'Point of Sale (POS)',
    body: 'Tap items to add them to the cart, apply coupons, split bills, and print receipts — all from one screen. Works on tablets and phones.',
    route: '/pos',
  },
  {
    title: 'Orders',
    body: 'Track every order in real-time. Update statuses from Pending → Preparing → Ready → Completed. Staff see updates instantly.',
    route: '/orders',
  },
  {
    title: 'Online Orders',
    body: 'Customers can order directly from their phone at ptownrestaurant.com/onlineorders — no app install required. Orders land here automatically.',
    route: '/orders',
  },
  {
    title: 'Menu Management',
    body: 'Add categories, items, prices, photos, and toggle availability on the fly. Changes reflect on the online ordering page immediately.',
    route: '/menu',
  },
  {
    title: 'Reports',
    body: 'View sales by day, week, or month. Export to CSV. Track top-selling items, revenue by category, and employee performance.',
    route: '/reports',
  },
  {
    title: 'Operations',
    body: 'Manage expenses, cash close, coupons, inventory alerts, schedules, announcements, and store open/close status — all in one place.',
    route: '/operations',
  },
  {
    title: "You're all set! 🎉",
    body: "Feel free to explore on your own. All demo data resets daily. Log in as Admin, Manager, or Cashier to see role-based access in action.",
    route: null,
  },
];

const TOUR_STORAGE_KEY = 'ptown_demo_tour_done';

// ── Component ─────────────────────────────────────────────────────────────────

export default function DemoTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  // Auto-start tour once per session (reset by clearing localStorage)
  useEffect(() => {
    const done = sessionStorage.getItem(TOUR_STORAGE_KEY);
    if (!done) setOpen(true);
  }, []);

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  const handleNext = () => {
    const nextStep = step + 1;
    if (nextStep >= TOUR_STEPS.length) {
      handleClose();
      return;
    }
    const nextRoute = TOUR_STEPS[nextStep].route;
    if (nextRoute && nextRoute !== location.pathname) navigate(nextRoute);
    setStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = step - 1;
    if (prevStep < 0) return;
    const prevRoute = TOUR_STEPS[prevStep].route;
    if (prevRoute && prevRoute !== location.pathname) navigate(prevRoute);
    setStep(prevStep);
  };

  const handleClose = () => {
    sessionStorage.setItem(TOUR_STORAGE_KEY, '1');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <>
      <Backdrop open sx={{ zIndex: 1400, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 16, md: 32 },
          right: { xs: 16, md: 32 },
          zIndex: 1500,
          width: { xs: 'calc(100% - 32px)', sm: 380 },
          maxWidth: 420,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: '2px solid',
            borderColor: 'warning.main',
          }}
        >
          {/* Progress bar */}
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 4, backgroundColor: 'warning.lighter', '& .MuiLinearProgress-bar': { backgroundColor: 'warning.main' } }}
          />

          <Box sx={{ p: 2.5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TipsAndUpdates sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Demo Tour · {step + 1} / {TOUR_STEPS.length}
                </Typography>
              </Box>
              <IconButton size="small" onClick={handleClose} sx={{ mt: -0.5, mr: -0.5 }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>

            {/* Content */}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
              {current.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {current.body}
            </Typography>

            {/* Actions */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2.5 }}>
              <Button
                size="small"
                variant="text"
                onClick={handleClose}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Skip tour
              </Button>
              <Stack direction="row" spacing={1}>
                {step > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={handleBack}
                    sx={{ textTransform: 'none' }}
                  >
                    Back
                  </Button>
                )}
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  endIcon={!isLast && <ArrowForward />}
                  onClick={handleNext}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {isLast ? 'Start Exploring' : 'Next'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </>
  );
}
