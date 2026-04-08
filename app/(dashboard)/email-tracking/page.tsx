'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

interface EmailPerformanceData {
  report_date: string;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  unique_opens: number;
  emails_clicked: number;
  unique_clicks: number;
  bounces: number;
  unsubscribes: number;
  spam_complaints: number;
  replies: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  reply_rate: number;
  open_rate_change: number | null;
  click_rate_change: number | null;
  created_at: string;
}

interface EmailPerformanceResponse {
  ok: boolean;
  data: EmailPerformanceData[];
  summary: {
    avg_open_rate_7d: number;
    avg_open_rate_30d: number;
    best_day: { date: string; open_rate: number } | null;
    worst_day: { date: string; open_rate: number } | null;
    trend: 'improving' | 'declining' | 'stable';
    trend_pct: number;
  };
  latest: EmailPerformanceData | null;
}

interface ChangeData {
  id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
}

interface ChangesResponse {
  ok: boolean;
  data: ChangeData[];
}

type DateRange = 7 | 30 | 90;

export default function EmailTrackingPage() {
  const [range, setRange] = useState<DateRange>(30);
  const [performance, setPerformance] = useState<EmailPerformanceResponse | null>(null);
  const [changes, setChanges] = useState<ChangeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    change_type: 'subject_line',
    old_value: '',
    new_value: '',
    reason: '',
    changed_by: '',
  });
  const [submittingModal, setSubmittingModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRes, changesRes] = await Promise.all([
        fetch(`/api/email-performance?range=${range}&trends=true`),
        fetch('/api/email-performance/changes?limit=50'),
      ]);

      if (perfRes.ok) {
        const data: EmailPerformanceResponse = await perfRes.json();
        setPerformance(data);
      }

      if (changesRes.ok) {
        const data: ChangesResponse = await changesRes.json();
        setChanges(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveChange = async () => {
    if (!modalData.change_type || !modalData.new_value) {
      alert('Bitte Typ und neuen Wert ausfullen.');
      return;
    }

    setSubmittingModal(true);
    try {
      const res = await fetch('/api/email-performance/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalData),
      });

      if (res.ok) {
        setShowModal(false);
        setModalData({
          change_type: 'subject_line',
          old_value: '',
          new_value: '',
          reason: '',
          changed_by: '',
        });
        await fetchData();
      } else {
        alert('Fehler beim Speichern der Anderung.');
      }
    } catch (error) {
      console.error('Error saving change:', error);
      alert('Fehler beim Speichern der Anderung.');
    } finally {
      setSubmittingModal(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const getOpenRateColor = (rate: number) => {
    if (rate >= 40) return '#22c55e';
    if (rate >= 20) return '#eab308';
    return '#ef4444';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return '#22c55e';
    if (trend === 'declining') return '#ef4444';
    return '#6b7280';
  };

  const getTrendLabel = (trend: string) => {
    if (trend === 'improving') return 'Verbessernd';
    if (trend === 'declining') return 'Verschlechternd';
    return 'Stabil';
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#111' }} className="min-h-screen p-6">
        <div className="text-white text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    );
  }

  if (!performance || performance.data.length === 0) {
    return (
      <div style={{ backgroundColor: '#111' }} className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">E-Mail-Leistung</h1>
            <button
              onClick={() => setShowModal(true)}
              style={{ backgroundColor: '#E8472A' }}
              className="px-4 py-2 rounded text-white font-medium"
            >
              Anderung erfassen
            </button>
          </div>
          <div
            style={{ backgroundColor: '#1a1a1a', borderColor: '#1E1E1E' }}
            className="border rounded-lg p-8 text-center"
          >
            <p className="text-gray-400">
              Noch keine Daten vorhanden. Die Statistiken werden taglich um 19:00 Uhr synchronisiert.
            </p>
          </div>
        </div>
        {showModal && (
          <ChangeModal
            data={modalData}
            onChange={setModalData}
            onClose={() => setShowModal(false)}
            onSave={handleSaveChange}
            submitting={submittingModal}
          />
        )}
      </div>
    );
  }

  const latestData = performance.latest || performance.data[0];
  const avg7dOpen = performance.summary.avg_open_rate_7d;
  const avg30dOpen = performance.summary.avg_open_rate_30d;
  const avg30dClick = performance.data.reduce((sum, d) => sum + d.click_rate, 0) / performance.data.length;
  const avg30dReply = performance.data.reduce((sum, d) => sum + d.reply_rate, 0) / performance.data.length;

  return (
    <div style={{ backgroundColor: '#111' }} className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">E-Mail-Leistung</h1>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 bg-[#1a1a1a] rounded-lg p-1">
              {[7, 30, 90].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r as DateRange)}
                  style={{
                    backgroundColor: range === r ? '#E8472A' : 'transparent',
                  }}
                  className="px-3 py-1 rounded text-white text-sm font-medium transition"
                >
                  {r}d
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{ backgroundColor: '#E8472A' }}
              className="px-4 py-2 rounded text-white font-medium"
            >
              Anderung erfassen
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Ø Öffnungsrate (7 Tage)"
            value={`${avg7dOpen.toFixed(1)}%`}
            trend={avg7dOpen >= avg30dOpen ? 'up' : 'down'}
            change={Math.abs(avg7dOpen - avg30dOpen).toFixed(1)}
          />
          <KPICard
            title="Ø Klickrate (30 Tage)"
            value={`${avg30dClick.toFixed(1)}%`}
            trend={null}
          />
          <KPICard
            title="Ø Antwortrate (30 Tage)"
            value={`${avg30dReply.toFixed(1)}%`}
            trend={null}
          />
          <KPICard
            title="Trend"
            value={getTrendLabel(performance.summary.trend)}
            trend={performance.summary.trend === 'improving' ? 'up' : performance.summary.trend === 'declining' ? 'down' : null}
            change={`${performance.summary.trend_pct.toFixed(1)}%`}
            trendColor={getTrendColor(performance.summary.trend)}
          />
        </div>

        <div
          style={{ backgroundColor: '#1a1a1a', borderColor: '#1E1E1E' }}
          className="border rounded-lg p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Öffnungsrate und Klickrate Trend</h2>
          <LineChart data={performance.data} />
        </div>

        <div
          style={{ backgroundColor: '#1a1a1a', borderColor: '#1E1E1E' }}
          className="border rounded-lg p-6 mb-8 overflow-x-auto"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Tagliche Statistiken</h2>
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                <th className="text-left py-3 px-4">Datum</th>
                <th className="text-right py-3 px-4">Gesendet</th>
                <th className="text-right py-3 px-4">Geöffnet (%)</th>
                <th className="text-right py-3 px-4">Geklickt (%)</th>
                <th className="text-right py-3 px-4">Bounce (%)</th>
                <th className="text-right py-3 px-4">Antworten (%)</th>
                <th className="text-right py-3 px-4">Delta</th>
              </tr>
            </thead>
            <tbody>
              {performance.data.map((row) => (
                <tr key={row.report_date} className="border-b border-[#1E1E1E] hover:bg-[#242424]">
                  <td className="py-3 px-4">{formatDate(row.report_date)}</td>
                  <td className="text-right py-3 px-4">{row.emails_sent}</td>
                  <td className="text-right py-3 px-4">
                    <span style={{ color: getOpenRateColor(row.open_rate) }}>
                      {row.open_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">{row.click_rate.toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">{row.bounce_rate.toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">{row.reply_rate.toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">
                    {row.open_rate_change !== null ? (
                      <span style={{ color: row.open_rate_change >= 0 ? '#22c55e' : '#ef4444' }}>
                        {row.open_rate_change >= 0 ? '+' : ''}{row.open_rate_change.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{ backgroundColor: '#1a1a1a', borderColor: '#1E1E1E' }}
          className="border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">A/B Tracking - Outreach-Anderungen</h2>
          {changes.length === 0 ? (
            <p className="text-gray-400">Noch keine Anderungen erfasst.</p>
          ) : (
            <div className="space-y-3">
              {changes.map((change) => (
                <div key={change.id} className="flex items-start gap-4 p-3 rounded bg-[#0f0f0f] border border-[#1E1E1E]">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">{formatDate(change.created_at)}</span>
                      <span
                        style={{
                          backgroundColor: getChangeTypeColor(change.change_type),
                          color: '#fff',
                        }}
                        className="px-2 py-1 rounded text-xs font-medium"
                      >
                        {formatChangeType(change.change_type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mb-2">
                      {change.old_value && (
                        <>
                          <span className="text-gray-500">Alt:</span> {change.old_value}
                          <span className="mx-2 text-gray-500">→</span>
                        </>
                      )}
                      <span className="text-gray-500">Neu:</span> {change.new_value}
                    </div>
                    <div className="text-xs text-gray-500">
                      {change.reason && <>Grund: {change.reason}</> }
                      {change.changed_by && <> | Geandert von: {change.changed_by}</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ChangeModal
          data={modalData}
          onChange={setModalData}
          onClose={() => setShowModal(false)}
          onSave={handleSaveChange}
          submitting={submittingModal}
        />
      )}
    </div>
  );
}

function KPICard({
  title,
  value,
  trend,
  change,
  trendColor,
}: {
  title: string;
  value: string;
  trend?: 'up' | 'down' | null;
  change?: string;
  trendColor?: string;
}) {
  return (
    <div
      style={{ backgroundColor: '#1a1a1a', borderColor: '#1E1E1E' }}
      className="border rounded-lg p-4"
    >
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <p
          className="text-2xl font-bold"
          style={{ color: trendColor || '#fff' }}
        >
          {value}
        </p>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <ChevronUp size={18} className="text-green-500" />
            ) : (
              <ChevronDown size={18} className="text-red-500" />
            )}
            {change && (
              <span
                style={{ color: trend === 'up' ? '#22c55e' : '#ef4444' }}
                className="text-sm font-medium"
              >
                {change}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LineChart({ data }: { data: EmailPerformanceData[] }) {
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxValue = 100;
  const xStep = plotWidth / (data.length - 1 || 1);
  const yScale = plotHeight / maxValue;

  const openPoints = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + plotHeight - d.open_rate * yScale,
    value: d.open_rate,
    date: d.report_date,
  }));

  const clickPoints = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + plotHeight - d.click_rate * yScale,
    value: d.click_rate,
  }));

  const openPath = openPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const clickPath = clickPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width="100%" height="400" viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="openGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#E8472A', stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: '#E8472A', stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + plotHeight}
        stroke="#4b5563"
        strokeWidth="1"
      />
      <line
        x1={padding.left}
        y1={padding.top + plotHeight}
        x2={width - padding.right}
        y2={padding.top + plotHeight}
        stroke="#4b5563"
        strokeWidth="1"
      />

      {[0, 25, 50, 75, 100].map((val) => (
        <g key={val}>
          <line
            x1={padding.left - 5}
            y1={padding.top + plotHeight - val * yScale}
            x2={padding.left}
            y2={padding.top + plotHeight - val * yScale}
            stroke="#4b5563"
            strokeWidth="1"
          />
          <text
            x={padding.left - 10}
            y={padding.top + plotHeight - val * yScale + 4}
            textAnchor="end"
            fontSize="12"
            fill="#9ca3af"
          >
            {val}%
          </text>
        </g>
      ))}

      {openPoints.map((p, i) => (
        <text
          key={`label-${i}`}
          x={p.x}
          y={padding.top + plotHeight + 20}
          textAnchor="middle"
          fontSize="11"
          fill="#9ca3af"
        >
          {formatDateShort(p.date)}
        </text>
      ))}

      <path d={clickPath} stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.5" />
      <path d={openPath} stroke="#E8472A" strokeWidth="2.5" fill="none" />

      {openPoints.map((p, i) => (
        <circle key={`dot-open-${i}`} cx={p.x} cy={p.y} r="3" fill="#E8472A" />
      ))}

      <g className="text-xs" fill="#9ca3af">
        <text x={width / 2} y={height - 5} textAnchor="middle" fontSize="12">
          Datum
        </text>
        <text x="20" y="15" fontSize="12">
          Öffnungsrate (%)
        </text>
      </g>

      <text x={width - padding.right - 120} y={25} fontSize="12" fill="#E8472A" fontWeight="bold">
        Öffnungsrate
      </text>
      <text x={width - padding.right - 120} y={45} fontSize="12" fill="#6b7280">
        Klickrate
      </text>
    </svg>
  );
}

function ChangeModal({
  data,
  onChange,
  onClose,
  onSave,
  submitting,
}: {
  data: any;
  onChange: (data: any) => void;
  onClose: () => void;
  onSave: () => void;
  submitting: boolean;
}) {
  return (
    <div
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      className="fixed inset-0 flex items-center justify-center z-50"
    >
      <div
        style={{ backgroundColor: '#1a1a1a', borderColor: '#1E1E1E' }}
        className="border rounded-lg p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Anderung erfassen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Typ</label>
            <select
              value={data.change_type}
              onChange={(e) => onChange({ ...data, change_type: e.target.value })}
              style={{ backgroundColor: '#0f0f0f', borderColor: '#1E1E1E' }}
              className="border rounded w-full px-3 py-2 text-white"
            >
              <option value="subject_line">Betreffzeile</option>
              <option value="send_time">Sendezeitpunkt</option>
              <option value="template">Vorlage</option>
              <option value="targeting">Zielgruppe</option>
              <option value="message_text">Nachrichtentext</option>
              <option value="other">Sonstiges</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Alt</label>
            <input
              type="text"
              value={data.old_value}
              onChange={(e) => onChange({ ...data, old_value: e.target.value })}
              placeholder="Optional"
              style={{ backgroundColor: '#0f0f0f', borderColor: '#1E1E1E' }}
              className="border rounded w-full px-3 py-2 text-white placeholder-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Neu</label>
            <input
              type="text"
              value={data.new_value}
              onChange={(e) => onChange({ ...data, new_value: e.target.value })}
              placeholder="Erforderlich"
              style={{ backgroundColor: '#0f0f0f', borderColor: '#1E1E1E' }}
              className="border rounded w-full px-3 py-2 text-white placeholder-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Grund</label>
            <input
              type="text"
              value={data.reason}
              onChange={(e) => onChange({ ...data, reason: e.target.value })}
              placeholder="Optional"
              style={{ backgroundColor: '#0f0f0f', borderColor: '#1E1E1E' }}
              className="border rounded w-full px-3 py-2 text-white placeholder-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Geandert von</label>
            <input
              type="text"
              value={data.changed_by}
              onChange={(e) => onChange({ ...data, changed_by: e.target.value })}
              placeholder="Name oder E-Mail"
              style={{ backgroundColor: '#0f0f0f', borderColor: '#1E1E1E' }}
              className="border rounded w-full px-3 py-2 text-white placeholder-gray-600"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            style={{ backgroundColor: '#2a2a2a' }}
            className="px-4 py-2 rounded text-white font-medium hover:bg-[#333]"
          >
            Abbrechen
          </button>
          <button
            onClick={onSave}
            disabled={submitting}
            style={{ backgroundColor: '#E8472A' }}
            className="px-4 py-2 rounded text-white font-medium disabled:opacity-50"
          >
            {submitting ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getChangeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    subject_line: '#3b82f6',
    send_time: '#8b5cf6',
    template: '#ec4899',
    targeting: '#f59e0b',
    message_text: '#10b981',
    other: '#6b7280',
  };
  return colors[type] || '#6b7280';
}

function formatChangeType(type: string): string {
  const labels: Record<string, string> = {
    subject_line: 'Betreffzeile',
    send_time: 'Sendezeitpunkt',
    template: 'Vorlage',
    targeting: 'Zielgruppe',
    message_text: 'Nachrichtentext',
    other: 'Sonstiges',
  };
  return labels[type] || type;
}
