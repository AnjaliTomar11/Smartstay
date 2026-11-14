import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Rooms from './pages/Rooms';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';

const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');

function Protected({ children, staffOnly = false }) {
  const token = localStorage.getItem('token');
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (staffOnly && user.role === 'GUEST') return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <>                                   {/* ADD */}
      <Routes>
        <Route path="/" element={<Protected><Rooms /></Protected>} />
        <Route path="/my-bookings" element={<Protected><MyBookings /></Protected>} />
        <Route path="/admin" element={<Protected staffOnly><Admin /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />                     
    </>                                  
  );
}