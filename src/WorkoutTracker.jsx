import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Dumbbell, History as HistoryIcon, TrendingUp, X, Minus, LogOut, Crown, Sun, Moon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabaseClient';

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Pull Up', 'Lat Pulldown', 'Incline Bench Press', 'Dumbbell Shoulder Press',
  'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension',
  'Bicep Curl', 'Tricep Pushdown', 'Cable Row', 'Hip Thrust', 'Lunges'
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDateID(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function roundTo(val, step) {
  return Math.round(val / step) * step;
}

function Stepper({ value, onChange, step, min = 0 }) {
  return (
    <div className="stepper">
      <button type="button" className="stepper-btn" onClick={() => onChange(Math.max(min, roundTo(value - step, step)))}>
        <Minus size={14} />
      </button>
      <input
        type="number"
        className="stepper-input"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
      <button type="button" className="stepper-btn" onClick={() => onChange(roundTo(value + step, step))}>
        <Plus size={14} />
      </button>
    </div>
  );
}

const PlateDot = (props) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="var(--accent)" stroke="var(--bg)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={2} fill="var(--bg)" />
    </g>
  );
};

function LogTab({
  date, setDate, draftExercises,
  pickerOpen, setPickerOpen, pickerSearch, setPickerSearch, filteredPickerList,
  addExerciseToDraft, addCustomExercise, removeExerciseFromDraft,
  addSet, removeSet, updateSet, canSave, saveSession, saving
}) {
  return (
    <div className="tab-panel">
      <div className="date-row">
        <label className="field-label">Tanggal</label>
        <div className="date-input-row">
          <input type="date" className="input" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          {date !== todayStr() && (
            <button className="btn-secondary btn-sm" onClick={() => setDate(todayStr())}>Hari ini</button>
          )}
        </div>
      </div>

      {draftExercises.length === 0 && (
        <div className="empty-state">
          <Dumbbell size={32} className="empty-icon" />
          <p>Belum ada exercise di sesi ini.</p>
          <p className="empty-sub">Tambahkan exercise pertama buat mulai catat.</p>
        </div>
      )}

      {draftExercises.map((ex, exIdx) => (
        <div className="card exercise-card" key={ex.name}>
          <div className="exercise-card-header">
            <h3 className="font-display exercise-name">{ex.name}</h3>
            <button className="icon-btn" onClick={() => removeExerciseFromDraft(exIdx)} aria-label="Hapus exercise">
              <X size={18} />
            </button>
          </div>
          <div className="sets-header">
            <span>Set</span>
            <span>Reps</span>
            <span>Berat (kg)</span>
            <span></span>
          </div>
          {ex.sets.map((s, setIdx) => (
            <div className="set-row" key={setIdx}>
              <span className="font-mono set-num">{setIdx + 1}</span>
              <Stepper value={s.reps} step={1} min={0} onChange={(v) => updateSet(exIdx, setIdx, 'reps', v)} />
              <Stepper value={s.weight} step={2.5} min={0} onChange={(v) => updateSet(exIdx, setIdx, 'weight', v)} />
              <button className="icon-btn-sm" onClick={() => removeSet(exIdx, setIdx)} aria-label="Hapus set">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button className="btn-add-set" onClick={() => addSet(exIdx)}>
            <Plus size={14} /> Tambah Set
          </button>
        </div>
      ))}

      {!pickerOpen && (
        <button className="btn-secondary btn-block" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> Tambah Exercise
        </button>
      )}

      {pickerOpen && (
        <div className="card picker-card">
          <div className="picker-search-row">
            <input
              className="input"
              placeholder="Cari atau tulis exercise baru..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
            <button className="icon-btn" onClick={() => { setPickerOpen(false); setPickerSearch(''); }} aria-label="Tutup">
              <X size={18} />
            </button>
          </div>
          <div className="picker-chips">
            {filteredPickerList.map(name => {
              const added = draftExercises.some(e => e.name === name);
              return (
                <button
                  key={name}
                  className={`chip ${added ? 'chip-added' : ''}`}
                  disabled={added}
                  onClick={() => addExerciseToDraft(name)}
                >
                  {name}{added ? ' ✓' : ''}
                </button>
              );
            })}
            {pickerSearch.trim() && !filteredPickerList.some(n => n.toLowerCase() === pickerSearch.trim().toLowerCase()) && (
              <button className="chip chip-new" onClick={addCustomExercise}>
                + Tambah "{pickerSearch.trim()}"
              </button>
            )}
            {filteredPickerList.length === 0 && !pickerSearch.trim() && (
              <p className="empty-sub">Mulai ketik untuk cari exercise.</p>
            )}
          </div>
        </div>
      )}

      <button className="btn-primary btn-block btn-save" disabled={!canSave || saving} onClick={saveSession}>
        {saving ? 'Menyimpan...' : 'Simpan Sesi'}
      </button>
    </div>
  );
}

function HistoryTabView({ sortedSessions, expanded, toggleExpand, confirmDelete, setConfirmDelete, deleteSession }) {
  if (sortedSessions.length === 0) {
    return (
      <div className="tab-panel">
        <div className="empty-state">
          <HistoryIcon size={32} className="empty-icon" />
          <p>Belum ada riwayat latihan.</p>
          <p className="empty-sub">Catat sesi pertama di tab Log.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      {sortedSessions.map(session => {
        const totalVolume = session.exercises.reduce(
          (sum, e) => sum + e.sets.reduce((s2, st) => s2 + st.reps * st.weight, 0), 0
        );
        const isOpen = !!expanded[session.id];
        return (
          <div className="card session-card" key={session.id}>
            <button className="session-header" onClick={() => toggleExpand(session.id)}>
              <div className="session-header-left">
                <span className="font-display session-date">{formatDateID(session.date)}</span>
                <span className="session-meta">{session.exercises.length} exercise · {totalVolume.toLocaleString('id-ID')} kg volume</span>
              </div>
              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {isOpen && (
              <div className="session-body">
                {session.exercises.map((ex, i) => (
                  <div className="session-exercise" key={i}>
                    <h4 className="font-display session-exercise-name">{ex.name}</h4>
                    <div className="session-sets">
                      {ex.sets.map((s, si) => (
                        <span className="font-mono session-set" key={si}>{s.reps}×{s.weight}kg</span>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="session-actions">
                  {confirmDelete === session.id ? (
                    <div className="confirm-row">
                      <span>Hapus sesi ini?</span>
                      <button className="btn-danger btn-sm" onClick={() => deleteSession(session.id)}>Ya, hapus</button>
                      <button className="btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Batal</button>
                    </div>
                  ) : (
                    <button className="btn-text-danger" onClick={() => setConfirmDelete(session.id)}>
                      <Trash2 size={14} /> Hapus sesi
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressTabView({ exercisesWithData, selectedExercise, setSelectedExercise, metric, setMetric, progressData, stats }) {
  if (exercisesWithData.length === 0) {
    return (
      <div className="tab-panel">
        <div className="empty-state">
          <TrendingUp size={32} className="empty-icon" />
          <p>Belum ada data progress.</p>
          <p className="empty-sub">Catat minimal satu sesi dulu di tab Log.</p>
        </div>
      </div>
    );
  }

  const metricLabel = metric === 'weight' ? 'Berat Max' : 'Volume Total';

  return (
    <div className="tab-panel">
      <div className="progress-controls">
        <select className="input" value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}>
          {exercisesWithData.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <div className="metric-toggle">
          <button className={`metric-btn ${metric === 'weight' ? 'metric-active' : ''}`} onClick={() => setMetric('weight')}>Berat Max</button>
          <button className={`metric-btn ${metric === 'volume' ? 'metric-active' : ''}`} onClick={() => setMetric('volume')}>Volume</button>
        </div>
      </div>

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">PR</span>
            <span className="font-display stat-value">{stats.pr.toLocaleString('id-ID')}<span className="stat-unit">kg</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Terakhir</span>
            <span className="font-display stat-value">{stats.last.toLocaleString('id-ID')}<span className="stat-unit">kg</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Perubahan</span>
            <span className={`font-display stat-value ${stats.diff > 0 ? 'stat-positive' : stats.diff < 0 ? 'stat-negative' : ''}`}>
              {stats.diff > 0 ? '+' : ''}{stats.diff.toLocaleString('id-ID')}<span className="stat-unit">kg</span>
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Sesi</span>
            <span className="font-display stat-value">{stats.count}</span>
          </div>
        </div>
      )}

      <div className="card chart-card">
        <h3 className="font-display chart-title">{metricLabel} (kg)</h3>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={progressData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Line type="monotone" dataKey={metric} stroke="var(--accent)" strokeWidth={2.5} dot={<PlateDot />} activeDot={{ r: 7, fill: 'var(--accent-2)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutTracker({ session, theme, toggleTheme }) {
  const userId = session.user.id;
  const userEmail = session.user.email;

  const [tab, setTab] = useState('log');
  const [sessions, setSessions] = useState([]);
  const [customExercises, setCustomExercises] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [date, setDate] = useState(todayStr());
  const [draftExercises, setDraftExercises] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const [expanded, setExpanded] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [selectedExercise, setSelectedExercise] = useState('');
  const [metric, setMetric] = useState('weight');

  const showStatus = (type, text) => setStatusMsg({ type, text });

  useEffect(() => {
    if (statusMsg) {
      const t = setTimeout(() => setStatusMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMsg]);

  // Load all sessions (with nested exercises/sets) for this user from Supabase
  const loadData = useCallback(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, date, created_at, exercises(id, name, position, sets(id, reps, weight, position))')
      .order('date', { ascending: false });

    if (error) {
      showStatus('error', 'Gagal memuat data: ' + error.message);
      setLoaded(true);
      return;
    }

    const normalized = (data || []).map(s => ({
      id: s.id,
      date: s.date,
      exercises: (s.exercises || [])
        .sort((a, b) => a.position - b.position)
        .map(e => ({
          name: e.name,
          sets: (e.sets || [])
            .sort((a, b) => a.position - b.position)
            .map(st => ({ reps: st.reps, weight: Number(st.weight) }))
        }))
    }));
    setSessions(normalized);

    const customNames = new Set();
    normalized.forEach(s => s.exercises.forEach(e => {
      if (!COMMON_EXERCISES.includes(e.name)) customNames.add(e.name);
    }));
    setCustomExercises(Array.from(customNames));
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allExerciseNames = useMemo(() => {
    const fromSessions = new Set();
    sessions.forEach(s => s.exercises.forEach(e => fromSessions.add(e.name)));
    return Array.from(new Set([...COMMON_EXERCISES, ...customExercises, ...fromSessions]));
  }, [sessions, customExercises]);

  const filteredPickerList = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return allExerciseNames.filter(n => n.toLowerCase().includes(q));
  }, [allExerciseNames, pickerSearch]);

  const addExerciseToDraft = (name) => {
    if (draftExercises.some(e => e.name === name)) return;
    setDraftExercises(prev => [...prev, { name, sets: [{ reps: 10, weight: 20 }] }]);
    setPickerSearch('');
    setPickerOpen(false);
  };

  const addCustomExercise = () => {
    const name = pickerSearch.trim();
    if (!name) return;
    if (!allExerciseNames.includes(name)) {
      setCustomExercises(prev => [...prev, name]);
    }
    addExerciseToDraft(name);
  };

  const removeExerciseFromDraft = (idx) => {
    setDraftExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const addSet = (exIdx) => {
    setDraftExercises(prev => prev.map((e, i) => {
      if (i !== exIdx) return e;
      const last = e.sets[e.sets.length - 1] || { reps: 10, weight: 20 };
      return { ...e, sets: [...e.sets, { ...last }] };
    }));
  };

  const removeSet = (exIdx, setIdx) => {
    setDraftExercises(prev => prev.map((e, i) => {
      if (i !== exIdx) return e;
      return { ...e, sets: e.sets.filter((_, si) => si !== setIdx) };
    }));
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setDraftExercises(prev => prev.map((e, i) => {
      if (i !== exIdx) return e;
      return { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) };
    }));
  };

  const canSave = draftExercises.length > 0 && draftExercises.every(e => e.sets.length > 0);

  // Insert session, then its exercises, then all sets — in that dependency order
  const saveSession = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const { data: sessionRow, error: sessionErr } = await supabase
        .from('sessions')
        .insert({ user_id: userId, date })
        .select('id')
        .single();
      if (sessionErr) throw sessionErr;

      for (let i = 0; i < draftExercises.length; i++) {
        const ex = draftExercises[i];
        const { data: exRow, error: exErr } = await supabase
          .from('exercises')
          .insert({ session_id: sessionRow.id, name: ex.name, position: i })
          .select('id')
          .single();
        if (exErr) throw exErr;

        const setsPayload = ex.sets.map((s, si) => ({
          exercise_id: exRow.id,
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
          position: si
        }));
        const { error: setsErr } = await supabase.from('sets').insert(setsPayload);
        if (setsErr) throw setsErr;
      }

      await loadData();
      setDraftExercises([]);
      showStatus('success', 'Sesi tersimpan!');
    } catch (err) {
      showStatus('error', 'Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sortedSessions = useMemo(() =>
    [...sessions].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))),
    [sessions]
  );

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSession = async (id) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) {
      showStatus('error', 'Gagal menghapus: ' + error.message);
      return;
    }
    setSessions(prev => prev.filter(s => s.id !== id));
    setConfirmDelete(null);
    showStatus('success', 'Sesi dihapus.');
  };

  const exercisesWithData = useMemo(() => {
    const set = new Set();
    sessions.forEach(s => s.exercises.forEach(e => set.add(e.name)));
    return Array.from(set).sort();
  }, [sessions]);

  useEffect(() => {
    if (exercisesWithData.length > 0 && !exercisesWithData.includes(selectedExercise)) {
      setSelectedExercise(exercisesWithData[0]);
    }
    if (exercisesWithData.length === 0 && selectedExercise) setSelectedExercise('');
  }, [exercisesWithData, selectedExercise]);

  const progressData = useMemo(() => {
    if (!selectedExercise) return [];
    return sortedSessions
      .filter(s => s.exercises.some(e => e.name === selectedExercise))
      .map(s => {
        const ex = s.exercises.find(e => e.name === selectedExercise);
        const maxWeight = Math.max(...ex.sets.map(st => st.weight));
        const volume = ex.sets.reduce((sum, st) => sum + st.reps * st.weight, 0);
        return { date: s.date, label: formatDateShort(s.date), weight: maxWeight, volume };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sortedSessions, selectedExercise]);

  const stats = useMemo(() => {
    if (progressData.length === 0) return null;
    const values = progressData.map(d => d[metric]);
    const pr = Math.max(...values);
    const last = values[values.length - 1];
    const first = values[0];
    return { pr, last, diff: last - first, count: progressData.length };
  }, [progressData, metric]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!loaded) {
    return (
      <div className="iron-log font-body" data-theme={theme}>
        <div className="loading-screen">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="iron-log font-body" data-theme={theme}>
      <div className="container">
        <header className="header">
          <div className="header-brand">
            <Crown size={22} strokeWidth={1.5} className="crown-mark" />
            <div>
              <h1 className="font-display title">BUL-KINGS</h1>
              <p className="subtitle">{userEmail}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-stat">
              <span className="font-display header-stat-num">{sessions.length}</span>
              <span className="header-stat-label">sesi</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Ganti tema" title="Ganti tema">
              {theme === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
            </button>
            <button className="icon-btn" onClick={handleLogout} aria-label="Keluar" title="Keluar">
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          </div>
        </header>
        <div className="header-divider"></div>

        <nav className="tabs">
          <button className={`tab ${tab === 'log' ? 'tab-active' : ''}`} onClick={() => setTab('log')}>
            <Dumbbell size={16} /> Log
          </button>
          <button className={`tab ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>
            <HistoryIcon size={16} /> Riwayat
          </button>
          <button className={`tab ${tab === 'progress' ? 'tab-active' : ''}`} onClick={() => setTab('progress')}>
            <TrendingUp size={16} /> Progress
          </button>
        </nav>

        {statusMsg && (
          <div className={`status-banner ${statusMsg.type === 'error' ? 'status-error' : 'status-success'}`}>
            {statusMsg.text}
          </div>
        )}

        <main>
          {tab === 'log' && (
            <LogTab
              date={date} setDate={setDate}
              draftExercises={draftExercises}
              pickerOpen={pickerOpen} setPickerOpen={setPickerOpen}
              pickerSearch={pickerSearch} setPickerSearch={setPickerSearch}
              filteredPickerList={filteredPickerList}
              addExerciseToDraft={addExerciseToDraft}
              addCustomExercise={addCustomExercise}
              removeExerciseFromDraft={removeExerciseFromDraft}
              addSet={addSet} removeSet={removeSet} updateSet={updateSet}
              canSave={canSave} saveSession={saveSession} saving={saving}
            />
          )}
          {tab === 'history' && (
            <HistoryTabView
              sortedSessions={sortedSessions}
              expanded={expanded} toggleExpand={toggleExpand}
              confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
              deleteSession={deleteSession}
            />
          )}
          {tab === 'progress' && (
            <ProgressTabView
              exercisesWithData={exercisesWithData}
              selectedExercise={selectedExercise} setSelectedExercise={setSelectedExercise}
              metric={metric} setMetric={setMetric}
              progressData={progressData} stats={stats}
            />
          )}
        </main>
      </div>
    </div>
  );
}
