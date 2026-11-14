const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

// Checks that the request has a valid JWT token
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Access denied. No token provided.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User no longer exists.' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
};

// RBAC: allows only the listed roles, e.g. authorize('ADMIN', 'MANAGER')
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated.' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
    });
  }
  next();
};

module.exports = { authenticate, authorize };