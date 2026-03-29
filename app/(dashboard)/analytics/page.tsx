'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type Range = 'week' | 'month' | 'quarter' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  week: 'Woche',
  month: 'Monat',
  quarter: 'Quartal',
  all: 'Gesamt',
};

const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien',
  handwerk: 'Handwerk',
  bauunternehmen: 'Bau',
  inbound: 'Inbound',
  allgemein: 'Allgemein',
};

const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A',
  handwerk: '#3B82F6',
  bauunternehmen: '#22C55E',
  inbound: '#EAB308',
  allgemein: '#8B5CF6',
};

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface PerformanceData {
  weekly_emails: { week: string; count: number }[];
  open_rate_by_sector: { sector: string; sent: number; opened: number; rate: number }[];
  funnel: { stage: string; count: number }[];
  linkedin_weekly: { week: string; requests: number }[];
  leads_by_sector: { sector: string; count: number }[];
  meetings_weekly: { week: string; count: number }[];
  open_rate_by_day: { day_of_week: number; sent: number; opened: number; rate: number }[];
  comparison: {
    this_week: { sent: number; opened: number; replied: number; meetings: number };
    last_week: { sent: number; opened: number; replied: number; meetings: number };
    average: { sent: number; opened: number; replied: number; meetings: number };
  };
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const steps = 40;
    const increment = value / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString('de-DE')}{suffix}</span>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', marginBottom: 20 }}>{title}</h3>
      {children}
    </div>
  );
}

function SkeletonCard({ tall = false }: { tall?: boolean }) {
  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #1E1E1E',
        borderRadius: 12,
        padding: 24,
        minHeight: tall ? 340 : 120,
      }}
    >
      <div
        style={{
          height: 14,
          background: '#1E1E1E',
          borderRadius: 6,
          width: '35%',
          marginBottom: 20,
        }}
      />
      <div
        style={{
          height: tall ? 240 : 60,
          background: '#1A1A1A',
          borderRadius: 8,
        }}
      />
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#fff',
  },
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('week');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/analytics/performance?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
      console.error('Fehler beim Laden der Analytics-Daten');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived data
  const totalEmails = data?.weekly_emails.reduce((s, w) => s + w.count, 0) ?? 0;
  const totalMeetings = data?.meetings_weekly.reduce((s, w) => s + w.count, 0) ?? 0;
  const totalLeads = data?.leads_by_sector.reduce((s, l) => s + l.count, 0) ?? 0;
  const openRate = data
    ? data.comparison.this_week.sent > 0
      ? Math.round((data.comparison.this_week.opened / data.comparison.this_week.sent) * 100)
      : 0
    : 0;
  const replyRate = data
    ? data.comparison.this_week.sent > 0
      ? Math.round((data.comparison.this_week.replied / data.comparison.this_week.sent) * 100)
      : 0
    : 0;

  const comparisonData = data
    ? [
        {
          metric: 'Gesendet',
          'Diese Woche': data.comparison.this_week.sent,
          'Letzte Woche': data.comparison.last_week.sent,
          Durchschnitt: data.comparison.average.sent,
        },
        {
          metric: 'Geöffnet',
          'Diese Woche': data.comparison.this_week.opened,
          'Letzte Woche': data.comparison.last_week.opened,
          Durchschnitt: data.comparison.average.opened,
        },
        {
          metric: 'Geantwortet',
          'Diese Woche': data.comparison.this_week.replied,
          'Letzte Woche': data.comparison.last_week.replied,
          Durchschnitt: data.comparison.average.replied,
        },
        {
          metric: 'Meetings',
          'Diese Woche': data.comparison.this_week.meetings,
          'Letzte Woche': data.comparison.last_week.meetings,
          Durchschnitt: data.comparison.average.meetings,
        },
      ]
    : [];

  // Funnel conversion percentages
  const funnelWithConversion = data
    ? data.funnel.map((stage, i) => ({
        ...stage,
        conversion:
          i === 0
            ? 100
            : data.funnel[i - 1].count > 0
              ? Math.round((stage.count / data.funnel[i - 1].count) * 100)
              : 0,
      }))
    : [];

  const funnelMax = data ? Math.max(...data.funnel.map((f) => f.count), 1) : 1;

  const funnelColors = ['#E8472A', '#EC6B55', '#F08E7F', '#F4B1A9', '#F8D4D0'];

  // Open rate heatmap max
  const heatmapMax = data
    ? Math.max(...data.open_rate_by_day.map((d) => d.rate), 1)
    : 1;

  const kpiCards = [
    { label: 'Total E-Mails', value: totalEmails, color: '#E8472A', suffix: '' },
    { label: 'Öffnungsrate', value: openRate, color: '#3B82F6', suffix: '%' },
    { label: 'Antwortrate', value: replyRate, color: '#22C55E', suffix: '%' },
    { label: 'Meetings gebucht', value: totalMeetings, color: '#EAB308', suffix: '' },
    { label: 'Leads gesamt', value: totalLeads, color: '#8B5CF6', suffix: '' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '32px 24px' }}>
      {/* Header with range selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
          Analytics Dashboard
        </h1>
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: '#111',
            border: '1px solid #1E1E1E',
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
                background: range === r ? '#E8472A' : 'transparent',
                color: range === r ? '#fff' : '#888',
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
            <SkeletonCard tall />
            <SkeletonCard tall />
          </div>
          <SkeletonCard tall />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <SkeletonCard tall />
            <SkeletonCard tall />
          </div>
        </div>
      ) : error || !data ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            color: '#888',
            fontSize: 16,
          }}
        >
          Fehler beim Laden der Analytics-Daten. Bitte versuchen Sie es erneut.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ===== Hero KPI Section ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {kpiCards.map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  background: '#111',
                  border: '1px solid #1E1E1E',
                  borderRadius: 12,
                  padding: '0 24px 24px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: 3,
                    background: kpi.color,
                    borderRadius: '0 0 2px 2px',
                    marginBottom: 20,
                  }}
                />
                <div style={{ fontSize: 32, fontWeight: 700, color: '#F0F0F5', lineHeight: 1.2 }}>
                  <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
                </div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* ===== Row 1: Area Chart + Donut ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
            {/* E-Mail-Volumen */}
            <ChartCard title="E-Mail-Volumen">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.weekly_emails}>
                  <defs>
                    <linearGradient id="emailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8472A" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#E8472A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatWeek}
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <YAxis
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(v) => `KW ${formatWeek(v as string)}`}
                    formatter={(v) => [`${v}`, 'E-Mails']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#E8472A"
                    strokeWidth={2}
                    fill="url(#emailGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Leads nach Sektor – Donut */}
            <ChartCard title="Leads nach Sektor">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.leads_by_sector}
                    dataKey="count"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.leads_by_sector.map((entry, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[entry.sector] || '#555'} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v, name) => [`${v}`, SECTOR_LABELS[name as string] || name]}
                  />
                  {/* Center label */}
                  <text
                    x="50%"
                    y="48%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 28, fontWeight: 700, fill: '#F0F0F5' }}
                  >
                    {totalLeads}
                  </text>
                  <text
                    x="50%"
                    y="58%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 12, fill: '#888' }}
                  >
                    Gesamt
                  </text>
                </PieChart>
              </ResponsiveContainer>
              {/* Custom legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' }}>
                {data.leads_by_sector.map((entry) => (
                  <div key={entry.sector} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: SECTOR_COLORS[entry.sector] || '#555',
                      }}
                    />
                    <span style={{ fontSize: 12, color: '#888' }}>
                      {SECTOR_LABELS[entry.sector] || entry.sector}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* ===== Row 2: Conversion Funnel ===== */}
          <ChartCard title="Conversion-Funnel">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelWithConversion} layout="vertical" barSize={28}>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                  width={100}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, _name, props) => [
                    `${v} (${(props as any)?.payload?.conversion ?? 0}%)`,
                    'Leads',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {funnelWithConversion.map((entry, i) => {
                    const widthRatio = funnelMax > 0 ? entry.count / funnelMax : 0;
                    void widthRatio;
                    return <Cell key={i} fill={funnelColors[i] || funnelColors[0]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ===== Row 3: Stacked Bar + Heatmap ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Öffnungsrate nach Sektor */}
            <ChartCard title="Öffnungsrate nach Sektor">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.open_rate_by_sector}>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="sector"
                    tickFormatter={(v) => SECTOR_LABELS[v] || v}
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <YAxis
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(v) => SECTOR_LABELS[v as string] || v}
                    formatter={(v, name) => [
                      `${v}`,
                      name === 'sent' ? 'Gesendet' : 'Geöffnet',
                    ]}
                  />
                  <Bar dataKey="sent" radius={[4, 4, 0, 0]}>
                    {data.open_rate_by_sector.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={SECTOR_COLORS[entry.sector] || '#555'}
                        fillOpacity={0.25}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="opened" radius={[4, 4, 0, 0]}>
                    {data.open_rate_by_sector.map((entry, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[entry.sector] || '#555'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Beste E-Mail-Zeiten – Heatmap */}
            <ChartCard title="Beste E-Mail-Zeiten">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 8,
                  height: 280,
                  alignItems: 'center',
                }}
              >
                {DAY_LABELS.map((label, i) => {
                  const dayData = data.open_rate_by_day.find((d) => d.day_of_week === i);
                  const rate = dayData?.rate ?? 0;
                  const intensity = heatmapMax > 0 ? rate / heatmapMax : 0;
                  // Coral color with varying opacity based on intensity
                  const r = 232, g = 71, b = 42;
                  const bgR = Math.round(17 + (r - 17) * intensity);
                  const bgG = Math.round(17 + (g - 17) * intensity);
                  const bgB = Math.round(17 + (b - 17) * intensity);
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        height: '100%',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>{label}</div>
                      <div
                        style={{
                          width: '100%',
                          flex: 1,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `rgb(${bgR}, ${bgG}, ${bgB})`,
                          border: '1px solid #1E1E1E',
                          transition: 'background 0.3s',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: intensity > 0.4 ? '#fff' : '#888',
                          }}
                        >
                          {rate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          {/* ===== Row 4: LinkedIn + Meetings ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* LinkedIn-Aktivität */}
            <ChartCard title="LinkedIn-Aktivität">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.linkedin_weekly}>
                  <defs>
                    <linearGradient id="linkedinGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatWeek}
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <YAxis
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(v) => `KW ${formatWeek(v as string)}`}
                    formatter={(v) => [`${v}`, 'Anfragen']}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#linkedinGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Meetings pro Woche */}
            <ChartCard title="Meetings pro Woche">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.meetings_weekly}>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatWeek}
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <YAxis
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(v) => `KW ${formatWeek(v as string)}`}
                    formatter={(v) => [`${v}`, 'Meetings']}
                  />
                  <Bar dataKey="count" fill="#22C55E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ===== Row 5: Wochenvergleich ===== */}
          <ChartCard title="Diese Woche vs. Letzte Woche">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparisonData}>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                  allowDecimals={false}
                />
                <Tooltip {...tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#888' }}
                />
                <Bar dataKey="Diese Woche" fill="#E8472A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Letzte Woche" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Durchschnitt" fill="#555" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
