import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'GUEST' ? '/' : '/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="au-page">
      <form className="au-card" onSubmit={submit}>
        <h1 className="au-brand">SmartStay</h1>
        <p className="au-sub">Sign in to book or manage your stay</p>

        {location.state?.registered && (
          <div className="au-msg au-ok">Registered successfully. Please log in.</div>
        )}
        {error && <div className="au-msg au-err" role="alert">{error}</div>}

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="password">Password</label>
        <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button className="au-btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        {loading && <p role="status">Signing in to your account...</p>}
        <p className="au-foot">New guest? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}