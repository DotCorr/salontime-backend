const fs = require('fs');
const path = require('path');

// Only create logs directory in development
let logsDir = null;
if (process.env.NODE_ENV !== 'production') {
  logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Simple request logger middleware
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${timestamp} ${method} ${url} - ${ip}`);
  }

  // Log to file
  const logEntry = `${timestamp} ${method} ${url} - ${ip} - ${userAgent}\n`;
  
  // Async file writing to avoid blocking
  fs.appendFile(path.join(logsDir, 'access.log'), logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });

  // Override res.json to log response status
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = new Date().toISOString();
    const statusCode = res.statusCode;
    
    // Log response
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${endTime} ${method} ${url} - ${statusCode}`);
    }

    const responseLog = `${endTime} ${method} ${url} - ${statusCode} - Response sent\n`;
    fs.appendFile(path.join(logsDir, 'access.log'), responseLog, () => {});

    return originalJson.call(this, body);
  };

  next();
};

module.exports = logger;

