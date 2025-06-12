const fs = require('fs');

// Logger utility for logging messages with timestamps
const logger = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  },
  error: (message) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
  },
  logToFile: (message, filePath) => {
    const logMessage = `${new Date().toISOString()}: ${message}\n`;
    fs.appendFile(filePath, logMessage, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }
};

module.exports = logger;