const isDev = import.meta.env.DEV;

const logger = {
  debug: (...args) => { if (isDev) console.debug(...args); },
  info: (...args) => { if (isDev) console.info(...args); },
  log: (...args) => { if (isDev) console.log(...args); },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;
