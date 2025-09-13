const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Client routes
router.post('/join',
  authenticateToken,
  requireRole(['client']),
  waitlistController.joinWaitlist
);

router.get('/my-waitlist',
  authenticateToken,
  requireRole(['client']),
  waitlistController.getMyWaitlist
);

router.delete('/:waitlistId',
  authenticateToken,
  requireRole(['client']),
  waitlistController.leaveWaitlist
);

// Salon owner routes
router.get('/salon',
  authenticateToken,
  requireRole(['salon_owner']),
  waitlistController.getSalonWaitlist
);

module.exports = router;

