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
  bySector: {
    sector: string;
    leads: number;
    active: number;
    emails: number;
  }[];
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
        { label: 'Leads gesamt', value: analytics.totalLeads },
        { label: 'Aktive Sequenzen', value: analytics.activeSequences },
        { label: 'E-Mails gesendet', value: analytics.emailsSent },
        {
          label: 'Öffnungsrate',
          value: `${(analytics.openRate * 100).toFixed(1)}%`,
        },
        {
          label: 'Antwortrate',
          value: `${(analytics.replyRate * 100).toFixed(1)}%`,
        },
        { label: 'Termine gebucht', value: analytics.meetingsBooked },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        analytics && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-[#1E3A5F]">
                    {card.value}
                  </p>
                </div>
              ))}
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
