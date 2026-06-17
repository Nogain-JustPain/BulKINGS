import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Crown, Sun, Moon } from 'lucide-react';

export default function Auth({ theme, toggleTheme }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  };

  return (
    <div className="iron-log font-body" data-theme={theme}>
      <div className="auth-screen">
        <button className="theme-toggle auth-theme-toggle" onClick={toggleTheme} aria-label="Ganti tema" title="Ganti tema">
          {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
        </button>
        <div className="auth-card">
          <div className="auth-logo">
            <Crown size={30} strokeWidth={1.5} />
          </div>
          <h1 className="font-display auth-title">BUL-KINGS</h1>
          <p className="auth-subtitle">disiplin adalah mahkota</p>

          {status === 'sent' ? (
            <div className="auth-sent">
              <p>Link login udah dikirim ke <strong>{email}</strong>.</p>
              <p className="auth-sent-sub">Cek inbox (atau folder spam), lalu klik link-nya buat masuk. Bisa dibuka di HP atau laptop, sama aja.</p>
              <button className="btn-secondary btn-block" onClick={() => setStatus('idle')}>Kirim ulang / ganti email</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="kamu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              {status === 'error' && <p className="auth-error">{errorMsg}</p>}
              <button type="submit" className="btn-primary btn-block" disabled={status === 'sending'}>
                {status === 'sending' ? 'Mengirim...' : 'Kirim Link Login'}
              </button>
              <p className="auth-note">Gak perlu password. Pakai email yang sama di HP & laptop biar data nyambung.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
