import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth.jsx';
import WorkoutTracker from './WorkoutTracker.jsx';
import './styles.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="loading-screen">Memuat...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return <WorkoutTracker session={session} />;
}
