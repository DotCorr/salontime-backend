const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/auth');

// All booking routes require authentication
router.use(authenticateToken);

// Client booking routes
router.post('/', bookingController.createBooking);
router.get('/', bookingController.getMyBookings); // Alias for /my-bookings
router.get('/my-bookings', bookingController.getMyBookings);
router.get('/available-slots', bookingController.getAvailableSlots);
router.get('/stats', bookingController.getBookingStats);
router.patch('/:bookingId/status', bookingController.updateBookingStatus);

// Salon owner booking routes
router.get('/salon', bookingController.getSalonBookings);

module.exports = router;

