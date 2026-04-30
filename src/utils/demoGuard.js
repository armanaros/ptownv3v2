import toast from 'react-hot-toast';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

/**
 * Returns true (and shows a toast) when in demo mode — use at the top of
 * any destructive handler to block the action:
 *
 *   if (demoBlock()) return;
 */
export const demoBlock = (message = 'Deletes are disabled in demo mode') => {
  if (IS_DEMO) {
    toast('🔒 ' + message, { duration: 3000 });
    return true;
  }
  return false;
};

export const IS_DEMO_MODE = IS_DEMO;
