import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.printf((info) => {
  const { timestamp, level, message, context, ...meta } = info;

  const metaString =
    Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

  return `${safe(timestamp)} [${safe(context ?? 'App')}] ${safe(level)}: ${safe(message)}${metaString}`;
});

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.errors({ stack: true }),
      logFormat,
    ),
  }),

  new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),

  //  error log file
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    level: 'error',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
});

function safe(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || value.message;
  return JSON.stringify(value);
}
