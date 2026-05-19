'use client';

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
const chartWidth = 720;
const chartHeight = 280;
const chartPadding = 32;

const emptyForm = {
  soilLevel: '50',
  ambientLightLevel: '400',
  humidityLevels: '40',
  temperatureLevels: '22',
  deviceId: 'device-1',
};

function buildLinePath(readings, width, height, getValue, maxValue) {
  if (!readings.length || maxValue <= 0) {
    return '';
  }

  const xStep = readings.length > 1 ? width / (readings.length - 1) : 0;

  return readings
    .map((reading, index) => {
      const x = index * xStep;
      const y = height - (getValue(reading) / maxValue) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function formatGraphTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomePage() {
  const [formValues, setFormValues] = useState(emptyForm);
  const [readings, setReadings] = useState([]);
  const [latest, setLatest] = useState(null);
  const [plantStatus, setPlantStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const chartReadings = [...readings].reverse();
  const lightMax = Math.max(
    100,
    ...chartReadings.map((reading) => Math.ceil(reading.ambientLightLevel / 100) * 100),
  );
  const plotWidth = chartWidth - chartPadding * 2;
  const plotHeight = chartHeight - chartPadding * 2;
  const soilPath = buildLinePath(chartReadings, plotWidth, plotHeight, (reading) => reading.soilLevel, 100);
  const lightPath = buildLinePath(
    chartReadings,
    plotWidth,
    plotHeight,
    (reading) => reading.ambientLightLevel,
    lightMax,
  );

  async function loadReadings() {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/readings/`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load readings.');
      }

      const payload = await response.json();
      setReadings(payload.items || []);
      setLatest(payload.latest || null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPlantStatus() {
    try {
      const response = await fetch(`${apiBaseUrl}/plant/status/`, { cache: 'no-store' });
      if (response.status === 404) {
        setPlantStatus(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load plant status.');
      }

      const payload = await response.json();
      setPlantStatus(payload);
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  useEffect(() => {
    loadReadings();
    loadPlantStatus();
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/readings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          soilLevel: Number(formValues.soilLevel),
          ambientLightLevel: Number(formValues.ambientLightLevel),
          humidityLevels: Number(formValues.humidityLevels),
          temperatureLevels: Number(formValues.temperatureLevels),
          deviceId: String(formValues.deviceId),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save reading.');
      }

      setFormValues(emptyForm);
      await loadReadings();
      await loadPlantStatus();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePlayVoice() {
    setIsSpeaking(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/plant/voice/`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to generate plant voice.');
      }

      const blob = await response.blob();
      const nextAudioUrl = URL.createObjectURL(blob);
      const condition = response.headers.get('X-Plant-Condition');
      const message = response.headers.get('X-Plant-Message');

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(nextAudioUrl);
      if (condition && message) {
        setPlantStatus((currentStatus) => ({
          ...(currentStatus || {}),
          condition,
          message,
          messages: currentStatus?.messages || [],
          reading: currentStatus?.reading || latest,
        }));
      }
    } catch (voiceError) {
      setError(voiceError.message);
    } finally {
      setIsSpeaking(false);
    }
  }

  const latestCondition = latest?.condition || plantStatus?.condition || 'unknown';

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Plant Monitor</p>
          <h1>Track soil moisture and ambient light for your plant from one local dashboard.</h1>
          <p className="lede">
            Save readings to a Django + SQLite backend and review the most recent conditions in your
            Next.js frontend.
          </p>
        </div>
      </section>

      <section className="content-grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <h2>Add a reading</h2>
            <p>Record the current soil and ambient light levels.</p>
          </div>

          <label>
            Soil level (%)
            <input
              name="soilLevel"
              type="number"
              min="0"
              max="100"
              value={formValues.soilLevel}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Ambient light (lux)
            <input
              name="ambientLightLevel"
              type="number"
              min="0"
              value={formValues.ambientLightLevel}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Humidity (%)
            <input
              name="humidityLevels"
              type="number"
              step="0.1"
              value={formValues.humidityLevels}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Temperature (°C)
            <input
              name="temperatureLevels"
              type="number"
              step="0.1"
              value={formValues.temperatureLevels}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Device ID
            <input
              name="deviceId"
              type="text"
              value={formValues.deviceId}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save reading'}
          </button>
        </form>

        <div className="stack">
          <section className="panel">
            <div className="panel-heading">
              <h2>Sensor trend</h2>
              <p>Recent soil moisture and ambient light readings over time.</p>
            </div>

            {readings.length ? (
              <>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-swatch soil-line" />
                    Soil (% of 100)
                  </span>
                  <span className="legend-item">
                    <span className="legend-swatch light-line" />
                    Ambient light (scaled to {lightMax} lux)
                  </span>
                </div>

                <div className="chart-shell">
                  <svg
                    className="trend-chart"
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    role="img"
                    aria-label="Line chart of soil moisture and ambient light readings"
                  >
                    <g transform={`translate(${chartPadding} ${chartPadding})`}>
                      {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                        const y = plotHeight - plotHeight * step;
                        return (
                          <line
                            key={step}
                            x1="0"
                            y1={y}
                            x2={plotWidth}
                            y2={y}
                            className="chart-grid-line"
                          />
                        );
                      })}

                      {soilPath ? <path d={soilPath} className="chart-line soil-line" /> : null}
                      {lightPath ? <path d={lightPath} className="chart-line light-line" /> : null}

                      {chartReadings.map((reading, index) => {
                        const x =
                          chartReadings.length > 1
                            ? (index * plotWidth) / (chartReadings.length - 1)
                            : plotWidth / 2;
                        const soilY = plotHeight - (reading.soilLevel / 100) * plotHeight;
                        const lightY =
                          plotHeight - (reading.ambientLightLevel / lightMax) * plotHeight;

                        return (
                          <g key={reading.id}>
                            <circle cx={x} cy={soilY} r="4" className="chart-dot soil-fill" />
                            <circle cx={x} cy={lightY} r="4" className="chart-dot light-fill" />
                            <text x={x} y={plotHeight + 18} textAnchor="middle" className="chart-label">
                              {formatGraphTime(reading.recordedAt)}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>
              </>
            ) : (
              <p className="empty-state">Add readings to generate the graph.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Plant voice</h2>
              <p>LLM-generated condition and phrases from your plant's perspective.</p>
            </div>

            {plantStatus ? (
              <div className="voice-stack">
                <div className="condition-row">
                  <span className={`condition-pill condition-${latestCondition}`}>{latestCondition}</span>
                  <button type="button" onClick={handlePlayVoice} disabled={isSpeaking}>
                    {isSpeaking ? 'Generating voice...' : 'Hear the plant'}
                  </button>
                </div>

                <blockquote className="plant-quote">
                  "{plantStatus.message || 'I am waiting for a voice.'}"
                </blockquote>

                {audioUrl ? <audio controls autoPlay src={audioUrl} className="player" /> : null}

                <div className="message-list">
                  {(plantStatus.messages || []).map((message, index) => (
                    <p key={`${index}-${message}`}>{message}</p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="empty-state">
                Submit a reading to let the model classify the plant and write its messages.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Latest reading</h2>
              <p>Most recent measurement stored in SQLite.</p>
            </div>

            {latest ? (
              <div className="metrics">
                <article>
                  <span>Condition</span>
                  <strong className={`condition-text condition-${latestCondition}`}>{latestCondition}</strong>
                </article>
                <article>
                  <span>Soil</span>
                  <strong>{latest.soilLevel}%</strong>
                </article>
                <article>
                  <span>Ambient light</span>
                  <strong>{latest.ambientLightLevel} lux</strong>
                </article>
                <article>
                  <span>Humidity</span>
                  <strong>{latest.humidityLevels}%</strong>
                </article>
                <article>
                  <span>Temperature</span>
                  <strong>{latest.temperatureLevels}°C</strong>
                </article>
                <article>
                  <span>Device ID</span>
                  <strong>{latest.deviceId}</strong>
                </article>
                <article>
                  <span>Captured</span>
                  <strong>{new Date(latest.recordedAt).toLocaleString()}</strong>
                </article>
              </div>
            ) : (
              <p className="empty-state">No readings yet. Submit one to populate the dashboard.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Recent history</h2>
              <p>Up to the latest 20 saved readings.</p>
            </div>

            {isLoading ? (
              <p className="empty-state">Loading readings...</p>
            ) : readings.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Device ID</th>
                      <th>Soil</th>
                      <th>Light</th>
                      <th>Humidity</th>
                      <th>Temp</th>
                      <th>Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((reading) => (
                      <tr key={reading.id}>
                        <td>{reading.deviceId}</td>
                        <td>{reading.soilLevel}%</td>
                        <td>{reading.ambientLightLevel} lux</td>
                        <td>{reading.humidityLevels}%</td>
                        <td>{reading.temperatureLevels}°C</td>
                        <td>{new Date(reading.recordedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No saved history yet.</p>
            )}
          </section>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
    </main>
  );
}
