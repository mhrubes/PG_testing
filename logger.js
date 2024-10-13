// logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, simple, json } = format;

// Vlastní formát pro logování
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let logMessage = `${timestamp} ${level}: ${message}`;
  if (metadata && Object.keys(metadata).length) { // Zkontrolujte, zda metadata obsahují nějaké klíče
    logMessage += ` ${JSON.stringify(metadata)}`;
  }
  return logMessage;
});

// Výběr formátu na základě LOG_PRETTY
const selectedFormat = process.env.LOG_PRETTY === 'true'
  ? combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  )
  : combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  );

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info', // Úroveň logování z environmentální proměnné
  format: selectedFormat,
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'application.log' })
  ]
});

module.exports = logger;
