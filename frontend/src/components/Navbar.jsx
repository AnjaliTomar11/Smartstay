import { NavLink, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isStaff = user && user.role !== 'GUEST';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <span className="brand">SmartStay</span>
      <div className="nav-links">
        {isStaff && <NavLink to="/admin">Dashboard</NavLink>}
        <NavLink to="/" end>Find rooms</NavLink>
        {!isStaff && <NavLink to="/my-bookings">My bookings</NavLink>}
      </div>
      <div className="nav-right">
        {user && <span className="nav-user">{user.name} · {user.role}</span>}
        <button className="nav-btn" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}