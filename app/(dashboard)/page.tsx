'use client';

import { useState, useEffect, useCallback } from 'react';

type Period = 'week' | 'month' | 'all';

interface Analytics {
  totalLeads: number;
  activeSequences: number;
  emailsSent: number;
  openRate: number;
  replyRate: number;
  meetingsBooked: number;
  calls_total: number;
  calls_reached: number;
  calls_not_reached: number;
  calls_voicemail: number;
  calls_appointment: number;
  manual_stops: number;
  linkedin_connections: number;
  linkedin_requests?: number;
  linkedin_connected?: number;
  linkedin_messages?: number;
  conversion_rate: number;
  bySector: {
    sector: string;
    leads: number;
    active: number;
    emails: number;
  }[];
  website_clicks?: {
    today: number;
    this_week: number;
    this_month: number;
    top_buttons: { button_id: string; button_text: string; count: number }[];
    by_day: { date: string; count: number }[];
    recent: any[];
  };
  inbound_leads?: number;
  outbound_leads?: number;
  hot_leads?: { id: number; first_name: string; last_name: string; company: string; lead_score: number; sequence_type: string }[];
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Diese Woche',
  month: 'Letzter Monat',
  all: 'Gesamt',
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-16" />
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setAnalytics(data);
    } catch {
      setError('Analysedaten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const kpiCards = analytics
    ? [
        { label: 'Inbound Leads', value: analytics.inbound_leads ?? 0, color: 'text-purple-700' },
        { label: 'Outbound Leads', value: analytics.outbound_leads ?? 0, color: 'text-[#1E3A5F]' },
        { label: 'Aktive Sequenzen', value: analytics.activeSequences, color: 'text-[#1E3A5F]' },
        { label: 'E-Mails gesendet', value: analytics.emailsSent, color: 'text-[#1E3A5F]' },
        {
          label: 'Öffnungsrate',
          value: `${(analytics.openRate * 100).toFixed(1)}%`,
          color: 'text-[#1E3A5F]',
        },
        {
          label: 'Antwortrate',
          value: `${(analytics.replyRate * 100).toFixed(1)}%`,
          color: 'text-[#1E3A5F]',
        },
        { label: 'Termine gebucht', value: analytics.meetingsBooked, color: 'text-[#1E3A5F]' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Period tabs */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === p
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* KPI Grid */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`ext-${i}`} />
            ))}
          </div>
        </div>
      ) : (
        analytics && (
          <>
            {/* Primary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color ?? 'text-[#1E3A5F]'}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Website-Aktivität */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1E3A5F]">Website-Aktivität</h3>
                <a
                  href="/website-clicks"
                  className="text-sm font-medium text-[#2563EB] hover:underline"
                >
                  Alle Klicks ansehen &rarr;
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Heute</p>
                  <p className="text-xl font-bold text-[#2563EB]">
                    {analytics.website_clicks?.today ?? 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">7 Tage</p>
                  <p className="text-xl font-bold text-[#2563EB]">
                    {analytics.website_clicks?.this_week ?? 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">30 Tage</p>
                  <p className="text-xl font-bold text-[#2563EB]">
                    {analytics.website_clicks?.this_month ?? 0}
                  </p>
                </div>
              </div>
              {analytics.website_clicks?.top_buttons && analytics.website_clicks.top_buttons.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-[#1E3A5F] mb-3">Top Buttons</h4>
                  <ul className="space-y-2">
                    {analytics.website_clicks.top_buttons.slice(0, 5).map((btn) => (
                      <li key={btn.button_id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{btn.button_text}</span>
                        <span className="font-medium text-[#2563EB]">{btn.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Hot Leads */}
            {analytics.hot_leads && analytics.hot_leads.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-3">Hot Leads (Score &gt; 30)</h3>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Firma</th>
                        <th className="text-left p-3">Sequenz</th>
                        <th className="text-left p-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.hot_leads.map(lead => (
                        <tr key={lead.id} className="border-t border-gray-100">
                          <td className="p-3 font-medium">{lead.first_name} {lead.last_name}</td>
                          <td className="p-3 text-gray-600">{lead.company}</td>
                          <td className="p-3 text-gray-500">{lead.sequence_type}</td>
                          <td className="p-3"><span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">{lead.lead_score}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Extended KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Telefonkontakte */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Telefonkontakte</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {analytics.calls_total ?? 0}
                </p>
                <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                  <p>Erreicht: {analytics.calls_reached ?? 0}</p>
                  <p>Nicht erreicht: {analytics.calls_not_reached ?? 0}</p>
                  <p>Voicemail: {analytics.calls_voicemail ?? 0}</p>
                  <p>Termin: {analytics.calls_appointment ?? 0}</p>
                </div>
              </div>

              {/* Manuelle Stops */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Manuelle Stops</p>
                <p className="text-2xl font-bold text-amber-600">
                  {analytics.manual_stops ?? 0}
                </p>
              </div>

              {/* LinkedIn Vernetzungen */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">LinkedIn Anfragen</p>
                <p className="text-2xl font-bold text-sky-600">
                  {analytics.linkedin_requests ?? 0}
                </p>
                <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                  <p>Anfragen: {analytics.linkedin_requests ?? 0} | Verbunden: {analytics.linkedin_connected ?? 0} | Nachrichten: {analytics.linkedin_messages ?? 0}</p>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {analytics.conversion_rate != null
                    ? `${(analytics.conversion_rate * 100).toFixed(1)}%`
                    : '0.0%'}
                </p>
              </div>
            </div>

            {/* Sector breakdown */}
            {analytics.bySector && analytics.bySector.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">
                  Nach Sektor
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-2 font-medium text-gray-500">Sektor</th>
                        <th className="pb-2 font-medium text-gray-500 text-right">Leads</th>
                        <th className="pb-2 font-medium text-gray-500 text-right">Aktiv</th>
                        <th className="pb-2 font-medium text-gray-500 text-right">E-Mails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.bySector.map((row) => (
                        <tr key={row.sector} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 font-medium text-gray-900">{row.sector}</td>
                          <td className="py-2 text-right text-gray-700">{row.leads}</td>
                          <td className="py-2 text-right text-gray-700">{row.active}</td>
                          <td className="py-2 text-right text-gray-700">{row.emails}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
