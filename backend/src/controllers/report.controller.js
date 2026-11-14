const prisma = require('../prisma');

const REPORT_ROLES = ['ADMIN', 'MANAGER'];
const REVENUE_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];
const ROOM_STATUSES = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];
const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE'];
const round2 = (n) => Math.round(n * 100) / 100;

// GET /api/reports/summary  (ADMIN, MANAGER)
const getSummary = async (req, res) => {
  try {
    if (!REPORT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Only admin or manager can view reports.' });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    const [totalRooms, roomGroups, bookingGroups, revenueBookings, arrivalsToday, departuresToday] =
      await Promise.all([
        prisma.room.count(),
        prisma.room.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.booking.findMany({
          where: { status: { in: REVENUE_STATUSES } },
          select: { totalAmount: true, status: true, room: { select: { type: true } } },
        }),
        prisma.booking.count({ where: { status: 'CONFIRMED', checkInDate: { gte: today, lt: tomorrow } } }),
        prisma.booking.count({ where: { status: 'CHECKED_IN', checkOutDate: { gte: today, lt: tomorrow } } }),
      ]);

    const roomsByStatus = Object.fromEntries(ROOM_STATUSES.map((s) => [s, 0]));
    roomGroups.forEach((g) => { roomsByStatus[g.status] = g._count._all; });

    const bookingsByStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
    bookingGroups.forEach((g) => { bookingsByStatus[g.status] = g._count._all; });

    const revenueByRoomType = Object.fromEntries(ROOM_TYPES.map((t) => [t, { bookings: 0, revenue: 0 }]));
    let totalRevenue = 0;
    let completedRevenue = 0;
    revenueBookings.forEach((b) => {
      const amount = Number(b.totalAmount);
      totalRevenue += amount;
      if (b.status === 'CHECKED_OUT') completedRevenue += amount;
      const t = revenueByRoomType[b.room.type];
      t.bookings += 1;
      t.revenue = round2(t.revenue + amount);
    });

    const occupancyRate = totalRooms ? round2((roomsByStatus.OCCUPIED / totalRooms) * 100) : 0;
    const todayStart = new Date(new Date().toISOString().slice(0, 10));
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    res.status(200).json({
      status: 'success',
      report: {
        generatedAt: new Date().toISOString(),
        rooms: { total: totalRooms, byStatus: roomsByStatus, occupancyRate },
        bookings: {
          total: Object.values(bookingsByStatus).reduce((a, b) => a + b, 0),
          byStatus: bookingsByStatus,
                  arrivalsToday: await prisma.booking.count({
          where: {
            checkInDate: { gte: todayStart, lt: todayEnd },
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          },
        }),
        departuresToday: await prisma.booking.count({
          where: {
            checkOutDate: { gte: todayStart, lt: todayEnd },
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
          },
        }),
        },
        revenue: { total: round2(totalRevenue), completed: round2(completedRevenue), byRoomType: revenueByRoomType },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getSummary };