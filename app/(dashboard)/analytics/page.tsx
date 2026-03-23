'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';

type Range = 'week' | 'month' | 'quarter' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  week: 'Diese Woche',
  month: 'Letzter Monat',
  quarter: 'Letztes Quartal',
  all: 'Gesamt',
};

const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#2563EB',
  handwerk: '#10B981',
  bauunternehmen: '#F59E0B',
  allgemein: '#8B5CF6',
  inbound: '#EC4899',
  unbekannt: '#6B7280',
};

const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien',
  handwerk: 'Handwerk',
  bauunternehmen: 'Bau',
  allgemein: 'Allgemein',
  inbound: 'Inbound',
  unbekannt: 'Unbekannt',
};

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const FUNNEL_COLORS = ['#1E3A5F', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-48 bg-gray-100 rounded" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('week');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/performance?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const comparisonData = data
    ? [
        {
          metric: 'Gesendet',
          'Diese Woche': data.comparison.this_week.sent,
          'Letzte Woche': data.comparison.last_week.sent,
          'Durchschnitt': data.comparison.average.sent,
        },
        {
          metric: 'Ge\u00f6ffnet',
          'Diese Woche': data.comparison.this_week.opened,
          'Letzte Woche': data.comparison.last_week.opened,
          'Durchschnitt': data.comparison.average.opened,
        },
        {
          metric: 'Geantwortet',
          'Diese Woche': data.comparison.this_week.replied,
          'Letzte Woche': data.comparison.last_week.replied,
          'Durchschnitt': data.comparison.average.replied,
        },
        {
          metric: 'Meetings',
          'Diese Woche': data.comparison.this_week.meetings,
          'Letzte Woche': data.comparison.last_week.meetings,
          'Durchschnitt': data.comparison.average.meetings,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Analytics Dashboard</h1>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-white text-[#1E3A5F] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* a) E-Mails gesendet pro Woche */}
          <Card title="E-Mails gesendet pro Woche">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.weekly_emails}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tickFormatter={formatWeek} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  labelFormatter={(v) => `KW ${formatWeek(v as string)}`}
                  formatter={(v) => [v, 'E-Mails']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ fill: '#2563EB', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* b) Offnungsrate pro Sektor */}
          <Card title={"Öffnungsrate pro Sektor"}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.open_rate_by_sector}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="sector"
                  tickFormatter={(v) => SECTOR_LABELS[v] || v}
                  fontSize={12}
                />
                <YAxis fontSize={12} unit="%" />
                <Tooltip
                  labelFormatter={(v) => SECTOR_LABELS[v as string] || v}
                  formatter={(v) => [`${v}%`, 'Öffnungsrate']}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {data.open_rate_by_sector.map((entry, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[entry.sector] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* c) Conversion Funnel */}
          <Card title="Conversion Funnel">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.funnel} layout="vertical" barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="stage" fontSize={12} width={90} />
                <Tooltip formatter={(v) => [v, 'Leads']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.funnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* d) LinkedIn Aktivitat pro Woche */}
          <Card title={"LinkedIn Aktivität pro Woche"}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.linkedin_weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tickFormatter={formatWeek} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  labelFormatter={(v) => `KW ${formatWeek(v as string)}`}
                  formatter={(v) => [v, 'Anfragen']}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#0A66C2"
                  strokeWidth={2}
                  dot={{ fill: '#0A66C2', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* e) Leads nach Sektor */}
          <Card title="Leads nach Sektor">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.leads_by_sector}
                  dataKey="count"
                  nameKey="sector"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }: any) =>
                    `${SECTOR_LABELS[name] || name}: ${value}`
                  }
                  labelLine={{ stroke: '#d1d5db' }}
                  fontSize={12}
                >
                  {data.leads_by_sector.map((entry, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[entry.sector] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [v, SECTOR_LABELS[name as string] || name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* f) Meetings gebucht pro Woche */}
          <Card title="Meetings gebucht pro Woche">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.meetings_weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tickFormatter={formatWeek} fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => `KW ${formatWeek(v as string)}`}
                  formatter={(v) => [v, 'Meetings']}
                />
                <Bar dataKey="count" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* g) Beste Offnungsrate nach Wochentag */}
          <Card title={"Beste Öffnungsrate nach Wochentag"}>
            <div className="grid grid-cols-7 gap-2 h-[220px] items-end pt-6">
              {DAY_LABELS.map((label, i) => {
                const dayData = data.open_rate_by_day.find(
                  (d) => d.day_of_week === i
                );
                const rate = dayData?.rate || 0;
                const maxRate = Math.max(
                  ...data.open_rate_by_day.map((d) => d.rate),
                  1
                );
                const intensity = maxRate > 0 ? rate / maxRate : 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="text-xs font-medium text-gray-500">{rate}%</div>
                    <div
                      className="w-full rounded-md flex-1 min-h-[20px] transition-all"
                      style={{
                        backgroundColor: `rgba(37, 99, 235, ${0.15 + intensity * 0.85})`,
                        maxHeight: `${Math.max(20, intensity * 160)}px`,
                      }}
                      title={`${label}: ${rate}% (${dayData?.opened || 0}/${dayData?.sent || 0})`}
                    />
                    <div className="text-xs font-semibold text-gray-700">{label}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* h) Wochenvergleich */}
          <Card title="Wochenvergleich">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metric" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend fontSize={12} />
                <Bar dataKey="Diese Woche" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Letzte Woche" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Durchschnitt" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Keine Daten verfügbar.
        </div>
      )}
    </div>
  );
}
