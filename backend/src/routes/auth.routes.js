const express = require('express');
const { register, login, me, createStaff } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

router.post('/register', register);
router.post('/login', loginRateLimit, login);
router.get('/me', authenticate, me);
router.post('/staff', authenticate, authorize('ADMIN'), createStaff);

module.exports = router;