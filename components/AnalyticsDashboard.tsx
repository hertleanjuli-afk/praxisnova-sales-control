'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsDashboardProps {
  data: any;
  period: string;
  onPeriodChange: (period: string) => void;
}

const PERIODS = [
  { key: 'week', label: 'Diese Woche' },
  { key: 'month', label: 'Letzter Monat' },
  { key: 'all', label: 'Gesamt' },
];

const KPI_CARDS = [
  { key: 'leads_contacted', label: 'Leads kontaktiert', color: 'text-blue-600', bg: 'bg-blue-50', icon: UsersIcon },
  { key: 'emails_sent', label: 'E-Mails versendet', color: 'text-green-600', bg: 'bg-green-50', icon: MailIcon },
  { key: 'failed', label: 'Fehlgeschlagen', color: 'text-red-600', bg: 'bg-red-50', icon: AlertIcon },
  { key: 'unsubscribes', label: 'Abmeldungen', color: 'text-orange-600', bg: 'bg-orange-50', icon: UnsubIcon },
  { key: 'replies', label: 'Antworten', color: 'text-purple-600', bg: 'bg-purple-50', icon: ReplyIcon },
];

function UsersIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function UnsubIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-8.25 6a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM4.5 19.5h15a2.25 2.25 0 002.25-2.25v-10.5A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

export default function AnalyticsDashboard({ data, period, onPeriodChange }: AnalyticsDashboardProps) {
  const kpis = data?.kpis ?? {};
  const chartData = data?.chart ?? [];

  return (
    <div className="space-y-6">
      {/* Period tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodChange(p.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              period === p.key
                ? 'bg-white text-[#1E3A5F] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {KPI_CARDS.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.key}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center text-center"
            >
              <div className={`${card.bg} rounded-full p-3 mb-2`}>
                <div className={card.color}>
                  <IconComponent />
                </div>
              </div>
              <span className={`text-2xl font-bold ${card.color}`}>
                {kpis[card.key] ?? 0}
              </span>
              <span className="text-xs text-gray-500 mt-1">{card.label}</span>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-[#1E3A5F] mb-4">Vergleich nach Sektor</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="sector" tick={{ fontSize: 12, fill: '#374151' }} />
            <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            />
            <Legend />
            <Bar dataKey="gesendet" name="Gesendet" fill="#2563EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fehlgeschlagen" name="Fehlgeschlagen" fill="#DC2626" radius={[4, 4, 0, 0]} />
            <Bar dataKey="antworten" name="Antworten" fill="#16A34A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
