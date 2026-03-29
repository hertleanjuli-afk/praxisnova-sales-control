'use client';

import { useState, useEffect, Fragment, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeeklyReport {
  id: number; week_start: string; week_end: string;
  leads_contacted: number; emails_sent: number; emails_opened: number; emails_replied: number;
  meetings_booked: number; linkedin_requests: number; linkedin_connected: number;
  linkedin_messages: number; linkedin_replied: number; linkedin_meetings: number;
  sector_immobilien_count: number; sector_handwerk_count: number;
  sector_bau_count: number; sector_allgemein_count: number;
  best_performing_sector: string | null; created_at: string;
}

interface ChangeLogEntry {
  id: number; change_date: string; change_type: string; change_description: string;
  changed_by: string; expected_impact: string | null; actual_impact: string | null;
}

interface FeedbackEntry {
  id: number; week_start: string;
  answer_1: string | null; answer_2: string | null; answer_3: string | null;
  answer_4: string | null; answer_5: string | null;
  submitted_by: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien', handwerk: 'Handwerk', bauunternehmen: 'Bau', allgemein: 'Allgemein',
};

const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A', handwerk: '#3B82F6', bauunternehmen: '#22C55E', allgemein: '#EAB308',
};

const FEEDBACK_QUESTIONS = [
  'Was lief diese Woche gut?',
  'Was lief nicht gut?',
  'Haben wir etwas geändert?',
  'Welche Reaktionen haben wir von Leads bekommen?',
  'Was wollen wir nächste Woche testen?',
];

const CHANGE_TYPE_COLORS: Record<string, string> = {
  'Strategie': '#E8472A',
  'Template': '#3B82F6',
  'Zielgruppe': '#22C55E',
  'Tool': '#EAB308',
  'Prozess': '#A855F7',
};

const TOOLTIP_STYLE = {
  background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getISOWeek(dateStr: string): number {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '0.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Card Wrapper ───────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 24 }} className="print-section">
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', marginBottom: 20 }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width={80} height={30}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ height: 32, width: 200, background: '#1E1E1E', borderRadius: 8, marginBottom: 8 }} className="animate-pulse" />
        <div style={{ height: 18, width: 400, background: '#1E1E1E', borderRadius: 6, marginBottom: 32 }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height: 120, background: '#111', border: '1px solid #1E1E1E', borderRadius: 12 }} className="animate-pulse" />
          ))}
        </div>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 300, background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, marginBottom: 24 }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => {
        if (!res.ok) throw new Error('Fehler beim Laden der Daten');
        return res.json();
      })
      .then((data) => {
        const r = data.weeklyReports || [];
        setReports(r);
        setChangeLog(data.changeLog || []);
        setFeedback(data.weeklyFeedback || []);
        if (r.length > 0) setSelectedId(r[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedReport = useMemo(() => reports.find(r => r.id === selectedId) || reports[0] || null, [reports, selectedId]);

  // Last 8 reports for sparklines (chronological order)
  const last8 = useMemo(() => [...reports].reverse().slice(-8), [reports]);

  // Last 12 reports for trend chart (chronological order)
  const last12 = useMemo(() => [...reports].reverse().slice(-12), [reports]);

  // Previous report (the one before selected)
  const prevReport = useMemo(() => {
    if (!selectedReport) return null;
    const idx = reports.findIndex(r => r.id === selectedReport.id);
    return idx < reports.length - 1 ? reports[idx + 1] : null;
  }, [reports, selectedReport]);

  // Average values across all reports
  const avgValues = useMemo(() => ({
    leads: avg(reports.map(r => r.leads_contacted)),
    emails: avg(reports.map(r => r.emails_sent)),
    opened: avg(reports.map(r => r.emails_opened)),
    replied: avg(reports.map(r => r.emails_replied)),
    meetings: avg(reports.map(r => r.meetings_booked)),
  }), [reports]);

  if (loading) return <Skeleton />;

  // ── KPI data ──

  const kpis = selectedReport ? [
    { label: 'Leads kontaktiert', value: selectedReport.leads_contacted, color: '#E8472A', sparkData: last8.map(r => r.leads_contacted) },
    { label: 'E-Mails gesendet', value: selectedReport.emails_sent, color: '#3B82F6', sparkData: last8.map(r => r.emails_sent) },
    { label: 'Öffnungsrate', value: `${pct(selectedReport.emails_opened, selectedReport.emails_sent)}%`, color: '#22C55E', sparkData: last8.map(r => r.emails_sent > 0 ? (r.emails_opened / r.emails_sent) * 100 : 0) },
    { label: 'Antwortrate', value: `${pct(selectedReport.emails_replied, selectedReport.emails_sent)}%`, color: '#EAB308', sparkData: last8.map(r => r.emails_sent > 0 ? (r.emails_replied / r.emails_sent) * 100 : 0) },
    { label: 'Meetings gebucht', value: selectedReport.meetings_booked, color: '#A855F7', sparkData: last8.map(r => r.meetings_booked) },
    { label: 'LinkedIn-Anfragen', value: selectedReport.linkedin_requests, color: '#06B6D4', sparkData: last8.map(r => r.linkedin_requests) },
  ] : [];

  // ── Trend chart data ──

  const trendData = last12.map(r => ({
    name: `KW ${getISOWeek(r.week_start)}`,
    'E-Mails gesendet': r.emails_sent,
    'E-Mails geöffnet': r.emails_opened,
    'Antworten': r.emails_replied,
  }));

  // ── Comparison chart data ──

  const comparisonData = selectedReport && prevReport ? [
    { metric: 'Leads', aktuell: selectedReport.leads_contacted, vorwoche: prevReport.leads_contacted, durchschnitt: Math.round(avgValues.leads) },
    { metric: 'E-Mails', aktuell: selectedReport.emails_sent, vorwoche: prevReport.emails_sent, durchschnitt: Math.round(avgValues.emails) },
    { metric: 'Öffnungen', aktuell: selectedReport.emails_opened, vorwoche: prevReport.emails_opened, durchschnitt: Math.round(avgValues.opened) },
    { metric: 'Antworten', aktuell: selectedReport.emails_replied, vorwoche: prevReport.emails_replied, durchschnitt: Math.round(avgValues.replied) },
    { metric: 'Meetings', aktuell: selectedReport.meetings_booked, vorwoche: prevReport.meetings_booked, durchschnitt: Math.round(avgValues.meetings) },
  ] : null;

  // ── Sector chart data ──

  const sectorData = selectedReport ? [
    { name: SECTOR_LABELS.immobilien, count: selectedReport.sector_immobilien_count, fill: SECTOR_COLORS.immobilien },
    { name: SECTOR_LABELS.handwerk, count: selectedReport.sector_handwerk_count, fill: SECTOR_COLORS.handwerk },
    { name: SECTOR_LABELS.bauunternehmen, count: selectedReport.sector_bau_count, fill: SECTOR_COLORS.bauunternehmen },
    { name: SECTOR_LABELS.allgemein, count: selectedReport.sector_allgemein_count, fill: SECTOR_COLORS.allgemein },
  ] : [];

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-section { background: #fff !important; border: 1px solid #ccc !important; color: #000 !important; page-break-inside: avoid; break-inside: avoid; margin-bottom: 16px !important; }
          .print-section h3 { color: #000 !important; }
          .print-section td, .print-section th { color: #000 !important; border-color: #ccc !important; }
          * { color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F0F0F5', marginBottom: 6 }}>Reports</h1>
              <p style={{ fontSize: 14, color: '#888' }}>Wochenberichte, Change Log und Feedback im Überblick</p>
            </div>
            <button
              className="no-print"
              onClick={() => window.print()}
              style={{
                background: '#E8472A', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Als PDF exportieren
            </button>
          </div>

          {error && (
            <div style={{ marginBottom: 24, padding: 16, background: '#2D1111', border: '1px solid #5C2020', borderRadius: 8, color: '#F87171', fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* ── 1. KPI Summary Cards ── */}
          {selectedReport && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 32 }}>
              {kpis.map((kpi) => (
                <div key={kpi.label} className="print-section" style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 3, background: kpi.color }} />
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#F0F0F5', marginBottom: 4 }}>{kpi.value}</div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{kpi.label}</div>
                    <Sparkline data={kpi.sparkData} color={kpi.color} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 2. Trend Comparison Chart ── */}
          {trendData.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <Card title="Wochenvergleich">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData}>
                    <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#333' }} />
                    <YAxis tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#333' }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ color: '#888', fontSize: 12 }} />
                    <Area type="monotone" dataKey="E-Mails gesendet" stroke="#E8472A" fill="#E8472A" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="E-Mails geöffnet" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="Antworten" stroke="#22C55E" fill="#22C55E" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ── 3. This Week vs Last Week vs Average ── */}
          {comparisonData && (
            <div style={{ marginBottom: 32 }}>
              <Card title="Diese Woche vs. Vorwoche vs. Durchschnitt">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                    <XAxis dataKey="metric" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#333' }} />
                    <YAxis tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#333' }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ color: '#888', fontSize: 12 }} />
                    <Bar dataKey="aktuell" name="Aktuell" fill="#E8472A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="vorwoche" name="Vorwoche" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="durchschnitt" name="Durchschnitt" fill="#555" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ── 4. Sector Breakdown ── */}
          {selectedReport && (
            <div style={{ marginBottom: 32 }}>
              <Card title="Sektorverteilung">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sectorData} layout="vertical">
                    <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                    <XAxis type="number" orientation="top" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#333' }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#333' }} width={100} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Anzahl" radius={[0, 4, 4, 0]}>
                      {sectorData.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ── 5. Weekly Reports Table ── */}
          <div style={{ marginBottom: 32 }}>
            <Card title="Wochenberichte">
              {reports.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>Keine Berichte vorhanden</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                        {['KW', 'Zeitraum', 'Leads', 'E-Mails', 'Öffnungsrate', 'Antwortrate', 'Meetings', 'Bester Sektor'].map(col => (
                          <th key={col} style={{ padding: '10px 12px', textAlign: col === 'KW' || col === 'Zeitraum' || col === 'Bester Sektor' ? 'left' : 'right', color: '#555', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => {
                        const isSelected = selectedId === report.id;
                        const isExpanded = expandedId === report.id;
                        const openRate = pct(report.emails_opened, report.emails_sent);
                        const replyRate = pct(report.emails_replied, report.emails_sent);
                        const replyNum = parseFloat(replyRate);

                        return (
                          <Fragment key={report.id}>
                            <tr
                              onClick={() => { setSelectedId(report.id); setExpandedId(isExpanded ? null : report.id); }}
                              style={{
                                borderBottom: '1px solid #1E1E1E',
                                borderLeft: isSelected ? '3px solid #E8472A' : '3px solid transparent',
                                background: isSelected ? '#1a1210' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.background = '#161616'); }}
                              onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = 'transparent'); }}
                            >
                              <td style={{ padding: '12px', color: '#F0F0F5', fontWeight: 600 }}>KW {getISOWeek(report.week_start)}</td>
                              <td style={{ padding: '12px', color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(report.week_start)} – {formatDate(report.week_end)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#F0F0F5', fontWeight: 500 }}>{report.leads_contacted}</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#F0F0F5' }}>{report.emails_sent}</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#F0F0F5' }}>{openRate}%</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: replyNum >= 5 ? '#22C55E' : replyNum >= 2 ? '#EAB308' : '#EF4444', fontWeight: 500 }}>{replyRate}%</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#F0F0F5', fontWeight: 500 }}>{report.meetings_booked}</td>
                              <td style={{ padding: '12px' }}>
                                {report.best_performing_sector && (
                                  <span style={{
                                    display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                    background: `${SECTOR_COLORS[report.best_performing_sector.toLowerCase()] || '#555'}22`,
                                    color: SECTOR_COLORS[report.best_performing_sector.toLowerCase()] || '#888',
                                  }}>
                                    {SECTOR_LABELS[report.best_performing_sector.toLowerCase()] || report.best_performing_sector}
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Expanded row */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} style={{ padding: 0 }}>
                                  <div style={{ background: '#0D0D0D', borderTop: '1px solid #1E1E1E', borderBottom: '1px solid #1E1E1E', padding: 24 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                                      {/* Email */}
                                      <div>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#E8472A', marginBottom: 12 }}>E-Mail Details</h4>
                                        {[['Gesendet', report.emails_sent], ['Geöffnet', report.emails_opened], ['Antworten', report.emails_replied]].map(([label, val]) => (
                                          <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1A1A1A' }}>
                                            <span style={{ color: '#888', fontSize: 13 }}>{label}</span>
                                            <span style={{ color: '#F0F0F5', fontSize: 13, fontWeight: 500 }}>{val}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {/* LinkedIn */}
                                      <div>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', marginBottom: 12 }}>LinkedIn</h4>
                                        {[['Anfragen', report.linkedin_requests], ['Verbunden', report.linkedin_connected], ['Nachrichten', report.linkedin_messages], ['Antworten', report.linkedin_replied], ['Meetings', report.linkedin_meetings]].map(([label, val]) => (
                                          <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1A1A1A' }}>
                                            <span style={{ color: '#888', fontSize: 13 }}>{label}</span>
                                            <span style={{ color: '#F0F0F5', fontSize: 13, fontWeight: 500 }}>{val}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {/* Sectors */}
                                      <div>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#22C55E', marginBottom: 12 }}>Sektor-Aufschlüsselung</h4>
                                        {[['Immobilien', report.sector_immobilien_count], ['Handwerk', report.sector_handwerk_count], ['Bau', report.sector_bau_count], ['Allgemein', report.sector_allgemein_count]].map(([label, val]) => (
                                          <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1A1A1A' }}>
                                            <span style={{ color: '#888', fontSize: 13 }}>{label}</span>
                                            <span style={{ color: '#F0F0F5', fontSize: 13, fontWeight: 500 }}>{val}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* ── 6. Change Log Table ── */}
          <div style={{ marginBottom: 32 }}>
            <Card title="Change Log">
              {changeLog.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>Keine Änderungen dokumentiert</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                        {['Datum', 'Typ', 'Beschreibung', 'Erwartet', 'Tatsächlich'].map(col => (
                          <th key={col} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {changeLog.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid #1E1E1E' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px', color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(entry.change_date)}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                              background: `${CHANGE_TYPE_COLORS[entry.change_type] || '#555'}22`,
                              color: CHANGE_TYPE_COLORS[entry.change_type] || '#888',
                            }}>
                              {entry.change_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#F0F0F5', maxWidth: 300 }}>{entry.change_description}</td>
                          <td style={{ padding: '12px', color: '#888', fontSize: 12, maxWidth: 200 }}>{entry.expected_impact || <span style={{ color: '#333' }}>--</span>}</td>
                          <td style={{ padding: '12px', fontSize: 12, maxWidth: 200, color: entry.actual_impact ? '#22C55E' : '#333' }}>{entry.actual_impact || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* ── 7. Weekly Feedback ── */}
          <div style={{ marginBottom: 32 }}>
            <Card title="Wöchentliches Feedback">
              {feedback.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>Kein Feedback vorhanden</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {feedback.map((entry) => {
                    const answers = [entry.answer_1, entry.answer_2, entry.answer_3, entry.answer_4, entry.answer_5];
                    const questionColors = ['#22C55E', '#EF4444', '#3B82F6', '#A855F7', '#EAB308'];

                    return (
                      <div key={entry.id} style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 10, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <span style={{ color: '#F0F0F5', fontWeight: 600, fontSize: 14 }}>KW {getISOWeek(entry.week_start)}</span>
                          <span style={{ color: '#555', fontSize: 12 }}>{formatDate(entry.week_start)}</span>
                          <span style={{ color: '#888', fontSize: 11, background: '#1E1E1E', padding: '2px 8px', borderRadius: 99 }}>{entry.submitted_by}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                          {FEEDBACK_QUESTIONS.map((q, i) => {
                            const answer = answers[i];
                            if (!answer) return null;
                            return (
                              <div key={i} style={i === 4 ? { gridColumn: '1 / -1' } : {}}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: questionColors[i], marginBottom: 4 }}>{q}</p>
                                <p style={{ fontSize: 13, color: '#CCC', lineHeight: 1.5 }}>{answer}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
