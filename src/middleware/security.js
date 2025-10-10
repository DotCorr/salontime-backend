const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const { asyncHandler, AppError } = require('./errorHandler');

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiting for general API endpoints
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes, then...
  delayMs: 500, // Begin adding 500ms of delay per request above 50
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Brute force protection
const bruteForceProtection = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `brute_force_${ip}`;
  
  // This would typically use Redis or another cache
  // For now, we'll use a simple in-memory store
  if (!global.bruteForceStore) {
    global.bruteForceStore = new Map();
  }
  
  const attempts = global.bruteForceStore.get(key) || { count: 0, resetTime: Date.now() + 15 * 60 * 1000 };
  
  if (Date.now() > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = Date.now() + 15 * 60 * 1000;
  }
  
  if (attempts.count >= 10) {
    return res.status(429).json({
      error: 'Too many failed attempts, please try again later',
      code: 'BRUTE_FORCE_DETECTED'
    });
  }
  
  global.bruteForceStore.set(key, attempts);
  next();
};

// Account lockout after failed attempts
const accountLockout = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }
  
  // Check if account is locked
  const lockoutKey = `lockout_${email}`;
  if (global.accountLockouts && global.accountLockouts.has(lockoutKey)) {
    const lockout = global.accountLockouts.get(lockoutKey);
    if (Date.now() < lockout.until) {
      throw new AppError('Account temporarily locked due to too many failed attempts', 423, 'ACCOUNT_LOCKED');
    } else {
      global.accountLockouts.delete(lockoutKey);
    }
  }
  
  next();
});

// Track failed login attempts
const trackFailedAttempts = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }
  
  const attemptKey = `attempts_${email}`;
  if (!global.loginAttempts) {
    global.loginAttempts = new Map();
  }
  
  const attempts = global.loginAttempts.get(attemptKey) || { count: 0, resetTime: Date.now() + 15 * 60 * 1000 };
  
  if (Date.now() > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = Date.now() + 15 * 60 * 1000;
  }
  
  attempts.count++;
  global.loginAttempts.set(attemptKey, attempts);
  
  // Lock account after 5 failed attempts
  if (attempts.count >= 5) {
    const lockoutKey = `lockout_${email}`;
    if (!global.accountLockouts) {
      global.accountLockouts = new Map();
    }
    
    global.accountLockouts.set(lockoutKey, {
      until: Date.now() + 30 * 60 * 1000, // 30 minutes
      attempts: attempts.count
    });
    
    throw new AppError('Account locked due to too many failed attempts', 423, 'ACCOUNT_LOCKED');
  }
  
  next();
});

// Reset failed attempts on successful login
const resetFailedAttempts = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  
  if (email && global.loginAttempts) {
    const attemptKey = `attempts_${email}`;
    global.loginAttempts.delete(attemptKey);
  }
  
  next();
});

// Input sanitization
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };
  
  const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Session security
const sessionSecurity = (req, res, next) => {
  // Invalidate session on role switch
  if (req.headers['x-role-switch'] === 'true') {
    // This would typically invalidate the current session
    // and require re-authentication
    return res.status(401).json({
      error: 'Session invalidated due to role switch',
      code: 'SESSION_INVALIDATED'
    });
  }
  
  next();
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://salontime.app',
      'https://www.salontime.app',
      'http://localhost:3000', // Development
      'http://localhost:8080', // Development
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = {
  authRateLimit,
  apiRateLimit,
  speedLimiter,
  securityHeaders,
  bruteForceProtection,
  accountLockout,
  trackFailedAttempts,
  resetFailedAttempts,
  sanitizeInput,
  sessionSecurity,
  corsOptions,
};
