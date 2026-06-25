import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { ChevronDown, ChevronUp, Edit2, X, Check } from 'lucide-react';

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs'];

export const DEFAULT_CATEGORIES = {
  'Bench Press': 'Chest',
  'Incline Bench Press': 'Chest',
  'Dumbbell Shoulder Press': 'Shoulders',
  'Overhead Press': 'Shoulders',
  'Barbell Row': 'Back',
  'Cable Row': 'Back',
  'Lat Pulldown': 'Back',
  'Pull Up': 'Back',
  'Deadlift': 'Back',
  'Romanian Deadlift': 'Legs',
  'Squat': 'Legs',
  'Leg Press': 'Legs',
  'Leg Curl': 'Legs',
  'Leg Extension': 'Legs',
  'Hip Thrust': 'Legs',
  'Lunges': 'Legs',
  'Bicep Curl': 'Biceps',
  'Tricep Pushdown': 'Triceps',
};

const MUSCLE_COLORS = {
  'Chest': { bar: '#C9A876', soft: 'rgba(201,168,118,0.12)' },
  'Back': { bar: '#7B9E8A', soft: 'rgba(123,158,138,0.12)' },
  'Shoulders': { bar: '#8A8EC9', soft: 'rgba(138,142,201,0.12)' },
  'Biceps': { bar: '#C97B7B', soft: 'rgba(201,123,123,0.12)' },
  'Triceps': { bar: '#C9B67B', soft: 'rgba(201,182,123,0.12)' },
  'Legs': { bar: '#7BB8C9', soft: 'rgba(123,184,201,0.12)' },
};

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts = { day: 'numeric', month: 'short' };
  return `${monday.toLocaleDateString('id-ID', opts)} – ${sunday.toLocaleDateString('id-ID', opts)}`;
}

function dateToStr(d) {
  return d.toISOString().split('T')[0];
}

export default function WeeklyTab({ userId }) {
  const [sessions, setSessions] = useState([]);
  const [categories, setCategories] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, etc.
  const [editingExercise, setEditingExercise] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [showUncategorized, setShowUncategorized] = useState(false);

  const weekMonday = useMemo(() => {
    const m = getMondayOfWeek();
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const weekSunday = useMemo(() => {
    const s = new Date(weekMonday);
    s.setDate(s.getDate() + 6);
    return s;
  }, [weekMonday]);

  const loadData = async () => {
    const { data: sessData } = await supabase
      .from('sessions')
      .select('id, date, exercises(id, name, sets(id))')
      .order('date', { ascending: false });

    const { data: catData } = await supabase
      .from('exercise_categories')
      .select('exercise_name, muscle_group');

    setSessions(sessData || []);

    // Merge: DB categories override defaults
    const merged = { ...DEFAULT_CATEGORIES };
    (catData || []).forEach(c => { merged[c.exercise_name] = c.muscle_group; });
    setCategories(merged);
    setLoaded(true);
  };

  useEffect(() => { loadData(); }, [userId]);

  // Sessions in the selected week
  const weekSessions = useMemo(() => {
    const from = dateToStr(weekMonday);
    const to = dateToStr(weekSunday);
    return sessions.filter(s => s.date >= from && s.date <= to);
  }, [sessions, weekMonday, weekSunday]);

  // Sets per muscle group for the week
  const setsByMuscle = useMemo(() => {
    const counts = {};
    MUSCLE_GROUPS.forEach(g => { counts[g] = 0; });

    weekSessions.forEach(s => {
      (s.exercises || []).forEach(ex => {
        const muscle = categories[ex.name];
        if (muscle && counts[muscle] !== undefined) {
          counts[muscle] += (ex.sets || []).length;
        }
      });
    });
    return counts;
  }, [weekSessions, categories]);

  // All unique exercise names in the week (for category assignment)
  const weekExercises = useMemo(() => {
    const names = new Set();
    weekSessions.forEach(s => (s.exercises || []).forEach(ex => names.add(ex.name)));
    return Array.from(names).sort();
  }, [weekSessions]);

  const uncategorized = useMemo(() =>
    weekExercises.filter(n => !categories[n] || !MUSCLE_GROUPS.includes(categories[n])),
    [weekExercises, categories]
  );

  const maxSets = useMemo(() => Math.max(...Object.values(setsByMuscle), 1), [setsByMuscle]);

  const totalSets = useMemo(() => Object.values(setsByMuscle).reduce((a, b) => a + b, 0), [setsByMuscle]);

  const saveCategoryEdit = async () => {
    if (!editingExercise || !editCategory) return;
    setSavingCat(true);
    await supabase.from('exercise_categories').upsert(
      { user_id: userId, exercise_name: editingExercise, muscle_group: editCategory },
      { onConflict: 'user_id,exercise_name' }
    );
    setCategories(prev => ({ ...prev, [editingExercise]: editCategory }));
    setEditingExercise(null);
    setEditCategory('');
    setSavingCat(false);
  };

  // Also allow editing all-time exercise categories (not just this week)
  const allExerciseNames = useMemo(() => {
    const names = new Set();
    sessions.forEach(s => (s.exercises || []).forEach(ex => names.add(ex.name)));
    return Array.from(names).sort();
  }, [sessions]);

  if (!loaded) {
    return <div className="tab-panel"><div className="empty-state"><p>Memuat...</p></div></div>;
  }

  const isThisWeek = weekOffset === 0;

  return (
    <div className="tab-panel">
      {/* Week navigation */}
      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
        <div className="week-nav-center">
          <span className="week-nav-label">{isThisWeek ? 'Minggu Ini' : weekOffset === -1 ? 'Minggu Lalu' : `${Math.abs(weekOffset)} minggu lalu`}</span>
          <span className="week-nav-range">{formatWeekRange(weekMonday)}</span>
        </div>
        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}>›</button>
      </div>

      {/* Summary stat */}
      <div className="week-summary-row">
        <div className="week-summary-stat">
          <span className="stat-label">Total Sesi</span>
          <span className="font-display stat-value">{weekSessions.length}</span>
        </div>
        <div className="week-summary-stat">
          <span className="stat-label">Total Set</span>
          <span className="font-display stat-value">{totalSets}</span>
        </div>
        <div className="week-summary-stat">
          <span className="stat-label">Otot Dilatih</span>
          <span className="font-display stat-value">{Object.values(setsByMuscle).filter(v => v > 0).length}</span>
        </div>
      </div>

      {/* Muscle group bars */}
      <div className="card">
        <h3 className="font-display bw-card-title">Set per Muscle Group</h3>
        <div className="muscle-bars">
          {MUSCLE_GROUPS.map(muscle => {
            const count = setsByMuscle[muscle] || 0;
            const pct = maxSets > 0 ? (count / maxSets) * 100 : 0;
            const color = MUSCLE_COLORS[muscle];
            return (
              <div className="muscle-bar-row" key={muscle}>
                <span className="muscle-bar-label">{muscle}</span>
                <div className="muscle-bar-track">
                  <div
                    className="muscle-bar-fill"
                    style={{ width: `${pct}%`, background: color.bar }}
                  />
                </div>
                <span className="muscle-bar-count" style={{ color: count > 0 ? color.bar : 'var(--text-muted)' }}>
                  {count} set
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Uncategorized warning */}
      {uncategorized.length > 0 && (
        <div className="card uncategorized-card">
          <button className="uncategorized-toggle" onClick={() => setShowUncategorized(v => !v)}>
            <span className="uncategorized-title">⚠ {uncategorized.length} exercise belum dikategorikan</span>
            {showUncategorized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showUncategorized && (
            <div className="uncategorized-list">
              {uncategorized.map(name => (
                <div className="cat-edit-row" key={name}>
                  <span className="cat-edit-name">{name}</span>
                  {editingExercise === name ? (
                    <div className="cat-edit-controls">
                      <select className="input cat-select" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                        <option value="">Pilih...</option>
                        {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <button className="icon-btn" onClick={saveCategoryEdit} disabled={savingCat || !editCategory}>
                        <Check size={16} />
                      </button>
                      <button className="icon-btn" onClick={() => setEditingExercise(null)}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button className="btn-cat-assign" onClick={() => { setEditingExercise(name); setEditCategory(categories[name] || ''); }}>
                      Assign kategori
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All exercise categories editor */}
      <div className="card">
        <h3 className="font-display bw-card-title">Kategori Exercise</h3>
        <p className="cat-hint">Tap ikon edit untuk ubah kategori otot per exercise.</p>
        <div className="cat-list">
          {allExerciseNames.length === 0 && (
            <p className="empty-sub" style={{ padding: '12px 0' }}>Belum ada exercise tercatat.</p>
          )}
          {allExerciseNames.map(name => {
            const cat = categories[name];
            const color = cat ? MUSCLE_COLORS[cat] : null;
            const isEditing = editingExercise === name;
            return (
              <div className="cat-edit-row" key={name}>
                <div className="cat-edit-left">
                  <span className="cat-edit-name">{name}</span>
                  {cat && !isEditing && (
                    <span className="cat-badge" style={{ background: color?.soft, color: color?.bar }}>
                      {cat}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <div className="cat-edit-controls">
                    <select className="input cat-select" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                      <option value="">Pilih...</option>
                      {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <button className="icon-btn" onClick={saveCategoryEdit} disabled={savingCat || !editCategory}>
                      <Check size={16} />
                    </button>
                    <button className="icon-btn" onClick={() => setEditingExercise(null)}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button className="icon-btn" onClick={() => { setEditingExercise(name); setEditCategory(cat || ''); }}>
                    <Edit2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {weekSessions.length === 0 && (
        <div className="empty-state">
          <p>Tidak ada sesi latihan minggu ini.</p>
          <p className="empty-sub">Catat latihan di tab Log buat mulai tracking.</p>
        </div>
      )}
    </div>
  );
}
