import { useState } from 'react';

export default function PasswordInput({ id, value, onChange, placeholder, minLength }) {
  const [show, setShow] = useState(false);

  return (
    <div className="au-pass">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minLength={minLength}
        required
      />
      <button
        type="button"
        className="au-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </button>
    </div>
  );
}