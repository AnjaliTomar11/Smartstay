import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import PasswordInput from '../components/PasswordInput';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login', { state: { registered: true } });
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
        <p className="au-sub">Create your guest account</p>

        {error && <div className="au-msg au-err">{error}</div>}

        <label htmlFor="name">Full name</label>
        <input id="name" value={form.name} onChange={set('name')} required />

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set('email')} required />

        <label htmlFor="phone">Phone (optional)</label>
        <input id="phone" value={form.phone} onChange={set('phone')} />

        <label htmlFor="password">Password</label>
        <PasswordInput id="password" value={form.password} onChange={set('password')} minLength={6} />

        <button className="au-btn" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
        <p className="au-foot">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}