const prisma = require('../prisma');

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'];
const STAFF_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// "2026-10-20" -> Date, or null if invalid
const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
};

const todayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const round2 = (n) => Math.round(n * 100) / 100;

// GST on hotel rooms depends on the room tariff. Verify the current slabs and change here if needed.
const gstRate = (pricePerNight) => (pricePerNight <= 7500 ? 0.05 : 0.18);

const makeBookingNumber = () =>
  `BK${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;

const handleError = (res, error) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ status: 'error', message: error.message });
  }
  if (error.code === 'P2034') {
    return res.status(409).json({
      status: 'error',
      message: 'Another booking for this room was being made at the same time. Please try again.',
    });
  }
  return res.status(500).json({ status: 'error', message: error.message });
};

// GET /api/bookings/availability?checkIn=2026-10-20&checkOut=2026-10-22&type=DELUXE  (public)
const checkAvailability = async (req, res) => {
  try {
    const checkIn = parseDate(req.query.checkIn);
    const checkOut = parseDate(req.query.checkOut);
    if (!checkIn || !checkOut) {
      throw new HttpError(400, 'checkIn and checkOut are required in YYYY-MM-DD format.');
    }
    if (checkOut <= checkIn) throw new HttpError(400, 'checkOut must be after checkIn.');

    const overlapping = await prisma.booking.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
      select: { roomId: true },
    });
    const busyRoomIds = overlapping.map((b) => b.roomId);

    const where = { status: { not: 'MAINTENANCE' }, id: { notIn: busyRoomIds } };
    if (req.query.type) where.type = req.query.type;
    if (req.query.capacity) where.capacity = { gte: Number(req.query.capacity) };

    const rooms = await prisma.room.findMany({ where, orderBy: { roomNumber: 'asc' } });
    res.status(200).json({ status: 'success', count: rooms.length, rooms });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/bookings  (any logged-in user except HOUSEKEEPING)
const createBooking = async (req, res) => {
  try {
    const { roomId, checkInDate, checkOutDate, specialRequests, guestId } = req.body;

    if (req.user.role === 'HOUSEKEEPING') {
      throw new HttpError(403, 'Housekeeping cannot create bookings.');
    }
    if (!roomId || !checkInDate || !checkOutDate) {
      throw new HttpError(400, 'roomId, checkInDate and checkOutDate are required.');
    }

    const checkIn = parseDate(checkInDate);
    const checkOut = parseDate(checkOutDate);
    if (!checkIn || !checkOut) throw new HttpError(400, 'Dates must be in YYYY-MM-DD format.');
    if (checkIn < todayUTC()) throw new HttpError(400, 'Check-in date cannot be in the past.');
    if (checkOut <= checkIn) throw new HttpError(400, 'Check-out must be after check-in.');

    // Guests book for themselves. Staff may book on behalf of a guest.
    const isStaff = STAFF_ROLES.includes(req.user.role);
    const bookingGuestId = isStaff && guestId ? guestId : req.user.id;

    const booking = await prisma.$transaction(
      async (tx) => {
        const room = await tx.room.findUnique({ where: { id: roomId } });
        if (!room) throw new HttpError(404, 'Room not found.');
        if (room.status === 'MAINTENANCE') {
          throw new HttpError(409, 'Room is under maintenance and cannot be booked.');
        }

        const guest = await tx.user.findUnique({ where: { id: bookingGuestId } });
        if (!guest) throw new HttpError(404, 'Guest not found.');

        // Double-booking check
        const conflict = await tx.booking.findFirst({
          where: {
            roomId,
            status: { in: ACTIVE_STATUSES },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        });
        if (conflict) throw new HttpError(409, 'Room is already booked for these dates.');

        const nights = Math.round((checkOut - checkIn) / 86400000);
        const price = Number(room.pricePerNight);
        const baseAmount = round2(nights * price);
        const gstAmount = round2(baseAmount * gstRate(price));
        const totalAmount = round2(baseAmount + gstAmount);

        return tx.booking.create({
          data: {
            bookingNumber: makeBookingNumber(),
            guestId: bookingGuestId,
            roomId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            totalNights: nights,
            baseAmount,
            addOnAmount: 0,
            gstAmount,
            totalAmount,
            status: 'CONFIRMED',
            specialRequests: specialRequests || null,
          },
          include: { room: { select: { roomNumber: true, type: true } } },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    res.status(201).json({ status: 'success', message: 'Booking confirmed.', booking });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/bookings  (guest sees own bookings, staff see all)
const getBookings = async (req, res) => {
  try {
    if (req.user.role === 'HOUSEKEEPING') throw new HttpError(403, 'Access denied.');

    const where = req.user.role === 'GUEST' ? { guestId: req.user.id } : {};
    if (req.query.status) where.status = req.query.status;

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { roomNumber: true, type: true } },
        guest: { select: { name: true, email: true } },
      },
    });
    res.status(200).json({ status: 'success', count: bookings.length, bookings });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        room: { select: { roomNumber: true, type: true } },
        guest: { select: { name: true, email: true } },
      },
    });
    if (!booking) throw new HttpError(404, 'Booking not found.');
    if (req.user.role === 'GUEST' && booking.guestId !== req.user.id) {
      throw new HttpError(403, 'You can only view your own bookings.');
    }
    if (req.user.role === 'HOUSEKEEPING') throw new HttpError(403, 'Access denied.');

    res.status(200).json({ status: 'success', booking });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw new HttpError(404, 'Booking not found.');
    if (req.user.role === 'GUEST' && booking.guestId !== req.user.id) {
      throw new HttpError(403, 'You can only cancel your own bookings.');
    }
    if (req.user.role === 'HOUSEKEEPING') throw new HttpError(403, 'Access denied.');
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new HttpError(409, `A booking with status ${booking.status} cannot be cancelled.`);
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });
    res.status(200).json({ status: 'success', message: 'Booking cancelled.', booking: updated });
  } catch (error) {
    handleError(res, error);
  }
};
// Set ENFORCE_CHECKIN_DATE=false in .env to test with future-dated bookings
const ENFORCE_DATES = process.env.ENFORCE_CHECKIN_DATE !== 'false';

const bookingInclude = {
  room: { select: { roomNumber: true, type: true } },
  guest: { select: { name: true, email: true } },
};

// PATCH /api/bookings/:id/check-in  (ADMIN, MANAGER, RECEPTIONIST)
const checkInBooking = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      throw new HttpError(403, 'Only front-desk staff can check guests in.');
    }

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id: req.params.id } });
      if (!b) throw new HttpError(404, 'Booking not found.');
      if (b.status !== 'CONFIRMED') {
        throw new HttpError(409, `Only CONFIRMED bookings can be checked in (current status: ${b.status}).`);
      }

      if (ENFORCE_DATES) {
        const today = todayUTC();
        if (today < b.checkInDate) throw new HttpError(409, 'Too early: check-in date has not arrived yet.');
        if (today >= b.checkOutDate) throw new HttpError(409, 'This stay has already ended.');
      }

      const room = await tx.room.findUnique({ where: { id: b.roomId } });
      if (['OCCUPIED', 'CLEANING', 'MAINTENANCE'].includes(room.status)) {
        throw new HttpError(409, `Room ${room.roomNumber} is ${room.status} and cannot be checked into right now.`);
      }

      await tx.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });
      return tx.booking.update({ where: { id: b.id }, data: { status: 'CHECKED_IN' }, include: bookingInclude });
    });

    res.status(200).json({ status: 'success', message: 'Guest checked in.', booking });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/bookings/:id/check-out  (ADMIN, MANAGER, RECEPTIONIST)
const checkOutBooking = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      throw new HttpError(403, 'Only front-desk staff can check guests out.');
    }

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id: req.params.id } });
      if (!b) throw new HttpError(404, 'Booking not found.');
      if (b.status !== 'CHECKED_IN') {
        throw new HttpError(409, `Only CHECKED_IN bookings can be checked out (current status: ${b.status}).`);
      }

      await tx.room.update({ where: { id: b.roomId }, data: { status: 'CLEANING' } });
      await tx.housekeepingLog.create({
        data: { roomId: b.roomId, taskType: 'CLEANING', status: 'PENDING', notes: `Checkout of booking ${b.bookingNumber}` },
      });
      return tx.booking.update({ where: { id: b.id }, data: { status: 'CHECKED_OUT' }, include: bookingInclude });
    });

    res.status(200).json({ status: 'success', message: 'Guest checked out. Room sent for cleaning.', booking });
  } catch (error) {
    handleError(res, error);
  }
};
module.exports = { checkAvailability, createBooking, getBookings, getBookingById, cancelBooking, checkInBooking, checkOutBooking };