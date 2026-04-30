import { MANILA_OFFSET_HOURS } from '@/config/constants';

export const getManilaDate = (date = new Date()) => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + MANILA_OFFSET_HOURS * 3600000);
};

export const getManilaDayRange = (date = new Date()) => {
  const manila = getManilaDate(date);
  const start = new Date(manila);
  start.setHours(0, 0, 0, 0);
  const end = new Date(manila);
  end.setHours(23, 59, 59, 999);

  const localOffset = date.getTimezoneOffset() * 60000;
  const manilaOffset = MANILA_OFFSET_HOURS * 3600000;
  const diff = localOffset + manilaOffset;

  return {
    start: new Date(start.getTime() - diff),
    end: new Date(end.getTime() - diff),
  };
};

export const getManilaMonthRange = (date = new Date()) => {
  const manila = getManilaDate(date);
  const start = new Date(manila.getFullYear(), manila.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(manila.getFullYear(), manila.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  const localOffset = date.getTimezoneOffset() * 60000;
  const manilaOffset = MANILA_OFFSET_HOURS * 3600000;
  const diff = localOffset + manilaOffset;

  return {
    start: new Date(start.getTime() - diff),
    end: new Date(end.getTime() - diff),
  };
};

export const toManilaDateString = (date) => {
  const manila = getManilaDate(date);
  const y = manila.getFullYear();
  const m = String(manila.getMonth() + 1).padStart(2, '0');
  const d = String(manila.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
