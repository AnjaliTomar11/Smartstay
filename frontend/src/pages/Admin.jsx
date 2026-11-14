import { useEffect, useState } from 'react';
import api from '../api';
import ReportsPanel from '../components/ReportsPanel';

const STATUSES = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];
const money = (n) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

const emptyForm = { roomNumber: '', floor: '', type: 'SINGLE', pricePerNight: '', capacity: '', amenities: '', description: '' };

export default function Admin() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.role;
  const canManageRooms = ['ADMIN', 'MANAGER'].includes(role);
  const canSeeBookings = role !== 'HOUSEKEEPING';

  const [tab, setTab] = useState('rooms');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(canSeeBookings);
  const [submitting, setSubmitting] = useState(false);

  const loadRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.rooms);
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server.');
    } finally {
      setRoomsLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await api.get('/bookings');
      setBookings(res.data.bookings);
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server.');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    api.get('/rooms')
      .then((res) => {
        if (active) setRooms(res.data.rooms);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Cannot reach the server.');
      })
      .finally(() => {
        if (active) setRoomsLoading(false);
      });

    if (canSeeBookings) {
      api.get('/bookings')
        .then((res) => {
          if (active) setBookings(res.data.bookings);
        })
        .catch((err) => {
          if (active) setError(err.response?.data?.message || 'Cannot reach the server.');
        })
        .finally(() => {
          if (active) setBookingsLoading(false);
        });
    }

    return () => { active = false; };
  }, [canSeeBookings]);

  const notify = (ok, msg) => {
    setError(ok ? '' : msg);
    setSuccess(ok ? msg : '');
  };

  const changeStatus = async (room, status) => {
    try {
      await api.patch(`/rooms/${room.id}/status`, { status });
      notify(true, `Room ${room.roomNumber} is now ${status}.`);
      loadRooms();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Could not change status.');
    }
  };

  const deleteRoom = async (room) => {
    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      notify(true, `Room ${room.roomNumber} deleted.`);
      loadRooms();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Could not delete room.');
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addRoom = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/rooms', {
        roomNumber: form.roomNumber,
        floor: form.floor,
        type: form.type,
        pricePerNight: form.pricePerNight,
        capacity: form.capacity,
        amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
        description: form.description,
      });
      notify(true, `Room ${form.roomNumber} added.`);
      setForm(emptyForm);
      loadRooms();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Could not add room.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBooking = async (b) => {
    if (!window.confirm(`Cancel booking ${b.bookingNumber}?`)) return;
    try {
      await api.patch(`/bookings/${b.id}/cancel`);
      notify(true, `Booking ${b.bookingNumber} cancelled.`);
      loadBookings();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Could not cancel booking.');
    }
  };

  const checkIn = async (b) => {
    if (!window.confirm(`Check in ${b.guest?.name} to room ${b.room?.roomNumber}?`)) return;
    try {
      await api.patch(`/bookings/${b.id}/check-in`);
      notify(true, `Booking ${b.bookingNumber}: guest checked in.`);
      loadBookings();
      loadRooms();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Could not check in.');
    }
  };

  const checkOut = async (b) => {
    if (!window.confirm(`Check out ${b.guest?.name} from room ${b.room?.roomNumber}?`)) return;
    try {
      await api.patch(`/bookings/${b.id}/check-out`);
      notify(true, `Booking ${b.bookingNumber}: guest checked out. Room sent for cleaning.`);
      loadBookings();
      loadRooms();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Could not check out.');
    }
  };

  return (
    <div className="page">
      <h2>{role === 'ADMIN' ? 'Admin dashboard' : 'Staff dashboard'}</h2>

      <div className="tabs">
        <button className={tab === 'rooms' ? 'tab active' : 'tab'} onClick={() => setTab('rooms')}>Rooms ({rooms.length})</button>
        {canSeeBookings && (
          <button className={tab === 'bookings' ? 'tab active' : 'tab'} onClick={() => setTab('bookings')}>All bookings ({bookings.length})</button>
        )}
        {canManageRooms && (
          <button className={tab === 'reports' ? 'tab active' : 'tab'} onClick={() => setTab('reports')}>Reports</button>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {success && <p className="success">{success}</p>}

      {tab === 'rooms' && (
        <>
          {canManageRooms && (
            <form className="add-room" onSubmit={addRoom}>
              <h3>Add a room</h3>
              <div className="form-row">
                <div className="field"><label>Room no.</label><input name="roomNumber" value={form.roomNumber} onChange={handleChange} required /></div>
                <div className="field"><label>Floor</label><input name="floor" type="number" value={form.floor} onChange={handleChange} required /></div>
                <div className="field"><label>Type</label>
                  <select name="type" value={form.type} onChange={handleChange}>
                    <option>SINGLE</option><option>DOUBLE</option><option>DELUXE</option><option>SUITE</option>
                  </select>
                </div>
                <div className="field"><label>Price / night (₹)</label><input name="pricePerNight" type="number" value={form.pricePerNight} onChange={handleChange} required /></div>
                <div className="field"><label>Capacity</label><input name="capacity" type="number" value={form.capacity} onChange={handleChange} required /></div>
              </div>
              <div className="form-row">
                <div className="field grow"><label>Amenities (comma separated)</label><input name="amenities" value={form.amenities} onChange={handleChange} placeholder="Wi-Fi, Split AC, Work Desk" /></div>
                <div className="field grow"><label>Description</label><input name="description" value={form.description} onChange={handleChange} /></div>
                <button type="submit" disabled={submitting}>{submitting ? 'Adding room...' : 'Add room'}</button>
              </div>
            </form>
          )}

          {roomsLoading && <p className="empty" role="status">Loading rooms...</p>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Room</th><th>Floor</th><th>Type</th><th>Price</th><th>Capacity</th><th>Status</th>{role === 'ADMIN' && <th></th>}</tr>
              </thead>
              <tbody>
                {!roomsLoading && rooms.length === 0 && <tr><td colSpan={role === 'ADMIN' ? 7 : 6}>No rooms found.</td></tr>}
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.roomNumber}</strong></td>
                    <td>{r.floor}</td>
                    <td>{r.type}</td>
                    <td>₹{Number(r.pricePerNight).toLocaleString('en-IN')}</td>
                    <td>{r.capacity}</td>
                    <td>
                      <select className={`room-status st-${r.status}`} value={r.status} onChange={(e) => changeStatus(r, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    {role === 'ADMIN' && (
                      <td><button className="small-btn danger" onClick={() => deleteRoom(r)}>Delete</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'bookings' && canSeeBookings && (
        <>
        {bookingsLoading && <p className="empty" role="status">Loading bookings...</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Booking</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!bookingsLoading && bookings.length === 0 && <tr><td colSpan="7">No bookings yet.</td></tr>}
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.bookingNumber}</strong></td>
                  <td>{b.guest?.name}<br /><small>{b.guest?.email}</small></td>
                  <td>{b.room?.roomNumber} · {b.room?.type}</td>
                  <td>{fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}</td>
                  <td>₹{money(b.totalAmount)}</td>
                  <td><span className={`status status-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                  <td>
                    <div className="row-actions">
                      {b.status === 'CONFIRMED' && (
                        <button className="small-btn ok" onClick={() => checkIn(b)}>Check in</button>
                      )}
                      {b.status === 'CHECKED_IN' && (
                        <button className="small-btn ok" onClick={() => checkOut(b)}>Check out</button>
                      )}
                      {['PENDING', 'CONFIRMED'].includes(b.status) && (
                        <button className="small-btn danger" onClick={() => cancelBooking(b)}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {tab === 'reports' && canManageRooms && <ReportsPanel />}
    </div>
  );
}