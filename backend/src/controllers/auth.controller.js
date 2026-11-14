const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const STAFF_ROLES = ['MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'];

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Never send the password hash back to the client
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
});

// POST /api/auth/register  (public, always creates a GUEST)
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, phone: phone || null, role: 'GUEST' },
    });

    res.status(201).json({ status: 'success', message: 'Registered successfully.', user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      token: signToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/auth/me  (any logged-in user)
const me = async (req, res) => {
  res.status(200).json({ status: 'success', user: req.user });
};

// POST /api/auth/staff  (ADMIN only: creates Manager / Receptionist / Housekeeping)
const createStaff = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ status: 'error', message: 'name, email, password and role are required.' });
    }
    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({ status: 'error', message: `role must be one of: ${STAFF_ROLES.join(', ')}` });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, phone: phone || null, role },
    });

    res.status(201).json({ status: 'success', message: 'Staff account created.', user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { register, login, me, createStaff };