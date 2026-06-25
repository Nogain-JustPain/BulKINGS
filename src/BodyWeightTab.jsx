import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Target, TrendingDown, TrendingUp, Minus, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from './supabaseClient';

function formatDateID(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const PlateDot = (props) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="var(--gold)" stroke="var(--bg)" strokeWidth={2} />
    </g>
  );
};

export default function BodyWeightTab({ userId }) {
  const [entries, setEntries] = useState([]);
  const [target, setTarget] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [inputDate, setInputDate] = useState(todayStr());
  const [inputWeight, setInputWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Target modal
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const loadData = async () => {
    const [{ data: bwData }, { data: profileData }] = await Promise.all([
      supabase.from('body_weight').select('id, date, weight').order('date', { ascending: false }),
      supabase.from('profiles').select('target_weight').eq('id', userId).single()
    ]);
    setEntries(bwData || []);
    setTarget(profileData?.target_weight || null);
    if (profileData?.target_weight) setTargetInput(String(profileData.target_weight));
    setLoaded(true);
  };

  useEffect(() => { loadData(); }, [userId]);

  const saveEntry = async () => {
    const w = parseFloat(inputWeight);
    if (!inputWeight || isNaN(w) || w <= 0) return;
    setSaving(true);
    // Upsert by date (one entry per day)
    const { error } = await supabase.from('body_weight').upsert(
      { user_id: userId, date: inputDate, weight: w },
      { onConflict: 'user_id,date' }
    );
    if (error) { showStatus('error', 'Gagal menyimpan: ' + error.message); }
    else { showStatus('success', 'Berat badan tersimpan!'); setInputWeight(''); await loadData(); }
    setSaving(false);
  };

  const saveTarget = async () => {
    const t = parseFloat(targetInput);
    if (!targetInput || isNaN(t) || t <= 0) return;
    setSavingTarget(true);
    const { error } = await supabase.from('profiles').update({ target_weight: t }).eq('id', userId);
    if (error) { showStatus('error', 'Gagal simpan target: ' + error.message); }
    else { setTarget(t); setShowTargetForm(false); showStatus('success', 'Target tersimpan!'); }
    setSavingTarget(false);
  };

  const deleteEntry = async (id) => {
    const { error } = await supabase.from('body_weight').delete().eq('id', id);
    if (error) { showStatus('error', 'Gagal menghapus.'); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    setConfirmDelete(null);
    showStatus('success', 'Data dihapus.');
  };

  const chartData = useMemo(() =>
    [...entries].sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({ date: e.date, label: formatDateShort(e.date), weight: Number(e.weight) })),
    [entries]
  );

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const weights = entries.map(e => Number(e.weight));
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const first = Number(sorted[0].weight);
    const last = Number(sorted[sorted.length - 1].weight);
    return {
      current: last,
      lowest: Math.min(...weights),
      highest: Math.max(...weights),
      change: last - first,
      toTarget: target ? last - target : null,
    };
  }, [entries, target]);

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const weights = chartData.map(d => d.weight);
    if (target) weights.push(target);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const pad = Math.max((max - min) * 0.15, 2);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData, target]);

  if (!loaded) {
    return <div className="tab-panel"><div className="empty-state"><p>Memuat...</p></div></div>;
  }

  return (
    <div className="tab-panel">
      {statusMsg && (
        <div className={`status-banner ${statusMsg.type === 'error' ? 'status-error' : 'status-success'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Input form */}
      <div className="card bw-input-card">
        <h3 className="font-display bw-card-title">Catat Berat Hari Ini</h3>
        <div className="bw-input-row">
          <input
            type="date" className="input" value={inputDate} max={todayStr()}
            onChange={e => setInputDate(e.target.value)}
          />
          <div className="bw-weight-input-wrap">
            <input
              type="number" className="input bw-weight-input"
              placeholder="kg" step="0.1" min="1" max="999"
              value={inputWeight} onChange={e => setInputWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveEntry()}
            />
            <span className="bw-unit">kg</span>
          </div>
          <button className="btn-primary bw-save-btn" disabled={!inputWeight || saving} onClick={saveEntry}>
            {saving ? '...' : <Plus size={18} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-row stats-row-5">
          <div className="stat-card">
            <span className="stat-label">Sekarang</span>
            <span className="font-display stat-value">{stats.current}<span className="stat-unit">kg</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Terendah</span>
            <span className="font-display stat-value">{stats.lowest}<span className="stat-unit">kg</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tertinggi</span>
            <span className="font-display stat-value">{stats.highest}<span className="stat-unit">kg</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Perubahan</span>
            <span className={`font-display stat-value ${stats.change < 0 ? 'stat-positive' : stats.change > 0 ? 'stat-negative' : ''}`}>
              {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)}<span className="stat-unit">kg</span>
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Ke Target</span>
            <span className={`font-display stat-value ${stats.toTarget === null ? '' : stats.toTarget <= 0 ? 'stat-positive' : ''}`}>
              {stats.toTarget === null ? '—' : stats.toTarget <= 0 ? '✓' : `${stats.toTarget.toFixed(1)}`}
              {stats.toTarget !== null && stats.toTarget > 0 && <span className="stat-unit">kg</span>}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card chart-card">
          <div className="chart-card-header">
            <h3 className="font-display chart-title">Tren Berat Badan</h3>
            <button className="btn-target" onClick={() => setShowTargetForm(true)}>
              <Target size={14} /> {target ? `Target: ${target} kg` : 'Set Target'}
            </button>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis domain={yDomain} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
                  formatter={(v) => [`${v} kg`, 'Berat']}
                />
                {target && (
                  <ReferenceLine
                    y={target} stroke="var(--gold)" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: `Target ${target}kg`, position: 'insideTopRight', fill: 'var(--gold)', fontSize: 11 }}
                  />
                )}
                <Line type="monotone" dataKey="weight" stroke="var(--accent-strong)" strokeWidth={2.5} dot={<PlateDot />} activeDot={{ r: 6, fill: 'var(--gold)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Target form (inline kalau belum ada chart, modal kalau sudah) */}
      {chartData.length === 0 && (
        <div className="card bw-target-card">
          <div className="bw-target-row">
            <Target size={16} className="bw-target-icon" />
            <span className="bw-target-label">Target Berat Badan</span>
          </div>
          <div className="bw-input-row">
            <input
              type="number" className="input" placeholder="Target (kg)"
              step="0.1" min="1" value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
            />
            <button className="btn-primary bw-save-btn" disabled={!targetInput || savingTarget} onClick={saveTarget}>
              {savingTarget ? '...' : <Plus size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* Target modal */}
      {showTargetForm && (
        <div className="modal-overlay" onClick={() => setShowTargetForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-display modal-title">Set Target BB</h2>
              <button className="icon-btn" onClick={() => setShowTargetForm(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <label className="field-label">Target Berat Badan (kg)</label>
              <input
                type="number" className="input" placeholder="misal: 70"
                step="0.1" min="1" value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                autoFocus
              />
              <button className="btn-primary btn-block" disabled={!targetInput || savingTarget} onClick={saveTarget}>
                {savingTarget ? 'Menyimpan...' : 'Simpan Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History list */}
      {entries.length > 0 && (
        <div className="card">
          <h3 className="font-display bw-card-title">Riwayat</h3>
          <div className="bw-history-list">
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div className="bw-history-row" key={entry.id}>
                <div className="bw-history-left">
                  <span className="bw-history-date">{formatDateID(entry.date)}</span>
                </div>
                <div className="bw-history-right">
                  <span className="font-mono bw-history-weight">{Number(entry.weight).toFixed(1)} kg</span>
                  {confirmDelete === entry.id ? (
                    <div className="confirm-inline">
                      <button className="btn-danger btn-sm" onClick={() => deleteEntry(entry.id)}>Hapus</button>
                      <button className="btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Batal</button>
                    </div>
                  ) : (
                    <button className="icon-btn-sm" onClick={() => setConfirmDelete(entry.id)}><X size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="empty-state">
          <TrendingDown size={32} className="empty-icon" />
          <p>Belum ada data berat badan.</p>
          <p className="empty-sub">Catat berat hari ini di atas buat mulai.</p>
        </div>
      )}
    </div>
  );
}
