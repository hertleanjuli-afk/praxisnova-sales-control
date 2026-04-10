'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

interface ActionListData {
  callsDue: number;
  linkedinDue: number;
  postDraftsReady: number;
  hotLeads: number;
  isWeekend: boolean;
  isFriday: boolean;
  systemOk: boolean;
  recentErrors: number;
}

// ── Status Row Helper ─────────────────────────────────────────────────────
function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: ok ? '#4ade80' : '#E8472A', fontWeight: 500 }}>
        {ok ? '✓ ' : '! '}{value}
      </span>
    </div>
  );
}

// ── Design Tokens ─────────────────────────────────────────────────────────
const CORAL = '#E8472A';
const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A', handwerk: '#3B82F6', bauunternehmen: '#22C55E',
  inbound: '#EAB308', allgemein: '#8B5CF6',
};
const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien', handwerk: 'Handwerk', bauunternehmen: 'Bau',
  inbound: 'Inbound', allgemein: 'Allgemein',
};
const TOOLTIP_STYLE = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' };
const AXIS_TICK = { fill: '#888', fontSize: 12 };

// ── Types ─────────────────────────────────────────────────────────────────
interface KpiValue { value: number; trend: { delta: number; direction: 'up' | 'down' | 'flat' } }
interface DashboardData {
  kpis: { newLeads: KpiValue; emailsSent: KpiValue; openRate: KpiValue; replyRate: KpiValue; meetingsBooked: KpiValue };
  sparkline: { day: string; count: number }[];
  hotLeads: any[]; recentClicks: any[]; inboundLeads: any[];
  meetings: any[]; sequenceProgress: any[]; linkedinTasks: any[];
  activity: any[];
  funnel: { totalLeads: number; contacted: number; opened: number; replied: number; meetings: number; appointments: number };
  emailPerformance: { week: string; sent: number; opened: number; replied: number }[];
  sectorBreakdown: { sector: string; count: number }[];
  timestamp: string;
}

// ── Animated Number ───────────────────────────────────────────────────────
function AnimNum({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    let s = 0; const steps = 30; const inc = value / steps;
    const t = setInterval(() => { s += inc; if (s >= value) { setD(value); clearInterval(t); } else setD(decimals > 0 ? parseFloat(s.toFixed(decimals)) : Math.round(s)); }, 25);
    return () => clearInterval(t);
  }, [value, decimals]);
  return <>{d.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

// ── Trend Arrow ───────────────────────────────────────────────────────────
function Trend({ delta, direction }: { delta: number; direction: string }) {
  if (direction === 'flat') return <span style={{ fontSize: 12, color: '#555' }}>—</span>;
  const up = direction === 'up';
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: up ? '#22C55E' : '#EF4444' }}>
      {up ? '↑' : '↓'} {delta}%
    </span>
  );
}

// ── Card Wrapper ──────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>{children}</div>;
}

// ── Time Ago ──────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
}

// ── Activity Type Config ──────────────────────────────────────────────────
const ACTIVITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  email_opened: { label: 'Email geöffnet', color: '#22C55E', bg: '#22C55E20' },
  email_replied: { label: 'Email beantwortet', color: '#8B5CF6', bg: '#8B5CF620' },
  website_click: { label: 'Website Klick', color: '#3B82F6', bg: '#3B82F620' },
  new_lead: { label: 'Neue Anfrage', color: '#EAB308', bg: '#EAB30820' },
};

// ── Manager Widget ───────────────────────────────────────────────────────
function ManagerWidget() {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [instructions, setInstructions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/manager-instructions');
      if (res.ok) {
        const json = await res.json();
        setInstructions(json.instructions ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/manager-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      setMsg('');
      await load();
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
      width: open ? 360 : 'auto',
    }}>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: '#E8472A', color: '#fff', border: 'none', borderRadius: '50%',
            width: 52, height: 52, fontSize: 22, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(232,71,42,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          💬
        </button>
      )}
      {open && (
        <div style={{
          background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid #1E1E1E',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>
              💬 Nachricht an Manager
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent', border: 'none', color: '#888',
                cursor: 'pointer', fontSize: 18, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Input */}
          <div style={{ padding: 12 }}>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Schreib dem Manager eine Anweisung..."
              rows={3}
              style={{
                width: '100%', background: '#111', border: '1px solid #1E1E1E',
                borderRadius: 8, padding: 10, color: '#F0F0F5', fontSize: 13,
                resize: 'none', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#E8472A'; }}
              onBlur={(e) => { e.target.style.borderColor = '#1E1E1E'; }}
            />
            <button
              onClick={send}
              disabled={sending || !msg.trim()}
              style={{
                marginTop: 8, width: '100%', padding: '8px 0',
                background: sending || !msg.trim() ? '#333' : '#E8472A',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: sending || !msg.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Sende...' : 'Senden'}
            </button>
          </div>

          {/* Recent instructions */}
          {instructions.length > 0 && (
            <div style={{ padding: '0 12px 12px', maxHeight: 200, overflowY: 'auto' }}>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Letzte Nachrichten
              </p>
              {instructions.slice(0, 3).map((inst: any) => (
                <div key={inst.id} style={{
                  padding: '8px 10px', background: '#111', borderRadius: 8,
                  border: '1px solid #1E1E1E', marginBottom: 6,
                }}>
                  <p style={{ fontSize: 12, color: '#F0F0F5', margin: 0, lineHeight: 1.4 }}>{inst.message}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 4,
                      background: inst.status === 'actioned' ? '#22C55E20' : inst.status === 'unread' ? '#EAB30820' : '#88888820',
                      color: inst.status === 'actioned' ? '#22C55E' : inst.status === 'unread' ? '#EAB308' : '#888',
                      fontWeight: 600,
                    }}>
                      {inst.status === 'actioned' ? 'Erledigt' : inst.status === 'unread' ? 'Ungelesen' : inst.status}
                    </span>
                    <span style={{ fontSize: 10, color: '#555' }}>
                      {new Date(inst.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {inst.response && (
                    <p style={{ fontSize: 11, color: '#22C55E', margin: '6px 0 0', fontStyle: 'italic' }}>
                      ↳ {inst.response}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [actionData, setActionData] = useState<ActionListData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard?period=${period}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString('de-DE'));
    } catch { /* silently fail */ }
    setLoading(false);
  }, [period]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [fetchData]);

  // Action List laden
  useEffect(() => {
    fetch('/api/dashboard/action-list')
      .then(r => r.json())
      .then(d => setActionData(d))
      .catch(() => {});
  }, []);

  const greeting = new Date().getHours() < 12 ? 'Guten Morgen' : new Date().getHours() < 18 ? 'Guten Tag' : 'Guten Abend';
  const dateStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading && !data) {
    return (
      <div style={{ padding: 24 }}>
        <div className="animate-pulse" style={{ display: 'grid', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 120, background: '#111', borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  if (!data) return <div style={{ padding: 24, color: '#888' }}>Dashboard konnte nicht geladen werden.</div>;

  const periods = [
    { key: 'today', label: 'Heute' }, { key: 'week', label: 'Diese Woche' },
    { key: 'month', label: 'Dieser Monat' }, { key: 'all', label: 'Gesamt' },
  ];

  // Process sequence progress for chart
  const seqMap: Record<string, Record<number, number>> = {};
  for (const row of data.sequenceProgress) {
    if (!seqMap[row.sequence_type]) seqMap[row.sequence_type] = {};
    seqMap[row.sequence_type][row.sequence_step] = Number(row.count);
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── SECTION 1: Top Bar ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>{greeting}, Anjuli</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>{dateStr}</p>
          {lastUpdate && <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>Aktualisiert: {lastUpdate}</p>}
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 8, padding: 3, border: '1px solid #1E1E1E' }}>
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: period === p.key ? CORAL : 'transparent', color: period === p.key ? '#fff' : '#888' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Wochenende Banner ────────────────────────────────────────── */}
      {actionData?.isWeekend && (
        <div style={{
          background: '#1a1600',
          border: '1px solid #3a3000',
          borderRadius: 10,
          padding: '12px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#fbbf24',
          fontSize: 14,
        }}>
          <span>🔕</span>
          <span>
            <strong>Kein Email-Versand heute - Wochenende.</strong>
            {' '}Daten-Agents (Apollo, Backup) laufen weiter. Emails starten wieder Montag 07:00.
          </span>
        </div>
      )}

      {/* ── SECTION 1b: Heutiger Aktions-Plan + System Health ────────── */}
      {actionData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 }}>

          {/* ---- LINKE KARTE: Heutiger Aktions-Plan ---- */}
          <div style={{
            background: '#111',
            border: '1px solid #1E1E1E',
            borderRadius: 12,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <h3 style={{ margin: 0, color: '#F0F0F5', fontSize: 16, fontWeight: 700 }}>
                Heute - {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Anrufe */}
              <Link href="/anrufliste" style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: actionData.callsDue > 0 ? '#2a0a0a' : '#0f1a0f',
                  border: `1px solid ${actionData.callsDue > 0 ? '#5a1a1a' : '#1a3a1a'}`,
                  borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📞</span>
                    <span style={{ color: '#F0F0F5', fontWeight: 500 }}>
                      {actionData.callsDue} {actionData.callsDue === 1 ? 'Anruf faellig' : 'Anrufe faellig'}
                    </span>
                  </div>
                  <span style={{ color: actionData.callsDue > 0 ? '#E8472A' : '#4ade80', fontSize: 18, fontWeight: 700 }}>
                    {actionData.callsDue > 0 ? actionData.callsDue : '✓'}
                  </span>
                </div>
              </Link>

              {/* LinkedIn */}
              <Link href="/linkedin" style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: actionData.linkedinDue > 0 ? '#0a0a2a' : '#0f1a0f',
                  border: `1px solid ${actionData.linkedinDue > 0 ? '#1a1a5a' : '#1a3a1a'}`,
                  borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>💼</span>
                    <span style={{ color: '#F0F0F5', fontWeight: 500 }}>
                      {actionData.linkedinDue} LinkedIn-{actionData.linkedinDue === 1 ? 'Aktion' : 'Aktionen'} faellig
                    </span>
                  </div>
                  <span style={{ color: actionData.linkedinDue > 0 ? '#6366f1' : '#4ade80', fontSize: 18, fontWeight: 700 }}>
                    {actionData.linkedinDue > 0 ? actionData.linkedinDue : '✓'}
                  </span>
                </div>
              </Link>

              {/* LinkedIn Posts */}
              <Link href="/linkedin-posting" style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: actionData.postDraftsReady > 0 ? '#0a1a0a' : '#111',
                  border: `1px solid ${actionData.postDraftsReady > 0 ? '#1a4a1a' : '#222'}`,
                  borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>✍️</span>
                    <span style={{ color: '#F0F0F5', fontWeight: 500 }}>
                      {actionData.postDraftsReady > 0
                        ? `${actionData.postDraftsReady} Post-Entwuerfe bereit zum Kopieren`
                        : 'LinkedIn Posts - Entwuerfe werden erstellt...'}
                    </span>
                  </div>
                  {actionData.postDraftsReady > 0 && (
                    <span style={{ color: '#4ade80', fontSize: 14, fontWeight: 600 }}>Jetzt ansehen →</span>
                  )}
                </div>
              </Link>

              {/* Hot Leads */}
              {actionData.hotLeads > 0 && (
                <Link href="/sequences" style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#1a1000',
                    border: '1px solid #3a2a00',
                    borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>🔥</span>
                      <span style={{ color: '#F0F0F5', fontWeight: 500 }}>
                        {actionData.hotLeads} {actionData.hotLeads === 1 ? 'Lead hat' : 'Leads haben'} Email geoeffnet - noch keine Antwort
                      </span>
                    </div>
                    <span style={{ color: '#fbbf24', fontSize: 18, fontWeight: 700 }}>{actionData.hotLeads}</span>
                  </div>
                </Link>
              )}

              {/* Freitag-Hinweis */}
              {actionData.isFriday && !actionData.isWeekend && (
                <div style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderRadius: 8, padding: '10px 16px',
                  color: '#888', fontSize: 13,
                }}>
                  📅 Heute Freitag - morgen kein Email-Versand. Agents laufen weiter.
                </div>
              )}
            </div>
          </div>

          {/* ---- RECHTE KARTE: System Health ---- */}
          <div style={{
            background: '#111',
            border: `1px solid ${actionData.systemOk ? '#1E3A1E' : '#3A1E1E'}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: actionData.systemOk ? '#4ade80' : '#E8472A',
                display: 'inline-block',
              }} />
              <h3 style={{ margin: 0, color: '#F0F0F5', fontSize: 14, fontWeight: 700 }}>
                System Status
              </h3>
              <Link href="/settings" style={{ marginLeft: 'auto', color: '#666', fontSize: 11, textDecoration: 'none' }}>
                Details →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatusRow
                label="Fehler (2h)"
                value={actionData.recentErrors === 0 ? 'Keine' : `${actionData.recentErrors} Fehler`}
                ok={actionData.recentErrors === 0}
              />
              <StatusRow label="Backup" value="Laedt..." ok={true} />
              <StatusRow label="Apollo" value="Laedt..." ok={true} />
              <StatusRow label="HubSpot" value="Laedt..." ok={true} />
            </div>

            {!actionData.systemOk && (
              <Link href="/errors" style={{
                display: 'block', marginTop: 12,
                background: '#E8472A22',
                border: '1px solid #E8472A44',
                borderRadius: 6, padding: '8px 12px',
                color: '#E8472A', fontSize: 12, textDecoration: 'none', textAlign: 'center',
              }}>
                Fehler-Details ansehen
              </Link>
            )}
          </div>

        </div>
      )}

      {/* ── SECTION 2: KPI Row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }} className="kpi-grid">
        {([
          { label: 'Neue Leads', kpi: data.kpis.newLeads, color: '#3B82F6', suffix: '', decimals: 0 },
          { label: 'Emails gesendet', kpi: data.kpis.emailsSent, color: CORAL, suffix: '', decimals: 0 },
          { label: 'Öffnungsrate', kpi: data.kpis.openRate, color: '#EAB308', suffix: '%', decimals: 1 },
          { label: 'Antwortrate', kpi: data.kpis.replyRate, color: '#8B5CF6', suffix: '%', decimals: 1 },
          { label: 'Meetings gebucht', kpi: data.kpis.meetingsBooked, color: '#22C55E', suffix: '', decimals: 0 },
        ]).map((item, i) => (
          <Card key={i}>
            <div style={{ borderTop: `3px solid ${item.color}`, margin: '-20px -20px 16px', borderRadius: '12px 12px 0 0' }} />
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>{item.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#F0F0F5' }}>
                <AnimNum value={item.kpi.value} suffix={item.suffix || ''} decimals={item.decimals || 0} />
              </span>
              <Trend delta={item.kpi.trend.delta} direction={item.kpi.trend.direction} />
            </div>
            {(data.sparkline ?? []).length > 0 && i === 1 && (
              <div style={{ marginTop: 8 }}>
                <ResponsiveContainer width="100%" height={30}>
                  <LineChart data={data.sparkline}>
                    <Line type="monotone" dataKey="count" stroke={item.color} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ── SECTION 3: Action Center (Hot Leads + This Week) ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="action-grid">
        {/* Left: Hot Leads */}
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F5', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔥</span> Heiße Leads
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
            {(data.hotLeads ?? []).length === 0 && (data.recentClicks ?? []).length === 0 && (data.inboundLeads ?? []).length === 0 && (
              <p style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: 24 }}>Keine heißen Leads im gewählten Zeitraum.</p>
            )}

            {/* Email opens */}
            {(data.hotLeads ?? []).map((lead: any, i: number) => (
              <div key={`open-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0A0A0A', borderRadius: 8, border: '1px solid #1E1E1E' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#22C55E20', color: '#22C55E', fontWeight: 600, whiteSpace: 'nowrap' }}>Email geöffnet</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.first_name} {lead.last_name} {lead.company && <span style={{ color: '#888', fontWeight: 400 }}>· {lead.company}</span>}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>
                    Step {lead.step_number} · {SECTOR_LABELS[lead.sequence_type] || lead.sequence_type} · {timeAgo(lead.opened_at)}
                  </p>
                </div>
                {lead.lead_score > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: lead.lead_score >= 60 ? CORAL : lead.lead_score >= 30 ? '#EAB308' : '#3B82F6', whiteSpace: 'nowrap' }}>
                    {lead.lead_score} Pkt.
                  </span>
                )}
              </div>
            ))}

            {/* Website clicks */}
            {(data.recentClicks ?? []).filter((c: any) => c.lead_id).map((click: any, i: number) => (
              <div key={`click-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0A0A0A', borderRadius: 8, border: '1px solid #1E1E1E' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#3B82F620', color: '#3B82F6', fontWeight: 600, whiteSpace: 'nowrap' }}>Website Klick</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {click.first_name || 'Besucher'} {click.last_name || ''} {click.company && <span style={{ color: '#888', fontWeight: 400 }}>· {click.company}</span>}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>
                    {click.button_text || click.page} · {timeAgo(click.clicked_at)}
                  </p>
                </div>
              </div>
            ))}

            {/* Inbound */}
            {(data.inboundLeads ?? []).slice(0, 5).map((lead: any, i: number) => (
              <div key={`inbound-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0A0A0A', borderRadius: 8, border: '1px solid #1E1E1E' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#EAB30820', color: '#EAB308', fontWeight: 600, whiteSpace: 'nowrap' }}>Neue Anfrage</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', margin: 0 }}>
                    {lead.first_name || lead.email} {lead.last_name || ''} {lead.company && <span style={{ color: '#888', fontWeight: 400 }}>· {lead.company}</span>}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>{lead.source || 'Website'} · {timeAgo(lead.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: This Week */}
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F5', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📅</span> Diese Woche
          </h2>

          {/* Meetings */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Meetings</p>
            {(data.meetings ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: '#555' }}>Keine Meetings geplant.</p>
            ) : (data.meetings ?? []).slice(0, 4).map((m: any, i: number) => (
              <div key={i} style={{ padding: '8px 12px', background: '#0A0A0A', borderRadius: 8, border: '1px solid #1E1E1E', marginBottom: 6 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', margin: 0 }}>
                  {m.first_name} {m.last_name} <span style={{ color: '#888', fontWeight: 400 }}>· {m.company || SECTOR_LABELS[m.sequence_type] || ''}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Sequence Progress */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Sequenz-Fortschritt</p>
            {Object.entries(seqMap).map(([sector, steps]) => {
              const total = Object.values(steps).reduce((a, b) => a + b, 0);
              return (
                <div key={sector} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: SECTOR_COLORS[sector] || '#888', fontWeight: 600 }}>{SECTOR_LABELS[sector] || sector}</span>
                    <span style={{ color: '#555' }}>{total} aktiv</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2, height: 6 }}>
                    {Object.entries(steps).map(([step, count]) => (
                      <div key={step} style={{ flex: count, background: SECTOR_COLORS[sector] || '#555', borderRadius: 3, opacity: 0.4 + (Number(step) * 0.15) }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* LinkedIn Tasks */}
          {(data.linkedinTasks ?? []).length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>LinkedIn-Aufgaben</p>
              {(data.linkedinTasks ?? []).slice(0, 3).map((task: any, i: number) => (
                <div key={i} style={{ padding: '6px 12px', background: '#0A0A0A', borderRadius: 8, border: '1px solid #1E1E1E', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#F0F0F5' }}>{task.first_name} {task.last_name}</span>
                  <span style={{ fontSize: 11, color: '#555' }}>· {task.company}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── SECTION 4: Performance Charts ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="charts-grid">
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Email-Performance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.emailPerformance}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CORAL} stopOpacity={0.3}/><stop offset="100%" stopColor={CORAL} stopOpacity={0}/></linearGradient>
                <linearGradient id="gOpened" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="week" tick={AXIS_TICK} axisLine={{ stroke: '#333' }} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}.${d.getMonth()+1}.`; }} />
              <YAxis tick={AXIS_TICK} axisLine={{ stroke: '#333' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="sent" stroke={CORAL} fill="url(#gSent)" strokeWidth={2} name="Gesendet" />
              <Area type="monotone" dataKey="opened" stroke="#3B82F6" fill="url(#gOpened)" strokeWidth={2} name="Geöffnet" />
              <Area type="monotone" dataKey="replied" stroke="#22C55E" fill="transparent" strokeWidth={2} name="Beantwortet" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Leads nach Branche</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.sectorBreakdown ?? []} dataKey="count" nameKey="sector" cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                label={({ name, value }: any) => `${SECTOR_LABELS[name] || name}: ${value}`} labelLine={false}>
                {(data.sectorBreakdown ?? []).map((entry: any, i: number) => (
                  <Cell key={i} fill={SECTOR_COLORS[entry.sector] || '#555'} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: any) => [`${v}`, SECTOR_LABELS[name] || name]} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── SECTION 5: Conversion Funnel ──────────────────────────────── */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Conversion-Funnel</h3>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {([
            { label: 'Leads', value: data.funnel.totalLeads },
            { label: 'Kontaktiert', value: data.funnel.contacted },
            { label: 'Geöffnet', value: data.funnel.opened },
            { label: 'Beantwortet', value: data.funnel.replied },
            { label: 'Meeting', value: data.funnel.meetings },
          ]).map((stage, i, arr) => {
            const maxVal = arr[0].value || 1;
            const width = Math.max(20, (stage.value / maxVal) * 100);
            const convRate = i > 0 && arr[i-1].value > 0 ? Math.round((stage.value / arr[i-1].value) * 100) : null;
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                {convRate !== null && <p style={{ fontSize: 10, color: '#555', margin: '0 0 4px' }}>{convRate}%</p>}
                <div style={{ height: 36, background: `${CORAL}${Math.round(20 + (80 - i * 15)).toString(16)}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${width}%`, margin: '0 auto', minWidth: 40 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{stage.value}</span>
                </div>
                <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{stage.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 6: Activity Feed ──────────────────────────────────── */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          Letzte Aktivitäten
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
          {(data.activity ?? []).length === 0 && (
            <p style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: 16 }}>Keine Aktivitäten im gewählten Zeitraum.</p>
          )}
          {(data.activity ?? []).map((item: any, i: number) => {
            const config = ACTIVITY_CONFIG[item.type] || { label: item.type, color: '#888', bg: '#88888820' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: config.bg, color: config.color, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {config.label}
                </span>
                <p style={{ fontSize: 13, color: '#ccc', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600, color: '#F0F0F5' }}>{item.first_name} {item.last_name}</span>
                  {item.company && <span style={{ color: '#888' }}> · {item.company}</span>}
                  {item.detail && <span style={{ color: '#555' }}> · {SECTOR_LABELS[item.detail] || item.detail}</span>}
                </p>
                <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <style>{`
        @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .action-grid, .charts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <ManagerWidget />
    </div>
  );
}
