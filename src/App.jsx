import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './useTheme.js';
import Auth from './Auth.jsx';
import Onboarding from './Onboarding.jsx';
import WorkoutTracker from './WorkoutTracker.jsx';
import './styles.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setUsername(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setProfileLoading(true);
    supabase.from('profiles').select('username').eq('id', session.user.id).single()
      .then(({ data }) => {
        setUsername(data?.username || null);
        setProfileLoading(false);
      });
  }, [session]);

  if (loading || profileLoading) {
    return (
      <div className="iron-log" data-theme={theme}>
        <div className="loading-screen">Memuat...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth theme={theme} toggleTheme={toggleTheme} />;
  }

  if (!username) {
    return (
      <Onboarding
        session={session}
        theme={theme}
        toggleTheme={toggleTheme}
        onSave={setUsername}
      />
    );
  }

  return (
    <WorkoutTracker
      session={session}
      theme={theme}
      toggleTheme={toggleTheme}
      username={username}
      onUsernameChange={setUsername}
    />
  );
}
