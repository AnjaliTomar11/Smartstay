const prisma = require('../prisma');

const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE'];
const ROOM_STATUSES = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];

// GET /api/rooms?type=DELUXE&status=AVAILABLE  (public)
const getRooms = async (req, res) => {
  try {
    const { type, status } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const rooms = await prisma.room.findMany({ where, orderBy: { roomNumber: 'asc' } });
    res.status(200).json({ status: 'success', count: rooms.length, rooms });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/rooms/:id  (public)
const getRoomById = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) return res.status(404).json({ status: 'error', message: 'Room not found.' });
    res.status(200).json({ status: 'success', room });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/rooms  (ADMIN, MANAGER)
const createRoom = async (req, res) => {
  try {
    const { roomNumber, floor, type, pricePerNight, capacity, amenities, description } = req.body;

    if (!roomNumber || floor === undefined || !type || pricePerNight === undefined || capacity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'roomNumber, floor, type, pricePerNight and capacity are required.',
      });
    }
    if (!ROOM_TYPES.includes(type)) {
      return res.status(400).json({ status: 'error', message: `type must be one of: ${ROOM_TYPES.join(', ')}` });
    }
    if (Number(pricePerNight) <= 0 || Number(capacity) <= 0) {
      return res.status(400).json({ status: 'error', message: 'pricePerNight and capacity must be greater than 0.' });
    }

    const existing = await prisma.room.findFirst({ where: { roomNumber: String(roomNumber) } });
    if (existing) return res.status(409).json({ status: 'error', message: 'Room number already exists.' });

    const room = await prisma.room.create({
      data: {
        roomNumber: String(roomNumber),
        floor: Number(floor),
        type,
        pricePerNight: Number(pricePerNight),
        capacity: Number(capacity),
        amenities: Array.isArray(amenities) ? amenities : [],
        description: description || null,
        status: 'AVAILABLE',
      },
    });
    res.status(201).json({ status: 'success', message: 'Room created.', room });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PUT /api/rooms/:id  (ADMIN, MANAGER)
const updateRoom = async (req, res) => {
  try {
    const { floor, type, pricePerNight, capacity, amenities, description } = req.body;
    const data = {};

    if (floor !== undefined) data.floor = Number(floor);
    if (type !== undefined) {
      if (!ROOM_TYPES.includes(type)) {
        return res.status(400).json({ status: 'error', message: `type must be one of: ${ROOM_TYPES.join(', ')}` });
      }
      data.type = type;
    }
    if (pricePerNight !== undefined) {
      if (Number(pricePerNight) <= 0) {
        return res.status(400).json({ status: 'error', message: 'pricePerNight must be greater than 0.' });
      }
      data.pricePerNight = Number(pricePerNight);
    }
    if (capacity !== undefined) data.capacity = Number(capacity);
    if (amenities !== undefined) data.amenities = Array.isArray(amenities) ? amenities : [];
    if (description !== undefined) data.description = description;

    const room = await prisma.room.update({ where: { id: req.params.id }, data });
    res.status(200).json({ status: 'success', message: 'Room updated.', room });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ status: 'error', message: 'Room not found.' });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/rooms/:id/status  (ADMIN, MANAGER, RECEPTIONIST, HOUSEKEEPING)
const updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!ROOM_STATUSES.includes(status)) {
      return res.status(400).json({ status: 'error', message: `status must be one of: ${ROOM_STATUSES.join(', ')}` });
    }
    if (req.user.role === 'HOUSEKEEPING' && !['CLEANING', 'AVAILABLE', 'MAINTENANCE'].includes(status)) {
      return res.status(403).json({ status: 'error', message: 'Housekeeping can only set CLEANING, AVAILABLE or MAINTENANCE.' });
    }

    const room = await prisma.room.update({ where: { id: req.params.id }, data: { status } });
    res.status(200).json({ status: 'success', message: `Room status changed to ${status}.`, room });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ status: 'error', message: 'Room not found.' });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/rooms/:id  (ADMIN)
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return res.status(404).json({ status: 'error', message: 'Room not found.' });
    }

    const bookingCount = await prisma.booking.count({ where: { roomId: id } });
    if (bookingCount > 0) {
      return res.status(409).json({
        status: 'error',
        message: `This room cannot be deleted because it has ${bookingCount} booking(s).`,
      });
    }

    await prisma.room.delete({ where: { id } });
    return res.status(200).json({ status: 'success', message: 'Room deleted.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {  getRooms, getRoomById, createRoom, updateRoom, updateRoomStatus, deleteRoom };