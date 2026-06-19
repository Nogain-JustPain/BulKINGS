import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Crown, Sun, Moon } from 'lucide-react';

export default function Onboarding({ session, theme, toggleTheme, onSave }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, username: trimmed });
    if (error) { setErr('Gagal menyimpan: ' + error.message); setSaving(false); return; }
    onSave(trimmed);
  };

  return (
    <div className="iron-log font-body" data-theme={theme}>
      <div className="auth-screen">
        <button className="theme-toggle auth-theme-toggle" onClick={toggleTheme} aria-label="Ganti tema">
          {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
        </button>
        <div className="auth-card">
          <div className="auth-logo"><Crown size={30} strokeWidth={1.5} /></div>
          <h1 className="font-display auth-title">BAL-KINGS</h1>
          <p className="auth-subtitle">Siapa namamu?</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field-label" htmlFor="username">Nama / Panggilan</label>
            <input
              id="username" type="text" className="input"
              placeholder="misal: Jiwoo"
              value={name} onChange={e => setName(e.target.value)}
              autoFocus maxLength={30} required
            />
            {err && <p className="auth-error">{err}</p>}
            <button type="submit" className="btn-primary btn-block" disabled={saving || !name.trim()}>
              {saving ? 'Menyimpan...' : 'Mulai'}
            </button>
            <p className="auth-note">Nama ini bisa diganti kapan saja di Settings.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
