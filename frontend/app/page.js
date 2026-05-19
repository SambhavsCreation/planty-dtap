'use client';

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://dtap-demo1.onrender.com/api';
const LIVE_REFRESH_MS = 15000;

const CHART_W = 720;
const CHART_H = 260;
const CHART_PAD = 36;

const EMPTY_FORM = {
  soilLevel: '50',
  ambientLightLevel: '400',
  humidityLevels: '40',
  temperatureLevels: '22',
  deviceId: 'device-1',
};

function linePath(pts, w, h, val, max) {
  if (!pts.length || max <= 0) return '';
  const step = pts.length > 1 ? w / (pts.length - 1) : 0;
  return pts
    .map((p, i) => {
      const x = i * step;
      const y = h - (val(p) / max) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString();
}

const MODE_ICONS = { sfw: '\u{1F33F}', nsfw: '\u{1F525}' };

export default function HomePage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [readings, setReadings] = useState([]);
  const [latest, setLatest] = useState(null);
  const [plantStatus, setPlantStatus] = useState(null);
  const [appMode, setAppMode] = useState('sfw');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const chartPts = [...readings].reverse();
  const lightMax = Math.max(100, ...chartPts.map((r) => Math.ceil(r.ambientLightLevel / 100) * 100));
  const pw = CHART_W - CHART_PAD * 2;
  const ph = CHART_H - CHART_PAD * 2;
  const soilD = linePath(chartPts, pw, ph, (r) => r.soilLevel, 100);
  const lightD = linePath(chartPts, pw, ph, (r) => r.ambientLightLevel, lightMax);
  const humD = linePath(chartPts, pw, ph, (r) => r.humidityLevels, 100);

  async function loadReadings(showLoading = true, suppressErrors = false) {
    if (showLoading) {
      setLoading(true);
      setError('');
    }
    try {
      const r = await fetch(`${apiBaseUrl}/readings/`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed to load readings.');
      const d = await r.json();
      setReadings(d.items || []);
      setLatest(d.latest || null);
    } catch (e) {
      if (!suppressErrors) setError(e.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function loadStatus(suppressErrors = false) {
    try {
      const r = await fetch(`${apiBaseUrl}/plant/status/`, { cache: 'no-store' });
      if (r.status === 404) { setPlantStatus(null); return; }
      if (!r.ok) throw new Error('Failed to load status.');
      setPlantStatus(await r.json());
    } catch (e) {
      if (!suppressErrors) setError(e.message);
    }
  }

  async function loadMode() {
    try {
      const r = await fetch(`${apiBaseUrl}/mode/`, { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); setAppMode(d.mode); }
    } catch {}
  }

  useEffect(() => {
    loadReadings();
    loadStatus();
    loadMode();

    const intervalId = window.setInterval(() => {
      loadReadings(false, true);
      loadStatus(true);
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch(`${apiBaseUrl}/readings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soilLevel: Number(form.soilLevel),
          ambientLightLevel: Number(form.ambientLightLevel),
          humidityLevels: Number(form.humidityLevels),
          temperatureLevels: Number(form.temperatureLevels),
          deviceId: String(form.deviceId),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to save.');
      setForm(EMPTY_FORM);
      await Promise.all([loadReadings(), loadStatus()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleMode() {
    const next = appMode === 'sfw' ? 'nsfw' : 'sfw';
    try {
      const r = await fetch(`${apiBaseUrl}/mode/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next }),
      });
      if (r.ok) setAppMode(next);
    } catch {}
  }

  async function playVoice() {
    setSpeaking(true);
    setError('');
    try {
      const r = await fetch(`${apiBaseUrl}/plant/voice/`);
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Voice failed.'); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      const cond = r.headers.get('X-Plant-Condition');
      const msg = r.headers.get('X-Plant-Message');
      if (cond && msg) setPlantStatus((s) => ({ ...(s || {}), condition: cond, message: msg }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSpeaking(false);
    }
  }

  const cond = latest?.condition || plantStatus?.condition || 'unknown';

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="logo">🌱</span>
            <div>
              <h1 className="title">Planty Patootie</h1>
              <p className="subtitle">Smart plant health monitor</p>
            </div>
          </div>
          <button className={`mode-toggle ${appMode}`} onClick={toggleMode} title="Toggle SFW / NSFW">
            <span className="mode-icon">{MODE_ICONS[appMode]}</span>
            <span className="mode-label">{appMode.toUpperCase()}</span>
          </button>
        </div>
      </header>

      <main className="main">
        <div className="grid">
          <aside className="sidebar">
            <form className="card form-card" onSubmit={onSubmit}>
              <h2 className="card-title">
                <span className="card-icon">📝</span> New Reading
              </h2>
              <div className="field">
                <label htmlFor="soilLevel">Soil Moisture (%)</label>
                <input id="soilLevel" name="soilLevel" type="range" min="0" max="100" value={form.soilLevel} onChange={onChange} />
                <span className="field-value">{form.soilLevel}%</span>
              </div>
              <div className="field">
                <label htmlFor="ambientLightLevel">Ambient Light (lux)</label>
                <input id="ambientLightLevel" name="ambientLightLevel" type="number" min="0" value={form.ambientLightLevel} onChange={onChange} required />
              </div>
              <div className="field">
                <label htmlFor="humidityLevels">Humidity (%)</label>
                <input id="humidityLevels" name="humidityLevels" type="number" step="0.1" value={form.humidityLevels} onChange={onChange} required />
              </div>
              <div className="field">
                <label htmlFor="temperatureLevels">Temperature (°C)</label>
                <input id="temperatureLevels" name="temperatureLevels" type="number" step="0.1" value={form.temperatureLevels} onChange={onChange} required />
              </div>
              <div className="field">
                <label htmlFor="deviceId">Device ID</label>
                <input id="deviceId" name="deviceId" type="text" value={form.deviceId} onChange={onChange} required />
              </div>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Analyzing...' : 'Submit Reading'}
              </button>
            </form>

            {latest && (
              <div className="card metrics-card">
                <h2 className="card-title">
                  <span className="card-icon">📊</span> Latest Reading
                </h2>
                <div className="metrics-grid">
                  <div className="metric">
                    <span className="metric-label">Condition</span>
                    <span className={`metric-value cond-${cond}`}>{cond}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Soil</span>
                    <span className="metric-value">{latest.soilLevel}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Light</span>
                    <span className="metric-value">{latest.ambientLightLevel} lux</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Humidity</span>
                    <span className="metric-value">{latest.humidityLevels}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Temp</span>
                    <span className="metric-value">{latest.temperatureLevels}°C</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Device</span>
                    <span className="metric-value metric-sm">{latest.deviceId}</span>
                  </div>
                </div>
                <p className="timestamp">Captured {fmtDate(latest.recordedAt)}</p>
              </div>
            )}
          </aside>

          <div className="content">
            <section className="card voice-card">
              <h2 className="card-title">
                <span className="card-icon">🗣️</span> Plant Voice
              </h2>
              {plantStatus ? (
                <div className="voice-body">
                  <div className="voice-header">
                    <span className={`cond-badge cond-${cond}`}>{cond}</span>
                    <button className="btn-voice" onClick={playVoice} disabled={speaking}>
                      {speaking ? 'Generating...' : '🔊 Hear the Plant'}
                    </button>
                  </div>
                  <blockquote className="quote">&ldquo;{plantStatus.message}&rdquo;</blockquote>
                  {audioUrl && <audio controls autoPlay src={audioUrl} className="player" />}
                  <ul className="messages">
                    {(plantStatus.messages || []).map((m, i) => (
                      <li key={i} className="msg-item">{m}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="empty">Submit a reading to awaken the plant.</p>
              )}
            </section>

            <section className="card chart-card">
              <h2 className="card-title">
                <span className="card-icon">📈</span> Sensor Trends
              </h2>
              {chartPts.length ? (
                <>
                  <div className="chart-legend">
                    <span className="leg"><span className="swatch s-soil" /> Soil</span>
                    <span className="leg"><span className="swatch s-light" /> Light</span>
                    <span className="leg"><span className="swatch s-hum" /> Humidity</span>
                  </div>
                  <div className="chart-wrap">
                    <svg className="chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="Sensor trend chart">
                      <g transform={`translate(${CHART_PAD},${CHART_PAD})`}>
                        {[0, 0.25, 0.5, 0.75, 1].map((s) => {
                          const y = ph - ph * s;
                          return <line key={s} x1="0" y1={y} x2={pw} y2={y} className="grid-line" />;
                        })}
                        {soilD && <path d={soilD} className="line soil-l" />}
                        {lightD && <path d={lightD} className="line light-l" />}
                        {humD && <path d={humD} className="line hum-l" />}
                        {chartPts.map((r, i) => {
                          const x = chartPts.length > 1 ? (i * pw) / (chartPts.length - 1) : pw / 2;
                          return (
                            <g key={r.id}>
                              <circle cx={x} cy={ph - (r.soilLevel / 100) * ph} r="3.5" className="dot d-soil" />
                              <circle cx={x} cy={ph - (r.ambientLightLevel / lightMax) * ph} r="3.5" className="dot d-light" />
                              <circle cx={x} cy={ph - (r.humidityLevels / 100) * ph} r="3.5" className="dot d-hum" />
                              <text x={x} y={ph + 18} textAnchor="middle" className="axis-label">{fmtTime(r.recordedAt)}</text>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>
                </>
              ) : (
                <p className="empty">Add readings to see trends.</p>
              )}
            </section>

            <section className="card table-card">
              <h2 className="card-title">
                <span className="card-icon">📋</span> History
              </h2>
              {loading ? (
                <p className="empty">Loading...</p>
              ) : readings.length ? (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Device</th>
                        <th>Soil</th>
                        <th>Light</th>
                        <th>Humidity</th>
                        <th>Temp</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((r) => (
                        <tr key={r.id}>
                          <td className="mono">{r.deviceId}</td>
                          <td>{r.soilLevel}%</td>
                          <td>{r.ambientLightLevel} lux</td>
                          <td>{r.humidityLevels}%</td>
                          <td>{r.temperatureLevels}°C</td>
                          <td className="mono">{fmtTime(r.recordedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty">No history yet.</p>
              )}
            </section>
          </div>
        </div>
      </main>

      {error && <div className="toast" role="alert">{error}</div>}

      <footer className="footer">
        <p>Planty Patootie &middot; Aalto DTAP Demo &middot; Django + Next.js</p>
      </footer>
    </div>
  );
}
