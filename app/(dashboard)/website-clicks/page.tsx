'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

const CORAL = '#E8472A';

interface ClickEntry {
  id?: number;
  button_id: string;
  button_text?: string | null;
  page: string;
  referrer?: string | null;
  visitor_id: string;
  lead_id?: number;
  lead_name?: string;
  lead_email?: string;
  lead_company?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  created_at: string;
  clicked_at?: string;
}

interface Stats {
  total_clicks: number;
  unique_visitors: number;
  identified_visitors: number;
}

function detectIndustry(page: string, referrer?: string): string {
  const combined = (page + ' ' + (referrer || '')).toLowerCase();
  if (combined.includes('immobil') || combined.includes('real-estate')) return 'Immobilien';
  if (combined.includes('bau') || combined.includes('construction')) return 'Bau';
  if (combined.includes('handwerk') || combined.includes('craft')) return 'Handwerk';
  return 'Sonstige';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'gestern';
  return `vor ${d} Tagen`;
}

export default function WebsiteClicksPage() {
  const [clicks, setClicks] = useState<ClickEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'uebersicht' | 'branchen' | 'conversions' | 'feed'>('uebersicht');
  const [period, setPeriod] = useState('7');
  const [section, setSection] = useState('alle');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks/website-clicks');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClicks(data.clicks || []);
    } catch {
      setClicks([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    const i = setInterval(fetchData, 60000);
    return () => clearInterval(i);
  }, [fetchData]);

  const filtered = useMemo(() => {
    let result = clicks;
    const days = parseInt(period);
    const since = Date.now() - days * 86400000;
    result = result.filter(c => new Date(c.clicked_at || c.created_at).getTime() >= since);
    if (section !== 'alle') {
      result = result.filter(c => detectIndustry(c.page, c.referrer || undefined) === section);
    }
    return result;
  }, [clicks, period, section]);

  const byDayData = useMemo(() => {
    const days: Record<string, number> = {};
    for (const c of filtered) {
      const day = new Date(c.clicked_at || c.created_at).toISOString().slice(0, 10);
      days[day] = (days[day] || 0) + 1;
    }
    return Object.entries(days)
      .sort()
      .slice(-14)
      .map(([day, count]) => ({ day, count }));
  }, [filtered]);

  const trafficSources = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      const src = c.utm_source || c.referrer || 'Direkt';
      counts[src] = (counts[src] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([source, count]) => ({ source, count }));
  }, [filtered]);

  const industryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      const ind = detectIndustry(c.page, c.referrer || undefined);
      counts[ind] = (counts[ind] || 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }, [filtered]);

  const topPages = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      counts[c.page] = (counts[c.page] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));
  }, [filtered]);

  const ctaClicks = useMemo(() => {
    return filtered.filter(c => c.button_id !== 'pageview');
  }, [filtered]);

  const ctaCountsByButton = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of ctaClicks) {
      const label = c.button_text || c.button_id;
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [ctaClicks]);

  const hourHeatmap = useMemo(() => {
    const hours = Array(24).fill(0);
    for (const c of filtered) {
      const h = new Date(c.clicked_at || c.created_at).getHours();
      hours[h]++;
    }
    return hours.map((count, hour) => ({ hour, count }));
  }, [filtered]);

  const maxHour = Math.max(...hourHeatmap.map(h => h.count), 1);
  const maxPage = Math.max(...topPages.map(p => p.count), 1);
  const maxSource = Math.max(...trafficSources.map(s => s.count), 1);

  const uniqueVisitors = useMemo(() => new Set(filtered.map(c => c.visitor_id)).size, [filtered]);
  const identifiedVisitors = useMemo(() => new Set(filtered.filter(c => c.lead_id).map(c => c.visitor_id)).size, [filtered]);

  const todayClicks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filtered.filter(c => new Date(c.clicked_at || c.created_at).toISOString().split('T')[0] === today).length;
  }, [filtered]);

  const weekClicks = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return filtered.filter(c => new Date(c.clicked_at || c.created_at).getTime() >= since).length;
  }, [filtered]);

  const monthClicks = useMemo(() => {
    const since = Date.now() - 30 * 86400000;
    return filtered.filter(c => new Date(c.clicked_at || c.created_at).getTime() >= since).length;
  }, [filtered]);

  const conversionRate =
    uniqueVisitors > 0 ? Math.round((ctaClicks.length / uniqueVisitors) * 10000) / 100 : 0;

  return (
    <div className="min-h-screen bg-[#111] p-6">
      <div className="max-w-6xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-4 border-t-4 border-t-[#E8472A]">
            <p className="text-xs text-[#888] mb-2">Besucher Heute</p>
            <p className="text-2xl font-bold text-[#F0F0F5]">{todayClicks}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-4 border-t-4 border-t-[#3B82F6]">
            <p className="text-xs text-[#888] mb-2">Diese Woche</p>
            <p className="text-2xl font-bold text-[#F0F0F5]">{weekClicks}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-4 border-t-4 border-t-[#22C55E]">
            <p className="text-xs text-[#888] mb-2">Dieser Monat</p>
            <p className="text-2xl font-bold text-[#F0F0F5]">{monthClicks}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-4 border-t-4 border-t-[#EAB308]">
            <p className="text-xs text-[#888] mb-2">Conversion Rate</p>
            <p className="text-2xl font-bold text-[#F0F0F5]">{conversionRate.toFixed(2)}%</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-4 border-t-4 border-t-[#8B5CF6]">
            <p className="text-xs text-[#888] mb-2">Identifizierte Leads</p>
            <p className="text-2xl font-bold text-[#F0F0F5]">{identifiedVisitors}</p>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="flex justify-between items-center gap-4 mb-8">
          <div className="flex gap-2 bg-[#1A1A1A] border border-[#1E1E1E] rounded-lg p-1">
            {[
              { key: '1', label: 'Heute' },
              { key: '7', label: '7 Tage' },
              { key: '30', label: '30 Tage' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === p.key
                    ? 'bg-[#E8472A] text-white'
                    : 'text-[#888] hover:text-[#ccc]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-[#1A1A1A] border border-[#1E1E1E] rounded-lg p-1">
            {[
              { key: 'alle', label: 'Alle' },
              { key: 'Immobilien', label: 'Immobilien' },
              { key: 'Handwerk', label: 'Handwerk' },
              { key: 'Bau', label: 'Bau' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  section === s.key
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#888] hover:text-[#ccc]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-[#1A1A1A] border border-[#1E1E1E] rounded-lg p-1 ml-auto">
            {[
              { key: 'uebersicht', label: 'Uebersicht' },
              { key: 'branchen', label: 'Branchen & Seiten' },
              { key: 'conversions', label: 'Conversions' },
              { key: 'feed', label: 'Live-Feed' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-[#E8472A] text-white'
                    : 'text-[#888] hover:text-[#ccc]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#1E1E1E] border-t-[#E8472A] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#888]">Lade Klick-Daten...</p>
          </div>
        ) : tab === 'uebersicht' ? (
          <div className="space-y-6">
            {/* Besucher pro Tag (14-day bar chart) */}
            <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">Besucher pro Tag (letzte 14 Tage)</h3>
              <div className="flex items-end justify-between h-32 gap-1">
                {byDayData.length === 0 ? (
                  <p className="text-xs text-[#555]">Keine Daten.</p>
                ) : (
                  byDayData.map((d, i) => {
                    const maxVal = Math.max(...byDayData.map(x => x.count), 1);
                    const height = (d.count / maxVal) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-[#E8472A] to-[#E8472A] rounded-t opacity-80 hover:opacity-100 relative group"
                        style={{ height: `${height}%`, minHeight: '2px' }}
                      >
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-[#2A2A2A] text-[#F0F0F5] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                          {d.count} ({d.day})
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Traffic Sources and Devices */}
            <div className="grid grid-cols-2 gap-6">
              {/* Traffic Sources */}
              <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">Traffic-Quellen</h3>
                {trafficSources.length === 0 ? (
                  <p className="text-xs text-[#555]">Keine Daten.</p>
                ) : (
                  <div className="space-y-3">
                    {trafficSources.map((s, i) => {
                      const pct = (s.count / maxSource) * 100;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#ccc] truncate flex-1">{s.source}</span>
                            <span className="text-[#888]">{s.count}</span>
                          </div>
                          <div className="bg-[#0A0A0A] rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#E8472A] to-[#FF6B4A]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Peak Hours Heatmap */}
              <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">Peak-Stunden</h3>
                <div className="grid grid-cols-12 gap-1">
                  {hourHeatmap.map(h => (
                    <div key={h.hour} className="flex flex-col items-center">
                      <div
                        className="w-full aspect-square rounded-sm transition-all hover:scale-110"
                        style={{
                          background:
                            h.count === 0
                              ? '#0A0A0A'
                              : `rgba(232, 71, 42, ${0.2 + (h.count / maxHour) * 0.8})`,
                        }}
                        title={`${h.hour}:00 - ${h.count} clicks`}
                      />
                      <span className="text-[8px] text-[#555] mt-1">{h.hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : tab === 'branchen' ? (
          <div className="space-y-6">
            {/* Industry Cards */}
            <div className="grid grid-cols-4 gap-4">
              {['Immobilien', 'Handwerk', 'Bau', 'Sonstige'].map(ind => {
                const data = industryBreakdown.find(x => x.name === ind) || {
                  name: ind,
                  count: 0,
                  pct: 0,
                };
                return (
                  <div key={ind} className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-4">
                    <p className="text-xs text-[#888] mb-2">{ind}</p>
                    <p className="text-2xl font-bold text-[#F0F0F5]">{data.count}</p>
                    <p className="text-xs text-[#555] mt-2">{data.pct}%</p>
                  </div>
                );
              })}
            </div>

            {/* Top Pages */}
            <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">Top Pages (Ranking)</h3>
              {topPages.length === 0 ? (
                <p className="text-xs text-[#555]">Keine Daten.</p>
              ) : (
                <div className="space-y-3">
                  {topPages.map((p, i) => {
                    const pct = (p.count / maxPage) * 100;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-[#888] w-6">{i + 1}.</span>
                          <span className="text-xs text-[#ccc] flex-1 truncate">{p.page}</span>
                          <span className="text-xs text-[#888]">{p.count}</span>
                        </div>
                        <div className="bg-[#0A0A0A] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Industry Trends */}
            <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">Branchen-Verteilung</h3>
              {industryBreakdown.length === 0 ? (
                <p className="text-xs text-[#555]">Keine Daten.</p>
              ) : (
                <div className="space-y-3">
                  {industryBreakdown.map((ind, i) => {
                    const colors = ['#E8472A', '#3B82F6', '#22C55E', '#EAB308'];
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#ccc]">{ind.name}</span>
                          <span className="text-[#888]">{ind.count} ({ind.pct}%)</span>
                        </div>
                        <div className="bg-[#0A0A0A] rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full"
                            style={{ width: `${ind.pct}%`, background: colors[i % colors.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : tab === 'conversions' ? (
          <div className="space-y-6">
            {/* CTA Click Breakdown */}
            <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">CTA Click Breakdown</h3>
              {ctaCountsByButton.length === 0 ? (
                <p className="text-xs text-[#555]">Keine Daten.</p>
              ) : (
                <div className="space-y-3">
                  {ctaCountsByButton.map((btn, i) => {
                    const pct = (btn.count / (ctaCountsByButton[0]?.count || 1)) * 100;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#ccc] truncate flex-1">{btn.name}</span>
                          <span className="text-[#888]">{btn.count}</span>
                        </div>
                        <div className="bg-[#0A0A0A] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#22C55E] to-[#4ADE80]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Conversion Funnel */}
            <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#F0F0F5] mb-6">Conversion Funnel</h3>
              <div className="space-y-4">
                {[
                  { label: 'Besucher', value: uniqueVisitors, color: '#3B82F6' },
                  {
                    label: 'Seiten angesehen',
                    value: filtered.length,
                    color: '#8B5CF6',
                  },
                  { label: 'CTA geklickt', value: ctaClicks.length, color: '#22C55E' },
                  { label: 'Identifiziert', value: identifiedVisitors, color: '#EAB308' },
                ].map((stage, i) => {
                  const maxVal = uniqueVisitors || 1;
                  const pct = (stage.value / maxVal) * 100;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#ccc]">{stage.label}</span>
                        <span className="text-[#888]">{stage.value}</span>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${pct}%`, background: stage.color }}
                        >
                          {pct > 20 && (
                            <span className="text-[10px] font-semibold text-white">
                              {Math.round(pct)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Converting Pages */}
            <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">
                Top Converting Pages
              </h3>
              {topPages.length === 0 ? (
                <p className="text-xs text-[#555]">Keine Daten.</p>
              ) : (
                <div className="space-y-2">
                  {topPages.slice(0, 5).map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs p-2 bg-[#0A0A0A] rounded"
                    >
                      <span className="text-[#ccc] truncate flex-1">{p.page}</span>
                      <span className="text-[#E8472A] font-semibold ml-2">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <div className="bg-[#111] border-b border-[#1E1E1E] px-6 py-4 sticky top-0">
              <h3 className="text-sm font-semibold text-[#F0F0F5] m-0">
                Last 50 Clicks
              </h3>
            </div>
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#555]">
                Keine Klicks im gewählten Zeitraum.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {filtered.slice(0, 50).map((click, i) => {
                  const identified = !!click.lead_id;
                  const name = identified
                    ? click.lead_name || click.lead_email
                    : click.visitor_id?.slice(0, 8) + '...';

                  let eventBadgeColor = '#555';
                  let eventLabel = 'view';
                  if (click.button_id === 'form_submit')
                    (eventBadgeColor = '#E8472A'), (eventLabel = 'form');
                  else if (click.button_id === 'cta_click')
                    (eventBadgeColor = '#22C55E'), (eventLabel = 'cta');
                  else if (click.button_id === 'scroll')
                    (eventBadgeColor = '#3B82F6'), (eventLabel = 'scroll');

                  return (
                    <div
                      key={click.id || i}
                      className="border-b border-[#1E1E1E] px-6 py-3 flex items-center gap-3 hover:bg-[#151515] transition-colors text-xs"
                    >
                      <span
                        className="px-2 py-1 rounded text-[10px] font-semibold text-white whitespace-nowrap"
                        style={{ background: eventBadgeColor }}
                      >
                        {eventLabel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F0F0F5] truncate m-0">
                          {name}
                          {click.lead_company && ` - ${click.lead_company}`}
                        </p>
                        <p className="text-[#555] text-[11px] mt-1 truncate m-0">
                          {click.button_text || click.button_id} on {click.page}
                        </p>
                      </div>
                      <span className="text-[#555] whitespace-nowrap flex-shrink-0">
                        {timeAgo(click.clicked_at || click.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
