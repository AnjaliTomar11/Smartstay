const express = require('express');
const {
  getRooms, getRoomById, createRoom, updateRoom, updateRoomStatus, deleteRoom,
} = require('../controllers/room.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', getRooms);
router.get('/:id', getRoomById);

router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), createRoom);
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), updateRoom);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'), updateRoomStatus);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteRoom);

module.exports = router;