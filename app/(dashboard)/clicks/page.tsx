'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface ClickEntry {
  id?: number;
  button_id: string;
  button_text?: string;
  page_url: string;
  referrer?: string;
  visitor_id: string;
  lead_id?: number;
  lead_name?: string;
  created_at: string;
}

interface AnalyticsData {
  website_clicks?: {
    today: number;
    this_week: number;
    this_month: number;
    top_buttons: { button_id: string; button_text: string; count: number }[];
    by_day: { date: string; count: number }[];
    recent: ClickEntry[];
  };
}

type DateRange = 'today' | '7days' | '30days';

export default function ClicksPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [clicks, setClicks] = useState<ClickEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [buttonFilter, setButtonFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [analyticsRes, clicksRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch(`/api/webhooks/website-clicks?range=${dateRange}`),
      ]);
      if (!analyticsRes.ok) throw new Error('Analytics-Fehler');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      if (clicksRes.ok) {
        const clicksData = await clicksRes.json();
        setClicks(clicksData.clicks ?? clicksData ?? []);
      }
    } catch {
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive unique button IDs for filter dropdown
  const buttonIds = useMemo(() => {
    const ids = new Set<string>();
    clicks.forEach((c) => ids.add(c.button_id));
    return Array.from(ids).sort();
  }, [clicks]);

  // Filtered clicks
  const filteredClicks = useMemo(() => {
    if (buttonFilter === 'all') return clicks;
    return clicks.filter((c) => c.button_id === buttonFilter);
  }, [clicks, buttonFilter]);

  // Stats
  const totalClicks = filteredClicks.length;
  const uniqueVisitors = useMemo(() => {
    const ids = new Set(filteredClicks.map((c) => c.visitor_id));
    return ids.size;
  }, [filteredClicks]);
  const identifiedVisitors = useMemo(() => {
    return filteredClicks.filter((c) => c.lead_id).length;
  }, [filteredClicks]);

  // Top 5 buttons
  const topButtons = useMemo(() => {
    const counts: Record<string, { button_id: string; button_text: string; count: number }> = {};
    filteredClicks.forEach((c) => {
      if (!counts[c.button_id]) {
        counts[c.button_id] = { button_id: c.button_id, button_text: c.button_text ?? c.button_id, count: 0 };
      }
      counts[c.button_id].count++;
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredClicks]);

  const maxButtonCount = topButtons.length > 0 ? topButtons[0].count : 1;

  // Clicks per day for last 7 days
  const clicksByDay = useMemo(() => {
    // Use analytics by_day if available, otherwise compute from clicks
    if (analytics?.website_clicks?.by_day && analytics.website_clicks.by_day.length > 0) {
      return analytics.website_clicks.by_day.slice(-7);
    }
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    filteredClicks.forEach((c) => {
      const key = c.created_at.slice(0, 10);
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [filteredClicks, analytics]);

  const maxDayCount = Math.max(...clicksByDay.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex gap-2">
          {([
            { value: 'today' as DateRange, label: 'Heute' },
            { value: '7days' as DateRange, label: '7 Tage' },
            { value: '30days' as DateRange, label: '30 Tage' },
          ]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setDateRange(tab.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                dateRange === tab.value
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#111] text-[#ccc] border border-[#1E1E1E] hover:bg-[#0A0A0A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Button filter */}
        <select
          value={buttonFilter}
          onChange={(e) => setButtonFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none bg-[#111]"
        >
          <option value="all">Alle Buttons</option>
          {buttonIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6 animate-pulse">
              <div className="h-3 bg-[#1E1E1E] rounded w-24 mb-3" />
              <div className="h-8 bg-[#1E1E1E] rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
              <p className="text-sm text-[#888] mb-1">Total Clicks</p>
              <p className="text-2xl font-bold text-[#F0F0F5]">{totalClicks}</p>
            </div>
            <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
              <p className="text-sm text-[#888] mb-1">Unique Visitors</p>
              <p className="text-2xl font-bold text-[#2563EB]">{uniqueVisitors}</p>
            </div>
            <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
              <p className="text-sm text-[#888] mb-1">Identified Visitors</p>
              <p className="text-2xl font-bold text-emerald-600">{identifiedVisitors}</p>
            </div>
          </div>

          {/* Click activity chart - last 7 days */}
          <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
            <h3 className="text-lg font-semibold text-[#F0F0F5] mb-4">
              Klick-Aktivität (letzte 7 Tage)
            </h3>
            <div className="flex items-end gap-2 h-40">
              {clicksByDay.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-[#888] font-medium">{day.count}</span>
                  <div
                    className="w-full bg-[#2563EB] rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max((day.count / maxDayCount) * 120, 4)}px`,
                    }}
                  />
                  <span className="text-xs text-[#666]">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Buttons */}
          {topButtons.length > 0 && (
            <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
              <h3 className="text-lg font-semibold text-[#F0F0F5] mb-4">
                Top 5 Buttons
              </h3>
              <div className="space-y-3">
                {topButtons.map((btn) => (
                  <div key={btn.button_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-[#ccc]">{btn.button_text}</span>
                      <span className="text-[#888]">{btn.count} Klicks</span>
                    </div>
                    <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                      <div
                        className="bg-[#2563EB] h-2 rounded-full transition-all"
                        style={{ width: `${(btn.count / maxButtonCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Click table */}
          <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1E1E1E]">
              <h3 className="text-lg font-semibold text-[#F0F0F5]">
                Alle Klicks
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#1E1E1E] bg-[#0A0A0A]">
                    <th className="px-6 py-3 font-medium text-[#888]">Zeitpunkt</th>
                    <th className="px-6 py-3 font-medium text-[#888]">Seite</th>
                    <th className="px-6 py-3 font-medium text-[#888]">Button</th>
                    <th className="px-6 py-3 font-medium text-[#888]">Besucher-ID</th>
                    <th className="px-6 py-3 font-medium text-[#888]">Lead</th>
                    <th className="px-6 py-3 font-medium text-[#888]">Referrer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClicks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#666]">
                        Keine Klicks im gewählten Zeitraum.
                      </td>
                    </tr>
                  ) : (
                    filteredClicks.map((click, idx) => (
                      <tr key={click.id ?? idx} className="border-b border-[#1E1E1E] last:border-0 hover:bg-[#0A0A0A]">
                        <td className="px-6 py-3 text-[#ccc] whitespace-nowrap">
                          {new Date(click.created_at).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-3 text-[#ccc] max-w-[200px] truncate" title={click.page_url}>
                          {click.page_url}
                        </td>
                        <td className="px-6 py-3 text-[#ccc]">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#2563EB]">
                            {click.button_text ?? click.button_id}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[#888] font-mono text-xs">
                          {click.visitor_id?.slice(0, 12)}...
                        </td>
                        <td className="px-6 py-3 text-[#ccc]">
                          {click.lead_name ? (
                            <span className="text-emerald-600 font-medium">{click.lead_name}</span>
                          ) : click.lead_id ? (
                            <span className="text-[#888]">#{click.lead_id}</span>
                          ) : (
                            <span className="text-[#555]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-[#888] max-w-[150px] truncate" title={click.referrer}>
                          {click.referrer || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
