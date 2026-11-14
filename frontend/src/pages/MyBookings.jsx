import { useEffect, useState } from 'react';
import api from '../api';

const money = (n) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/bookings');
      setBookings(res.data.bookings);
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    api.get('/bookings')
      .then((res) => {
        if (active) setBookings(res.data.bookings);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Cannot reach the server. Is the backend running?');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.bookingNumber}?`)) return;
    setError('');
    setSuccess('');
    setCancellingId(b.id);
    try {
      await api.patch(`/bookings/${b.id}/cancel`);
      setSuccess(`Booking ${b.bookingNumber} cancelled.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel the booking.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="page">
      <h2>My bookings</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading && <p className="empty" role="status">Loading your bookings...</p>}
      {!loading && bookings.length === 0 && <p className="empty">You have no bookings yet.</p>}

      <div className="booking-list">
        {bookings.map((b) => (
          <div className="booking-card" key={b.id}>
            <div className="booking-head">
              <strong>{b.bookingNumber}</strong>
              <span className={`status status-${b.status}`}>{b.status.replace('_', ' ')}</span>
            </div>
            <p>Room {b.room?.roomNumber} · {b.room?.type}</p>
            <p>{fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)} ({b.totalNights} night{b.totalNights > 1 ? 's' : ''})</p>
            <p className="booking-total">₹{money(b.totalAmount)} <small>incl. GST</small></p>
            {b.specialRequests && <p className="room-desc">Request: {b.specialRequests}</p>}
            {['PENDING', 'CONFIRMED'].includes(b.status) && (
              <button className="cancel-btn" onClick={() => cancel(b)} disabled={cancellingId !== null}>
                {cancellingId === b.id ? 'Cancelling...' : 'Cancel booking'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}