import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './useTheme.js';
import Auth from './Auth.jsx';
import WorkoutTracker from './WorkoutTracker.jsx';
import './styles.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
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
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="iron-log" data-theme={theme}>
        <div className="loading-screen">Memuat...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth theme={theme} toggleTheme={toggleTheme} />;
  }

  return <WorkoutTracker session={session} theme={theme} toggleTheme={toggleTheme} />;
}
