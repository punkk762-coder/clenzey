const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, ...args: unknown[]) {
  if (!isDev && (level === 'debug' || level === 'info')) return;
  console[level](...args);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info:  (...args: unknown[]) => log('info',  ...args),
  warn:  (...args: unknown[]) => log('warn',  ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
