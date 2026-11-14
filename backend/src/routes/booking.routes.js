const express = require('express');
const {
  checkAvailability, createBooking, getBookings, getBookingById, cancelBooking,
  checkInBooking, checkOutBooking,
} = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/availability', checkAvailability); // must stay above '/:id'
router.post('/', authenticate, createBooking);
router.get('/', authenticate, getBookings);
router.get('/:id', authenticate, getBookingById);
router.patch('/:id/cancel', authenticate, cancelBooking);
router.patch('/:id/check-in', authenticate, checkInBooking);
router.patch('/:id/check-out', authenticate, checkOutBooking);

module.exports = router;