const express = require('express');
const prisma = require('../prisma'); // see "Check the import" below
const router = express.Router();

const money = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

function detectIntent(text) {
  if (/\b(hi|hello|hey|namaste)\b/.test(text)) return 'greeting';
  if (/(available|availability|vacant|free room|rooms left)/.test(text)) return 'availability';
  if (/(price|rate|cost|charge|how much)/.test(text)) return 'price';
  if (/(type|kind of room|single|double|suite|deluxe)/.test(text)) return 'types';
  if (/(check.?in|check.?out|timing|time)/.test(text)) return 'timing';
  if (/(book|reserve|reservation)/.test(text)) return 'booking';
  if (/(cancel|refund)/.test(text)) return 'cancel';
  if (/(wifi|breakfast|parking|amenit|facility|facilities)/.test(text)) return 'amenities';
  if (/(contact|phone|help|support)/.test(text)) return 'contact';
  return 'unknown';
}

router.post('/', async (req, res) => {
  try {
    const text = String(req.body.message || '').toLowerCase().trim();
    if (!text) return res.json({ reply: 'Please type a question.' });

    let reply;
    switch (detectIntent(text)) {
      case 'greeting':
        reply = 'Hello! Welcome to SmartStay. Ask me about room availability, prices, room types, check-in time or how to book.';
        break;

      case 'availability': {
        const rows = await prisma.room.groupBy({
          by: ['type'],
          where: { status: 'AVAILABLE' },
          _count: { _all: true },
        });
        if (rows.length === 0) {
          reply = 'Sorry, no rooms are available right now. Please check again later.';
        } else {
          const total = rows.reduce((sum, r) => sum + r._count._all, 0);
          const parts = rows.map((r) => `${r._count._all} ${r.type.toLowerCase()}`).join(', ');
          reply = `We currently have ${total} rooms available (${parts}). Choose your dates on the Rooms page to book.`;
        }
        break;
      }

      case 'price': {
        const rows = await prisma.room.groupBy({
          by: ['type'],
          _min: { pricePerNight: true },
        });
        reply = rows.length
          ? 'Starting prices per night: ' +
            rows.map((r) => `${r.type.toLowerCase()} from ${money(r._min.pricePerNight)}`).join(', ') + '.'
          : 'Room prices are not available right now.';
        break;
      }

      case 'types': {
        const rows = await prisma.room.groupBy({
          by: ['type'],
          _max: { capacity: true },
        });
        reply = rows.length
          ? 'We offer these room types: ' +
            rows.map((r) => `${r.type.toLowerCase()} (up to ${r._max.capacity} guests)`).join(', ') + '.'
          : 'Room types are not available right now.';
        break;
      }

      case 'amenities': {
        const rooms = await prisma.room.findMany({ select: { amenities: true } });
        const list = [...new Set(rooms.flatMap((r) => r.amenities))];
        reply = list.length
          ? `Our rooms offer: ${list.join(', ')}.`
          : 'Please ask the front desk about room facilities.';
        break;
      }

      case 'timing':
        // CHANGE: put your hotel's real timings
        reply = 'Check-in is from 12:00 PM and check-out is until 11:00 AM.';
        break;

      case 'booking':
        reply = 'To book: log in, open Rooms, choose your dates and a room, then click Book.';
        break;

      case 'cancel':
        reply = 'You can see your reservations under My Bookings. For cancellations, please contact the front desk.';
        break;

      case 'contact':
        reply = 'You can reach the front desk at the hotel, or ask me anything here.';
        break;

      default:
        reply = "Sorry, I didn't understand. Try asking about availability, prices, room types, check-in time or booking.";
    }
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;