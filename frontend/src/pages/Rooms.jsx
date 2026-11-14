import { useState } from 'react';
import api from '../api';

const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const gstRate = (price) => (price <= 7500 ? 0.05 : 0.18);
const money = (n) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export default function Rooms() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  const nights =
    checkIn && checkOut
      ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
      : 0;

  const search = async () => {
    setError('');
    if (!checkIn || !checkOut) return setError('Please choose both dates.');
    if (nights <= 0) return setError('Check-out must be after check-in.');
    setLoading(true);
    try {
      const params = { checkIn, checkOut };
      if (type) params.type = type;
      if (capacity) params.capacity = capacity;
      const res = await api.get('/bookings/availability', { params });
      setRooms(res.data.rooms);
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSuccess('');
    search();
  };

  const book = async (room) => {
    setError('');
    setSuccess('');
    setBookingId(room.id);
    try {
      const res = await api.post('/bookings', {
        roomId: room.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        specialRequests,
      });
      const b = res.data.booking;
      setSuccess(`Booking confirmed! Number: ${b.bookingNumber} · Total: ₹${money(b.totalAmount)}`);
      await search();
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
    } finally {
      setBookingId(null);
    }
  };

  return (
    <div className="page">
      <h2>Find your room</h2>

      <form className="search-bar" onSubmit={handleSearch}>
        <div className="field">
          <label>Check-in</label>
          <input type="date" min={todayLocal()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
        </div>
        <div className="field">
          <label>Check-out</label>
          <input type="date" min={checkIn || todayLocal()} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
        </div>
        <div className="field">
          <label>Room type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any</option>
            <option value="SINGLE">Single</option>
            <option value="DOUBLE">Double</option>
            <option value="DELUXE">Deluxe</option>
            <option value="SUITE">Suite</option>
          </select>
        </div>
        <div className="field">
          <label>Guests</label>
          <select value={capacity} onChange={(e) => setCapacity(e.target.value)}>
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
      </form>

      <div className="field wide">
        <label>Special requests (optional)</label>
        <input value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="e.g. late check-in, extra pillows" />
      </div>

      {loading && <p className="empty" role="status">Searching for available rooms...</p>}
      {bookingId && <p className="empty" role="status">Booking your selected room...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {success && <p className="success">{success}</p>}

      {rooms && rooms.length === 0 && (
        <p className="empty">No rooms are free for these dates. Try different dates or filters.</p>
      )}

      <div className="room-grid">
        {rooms && rooms.map((room) => {
          const price = Number(room.pricePerNight);
          const base = price * nights;
          const total = Math.round((base + base * gstRate(price)) * 100) / 100;
          return (
            <div className="room-card" key={room.id}>
              <div className="room-top">
                <span className="room-type">{room.type}</span>
                <span className="room-no">Room {room.roomNumber}</span>
              </div>
              <p className="room-meta">Floor {room.floor} · Up to {room.capacity} guests</p>
              {room.description && <p className="room-desc">{room.description}</p>}
              {room.amenities?.length > 0 && (
                <div className="amenities">
                  {room.amenities.map((a) => <span key={a}>{a}</span>)}
                </div>
              )}
              <div className="room-price">
                <strong>₹{price.toLocaleString('en-IN')}</strong> / night
              </div>
              <p className="room-total">
                {nights} night{nights > 1 ? 's' : ''}: about ₹{money(total)} incl. GST
              </p>
              <button onClick={() => book(room)} disabled={bookingId !== null}>
                {bookingId === room.id ? 'Booking...' : 'Book now'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}