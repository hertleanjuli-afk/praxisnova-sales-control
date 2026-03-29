'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Period = 'week' | 'month' | 'all';

interface Analytics {
  totalLeads: number; activeSequences: number; emailsSent: number; emails_failed: number;
  unsubscribes: number; openRate: number; failRate: number; replyRate: number;
  meetingsBooked: number; calls_total: number; calls_reached: number; calls_not_reached: number;
  calls_voicemail: number; calls_appointment: number; manual_stops: number;
  linkedin_connections: number; linkedin_requests?: number; linkedin_connected?: number;
  linkedin_messages?: number; linkedin_replies?: number; linkedin_meetings?: number;
  linkedin_no_profile?: number;
  linkedin_by_sector?: { sector: string; requests: number; connected: number; messages: number; replied: number; meetings: number; no_linkedin: number }[];
  conversion_rate: number;
  by_sector: Record<string, { leads: number; sent: number; failed: number; unsubscribes: number; replies: number }>;
  active_per_sector?: Record<string, number>;
  website_clicks?: {
    today: number; this_week: number; this_month: number;
    top_buttons: { button_id: string; button_text: string; count: number }[];
    by_day: { date: string; count: number }[];
    recent: any[];
  };
  inbound_leads?: number; outbound_leads?: number;
  hot_leads?: { id: number; first_name: string; last_name: string; company: string; lead_score: number; sequence_type: string }[];
  lead_engagement?: { recent_opens: any[]; recent_clicks: any[] };
  unsubscribed_leads?: { id: number; email: string; company: string | null; unsubscribed_at: string; sequence_type: string | null }[];
  leads_per_step?: Record<string, Record<number, number>>;
  leads_added?: { today: number; this_week: number; last_week: number; this_month: number };
}

const PERIOD_LABELS: Record<Period, string> = { week: 'Woche', month: 'Monat', all: 'Gesamt' };
const SECTOR_LABELS: Record<string, string> = { immobilien: 'Immobilien', handwerk: 'Handwerk', bauunternehmen: 'Bau', inbound: 'Inbound', allgemein: 'Allgemein' };
const SECTOR_COLORS: Record<string, string> = { immobilien: '#E8472A', handwerk: '#3B82F6', bauunternehmen: '#22C55E', inbound: '#EAB308', allgemein: '#8B5CF6' };

const TOOLTIP_STYLE = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' };
const AXIS_TICK = { fill: '#888', fontSize: 12 };
const AXIS_LINE = { stroke: '#333' };
const GRID_PROPS = { stroke: '#222', strokeDasharray: '3 3' } as const;

function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const steps = 40;
    const inc = value / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(decimals > 0 ? parseFloat(start.toFixed(decimals)) : Math.round(start));
    }, 30);
    return () => clearInterval(timer);
  }, [value, decimals]);
  return <span>{display.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 24, ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', marginBottom: 16 }}>{children}</h3>;
}

function SkeletonCard() {
  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 24 }}>
      <div style={{ height: 12, width: 80, background: '#222', borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 32, width: 60, background: '#222', borderRadius: 4 }} />
    </div>
  );
}

function SkeletonRow({ count }: { count: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch {
      setError('Analysedaten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
    const interval = setInterval(() => fetchAnalytics(period), 60000);
    return () => clearInterval(interval);
  }, [period, fetchAnalytics]);

  const a = analytics;

  // Funnel calculations
  const funnelOpened = a ? Math.round((a.emailsSent ?? 0) * (a.openRate ?? 0) / 100) : 0;
  const funnelReplied = a ? Math.round((a.emailsSent ?? 0) * (a.replyRate ?? 0) / 100) : 0;

  // Sector chart data
  const sectorChartData = a
    ? Object.entries(a.by_sector || {}).map(([key, val]) => ({
        sector: SECTOR_LABELS[key] || key,
        leads: val.leads,
        sent: val.sent,
        replies: val.replies,
        color: SECTOR_COLORS[key] || '#888',
      }))
    : [];

  // Calls donut data
  const callsData = a
    ? [
        { name: 'Erreicht', value: a.calls_reached ?? 0, color: '#22C55E' },
        { name: 'Nicht erreicht', value: a.calls_not_reached ?? 0, color: '#EF4444' },
        { name: 'Mailbox', value: a.calls_voicemail ?? 0, color: '#EAB308' },
        { name: 'Termin', value: a.calls_appointment ?? 0, color: '#E8472A' },
      ].filter(d => d.value > 0)
    : [];

  // Funnel data
  const funnelStages = a
    ? [
        { label: 'Leads', value: a.totalLeads ?? 0 },
        { label: 'Gesendet', value: a.emailsSent ?? 0 },
        { label: 'Ge\u00f6ffnet', value: funnelOpened },
        { label: 'Geantwortet', value: funnelReplied },
        { label: 'Termin', value: a.meetingsBooked ?? 0 },
      ]
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F5', padding: '24px 24px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>Dashboard</h1>
          {lastUpdated && (
            <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString('de-DE')}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 0, background: '#1a1a1a', borderRadius: 8, overflow: 'hidden', border: '1px solid #1E1E1E' }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: period === p ? '#E8472A' : 'transparent',
                color: period === p ? '#fff' : '#888',
                transition: 'all 0.2s',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#2a1515', border: '1px solid #E8472A', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <p style={{ color: '#E8472A', fontSize: 14, margin: 0 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SkeletonRow count={5} />
          <SkeletonRow count={2} />
          <SkeletonRow count={2} />
        </div>
      ) : a && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Row 1: Hero KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {[
              { label: 'Inbound Leads', value: a.inbound_leads ?? 0, color: '#22C55E' },
              { label: 'Outbound Leads', value: a.outbound_leads ?? 0, color: '#3B82F6' },
              { label: 'E-Mails gesendet', value: a.emailsSent ?? 0, color: '#E8472A' },
              { label: '\u00d6ffnungsrate', value: a.openRate ?? 0, color: '#EAB308', suffix: '%', decimals: 1 },
              { label: 'Meetings gebucht', value: a.meetingsBooked ?? 0, color: '#22C55E' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  background: '#111',
                  border: '1px solid #1E1E1E',
                  borderTop: `3px solid ${kpi.color}`,
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <p style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</p>
                <p style={{ fontSize: 32, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
                  <AnimatedNumber value={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals} />
                </p>
              </div>
            ))}
          </div>

          {/* Row 2: Website Activity + Hot Leads */}
          <div style={{ display: 'grid', gridTemplateColumns: '55fr 45fr', gap: 16 }}>
            {/* Website-Aktivit\u00e4t */}
            <Card>
              <CardTitle>Website-Aktivit\u00e4t</CardTitle>
              {/* Mini stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Heute', value: a.website_clicks?.today ?? 0 },
                  { label: 'Diese Woche', value: a.website_clicks?.this_week ?? 0 },
                  { label: 'Dieser Monat', value: a.website_clicks?.this_month ?? 0 },
                ].map((s) => (
                  <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 700, color: '#E8472A', margin: 0 }}>
                      <AnimatedNumber value={s.value} />
                    </p>
                    <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Area Chart */}
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={a.website_clicks?.by_day ?? []}>
                  <defs>
                    <linearGradient id="coralGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8472A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E8472A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" tick={AXIS_TICK} axisLine={AXIS_LINE} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}.${d.getMonth() + 1}.`; }} />
                  <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => new Date(v).toLocaleDateString('de-DE')} />
                  <Area type="monotone" dataKey="count" stroke="#E8472A" strokeWidth={2} fill="url(#coralGradient)" name="Klicks" />
                </AreaChart>
              </ResponsiveContainer>
              {/* Top buttons */}
              {(a.website_clicks?.top_buttons?.length ?? 0) > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Top Buttons</p>
                  {a.website_clicks!.top_buttons.slice(0, 5).map((btn, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1E1E1E' }}>
                      <span style={{ fontSize: 13, color: '#ccc' }}>{btn.button_text || btn.button_id}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#E8472A' }}>{btn.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Hot Leads */}
            <Card>
              <CardTitle>Hot Leads</CardTitle>
              {(() => {
                const leads = (a.hot_leads ?? []).filter(l => l.lead_score > 0).sort((x, y) => y.lead_score - x.lead_score);
                if (leads.length === 0) {
                  return <p style={{ color: '#555', fontSize: 14 }}>Keine Hot Leads vorhanden.</p>;
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {leads.map((lead) => {
                      const score = lead.lead_score;
                      let badgeLabel = 'K\u00fchl';
                      let badgeBg = '#1e3a5f';
                      let badgeColor = '#3B82F6';
                      if (score >= 60) { badgeLabel = 'Hei\u00df'; badgeBg = '#3a1515'; badgeColor = '#E8472A'; }
                      else if (score >= 30) { badgeLabel = 'Warm'; badgeBg = '#3a3515'; badgeColor = '#EAB308'; }
                      return (
                        <div key={lead.id} style={{ background: '#1a1a1a', borderRadius: 8, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F5' }}>{lead.first_name} {lead.last_name}</span>
                              {lead.company && <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{lead.company}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#222', color: '#888' }}>{lead.sequence_type}</span>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: badgeBg, color: badgeColor, fontWeight: 600 }}>{badgeLabel}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, score)}%`, height: '100%', background: '#E8472A', borderRadius: 3, transition: 'width 0.5s ease' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F5', minWidth: 28, textAlign: 'right' }}>{score}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
          </div>

          {/* Row 3: Sector Breakdown + Conversion Funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Nach Sektor */}
            <Card>
              <CardTitle>Nach Sektor</CardTitle>
              <ResponsiveContainer width="100%" height={Math.max(200, sectorChartData.length * 50)}>
                <BarChart data={sectorChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid {...GRID_PROPS} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={AXIS_LINE} allowDecimals={false} />
                  <YAxis type="category" dataKey="sector" tick={AXIS_TICK} axisLine={AXIS_LINE} width={90} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: any, name: any) => [value, name === 'leads' ? 'Leads' : name]} />
                  <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]}>
                    {sectorChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {sectorChartData.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sectorChartData.map((s) => (
                    <div key={s.sector} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', padding: '4px 0', borderBottom: '1px solid #1E1E1E' }}>
                      <span>{s.sector}</span>
                      <span>Gesendet: {s.sent} | Antworten: {s.replies}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Conversion-Trichter */}
            <Card>
              <CardTitle>Conversion-Trichter</CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {funnelStages.map((stage, i) => {
                  const maxVal = funnelStages[0]?.value || 1;
                  const widthPct = maxVal > 0 ? Math.max(8, (stage.value / maxVal) * 100) : 8;
                  const nextStage = funnelStages[i + 1];
                  const dropPct = nextStage && stage.value > 0
                    ? ((nextStage.value / stage.value) * 100).toFixed(1)
                    : null;
                  return (
                    <div key={stage.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#888', width: 80, textAlign: 'right' }}>{stage.label}</span>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div style={{
                            width: `${widthPct}%`,
                            height: 32,
                            background: `linear-gradient(90deg, #E8472A${i === 0 ? '' : Math.max(30, 100 - i * 20).toString(16)}, #E8472A${Math.max(20, 80 - i * 15).toString(16)})`,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'width 0.5s ease',
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{stage.value.toLocaleString('de-DE')}</span>
                          </div>
                        </div>
                      </div>
                      {dropPct && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <span style={{ width: 80 }} />
                          <span style={{ fontSize: 11, color: '#555', paddingLeft: 8 }}>{dropPct}% &#x2192;</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Row 4: LinkedIn + Anrufe */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* LinkedIn-Aktivit\u00e4t */}
            <Card>
              <CardTitle>LinkedIn-Aktivit\u00e4t</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Anfragen', value: a.linkedin_requests ?? 0, color: '#3B82F6' },
                  { label: 'Vernetzt', value: a.linkedin_connected ?? 0, color: '#22C55E' },
                  { label: 'Nachrichten', value: a.linkedin_messages ?? 0, color: '#8B5CF6' },
                  { label: 'Antworten', value: a.linkedin_replies ?? 0, color: '#EAB308' },
                ].map((s) => (
                  <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: s.color, margin: 0 }}>
                      <AnimatedNumber value={s.value} />
                    </p>
                    <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Meetings via LinkedIn</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E', margin: 0 }}>
                  <AnimatedNumber value={a.linkedin_meetings ?? 0} />
                </p>
              </div>
            </Card>

            {/* Telefonkontakte */}
            <Card>
              <CardTitle>Telefonkontakte</CardTitle>
              {(a.calls_total ?? 0) === 0 ? (
                <p style={{ color: '#555', fontSize: 14 }}>Keine Anrufdaten vorhanden.</p>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={callsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {callsData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center text */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <p style={{ fontSize: 28, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>{a.calls_total ?? 0}</p>
                      <p style={{ fontSize: 11, color: '#888' }}>Gesamt</p>
                    </div>
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    {callsData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                        <span style={{ fontSize: 12, color: '#888' }}>{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Row 5: Leads Hinzugef\u00fcgt + Abmeldungen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Leads hinzugef\u00fcgt */}
            <Card>
              <CardTitle>Leads hinzugef\u00fcgt</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { label: 'Heute', value: a.leads_added?.today ?? 0 },
                  { label: 'Diese Woche', value: a.leads_added?.this_week ?? 0 },
                  { label: 'Letzte Woche', value: a.leads_added?.last_week ?? 0 },
                  { label: 'Dieser Monat', value: a.leads_added?.this_month ?? 0 },
                ].map((s) => (
                  <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
                      <AnimatedNumber value={s.value} />
                    </p>
                    <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Abmeldungen */}
            <Card>
              <CardTitle>Abmeldungen</CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#3a1515', borderRadius: 8, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#E8472A' }}>
                    <AnimatedNumber value={a.unsubscribes ?? 0} />
                  </span>
                  <span style={{ fontSize: 12, color: '#E8472A' }}>Abmeldungen</span>
                </div>
              </div>
              {(a.unsubscribed_leads?.length ?? 0) > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {a.unsubscribed_leads!.slice(0, 5).map((lead) => (
                    <div key={lead.id} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 13, color: '#ccc' }}>{lead.email}</span>
                        {lead.company && <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>{lead.company}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: '#555' }}>
                        {lead.unsubscribed_at ? new Date(lead.unsubscribed_at).toLocaleDateString('de-DE') : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#555', fontSize: 13 }}>Keine Abmeldungen in diesem Zeitraum.</p>
              )}
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
