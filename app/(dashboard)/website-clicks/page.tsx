'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CORAL = '#E8472A';
const TOOLTIP_STYLE = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' };
const AXIS_TICK = { fill: '#888', fontSize: 12 };

interface ClickEntry {
  id?: number; button_id: string; button_text?: string | null; page: string;
  referrer?: string | null; visitor_id: string; lead_id?: number;
  lead_name?: string; lead_email?: string; lead_company?: string;
  utm_source?: string | null; utm_medium?: string | null;
  utm_campaign?: string | null; utm_content?: string | null;
  created_at: string; clicked_at?: string;
}

interface Stats { total_clicks: number; unique_visitors: number; identified_visitors: number }

// Industry detection helper
function detectIndustry(page: string, referrer?: string): string {
  const combined = (page + ' ' + (referrer || '')).toLowerCase();
  if (combined.includes('immobil') || combined.includes('real-estate') || combined.includes('property')) return 'Immobilien';
  if (combined.includes('bau') || combined.includes('construction') || combined.includes('baustelle')) return 'Bau';
  if (combined.includes('handwerk') || combined.includes('craft') || combined.includes('artisan')) return 'Handwerk';
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
  const [, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'feed' | 'analyse'>('feed');
  const [period, setPeriod] = useState('7');
  const [pageFilter, setPageFilter] = useState('all');
  const [identifiedOnly, setIdentifiedOnly] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks/website-clicks');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClicks(data.clicks || []);
      setStats(data.stats || null);
    } catch { setClicks([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [fetchData]);

  // Filter clicks
  const filtered = useMemo(() => {
    let result = clicks;
    const days = parseInt(period);
    const since = Date.now() - days * 86400000;
    result = result.filter(c => new Date(c.clicked_at || c.created_at).getTime() >= since);
    if (pageFilter !== 'all') result = result.filter(c => c.page === pageFilter);
    if (identifiedOnly) result = result.filter(c => c.lead_id);
    return result;
  }, [clicks, period, pageFilter, identifiedOnly]);

  // Unique pages for filter
  const uniquePages = useMemo(() => Array.from(new Set(clicks.map(c => c.page))).sort(), [clicks]);

  // Top page for KPI
  const topPage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) { counts[c.page] = (counts[c.page] || 0) + 1; }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '–';
  }, [filtered]);

  // Industry Overview
  const industryOverview = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      const industry = detectIndustry(c.page, c.referrer || undefined);
      counts[industry] = (counts[industry] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Hot Leads (repeat visitors)
  const hotLeads = useMemo(() => {
    const visitorCounts: Record<string, ClickEntry[]> = {};
    for (const c of filtered) {
      if (!visitorCounts[c.visitor_id]) visitorCounts[c.visitor_id] = [];
      visitorCounts[c.visitor_id].push(c);
    }
    return Object.entries(visitorCounts)
      .filter(([_, clicks]) => clicks.length > 1)
      .map(([vid, clicks]) => {
        const first = clicks[0];
        return {
          visitor_id: vid,
          visit_count: clicks.length,
          name: first.lead_name || first.lead_email || vid.slice(0, 12) + '...',
          company: first.lead_company,
          is_identified: !!first.lead_id,
          last_visit: new Date(Math.max(...clicks.map(c => new Date(c.clicked_at || c.created_at).getTime()))).toISOString(),
        };
      })
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 8);
  }, [filtered]);

  // Product/Service Interest (pages that look like product/feature pages)
  const productInterest = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      const page = c.page.toLowerCase();
      // Try to extract meaningful product categories
      if (page.includes('/features') || page.includes('/feature')) {
        counts['Features'] = (counts['Features'] || 0) + 1;
      } else if (page.includes('/pricing') || page.includes('/preise')) {
        counts['Pricing'] = (counts['Pricing'] || 0) + 1;
      } else if (page.includes('/demo') || page.includes('/trial')) {
        counts['Demo/Trial'] = (counts['Demo/Trial'] || 0) + 1;
      } else if (page.includes('/integration')) {
        counts['Integration'] = (counts['Integration'] || 0) + 1;
      } else if (page.includes('/blog') || page.includes('/news')) {
        counts['Content/Blog'] = (counts['Content/Blog'] || 0) + 1;
      } else if (page === '/' || page === '') {
        counts['Homepage'] = (counts['Homepage'] || 0) + 1;
      } else {
        counts['Other Pages'] = (counts['Other Pages'] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Charts data
  const topButtons = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      if (c.button_id === 'pageview') continue;
      const label = c.button_text || c.button_id;
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const clicksByPage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) { counts[c.page] = (counts[c.page] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([page, count]) => ({ page, count }));
  }, [filtered]);

  const clicksByDay = useMemo(() => {
    const days: Record<string, number> = {};
    for (const c of filtered) {
      const day = new Date(c.clicked_at || c.created_at).toISOString().slice(0, 10);
      days[day] = (days[day] || 0) + 1;
    }
    return Object.entries(days).sort().map(([day, count]) => ({ day, count }));
  }, [filtered]);

  const utmSources = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      const src = c.utm_source || 'Direkt';
      counts[src] = (counts[src] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count }));
  }, [filtered]);

  const hourHeatmap = useMemo(() => {
    const hours = Array(24).fill(0);
    for (const c of filtered) { hours[new Date(c.clicked_at || c.created_at).getHours()]++; }
    return hours.map((count, hour) => ({ hour, count }));
  }, [filtered]);

  const maxHour = Math.max(...hourHeatmap.map(h => h.count), 1);
  const PIE_COLORS = [CORAL, '#3B82F6', '#22C55E', '#EAB308', '#8B5CF6', '#EC4899'];
  const identifiedCount = useMemo(() => new Set(filtered.filter(c => c.lead_id).map(c => c.visitor_id)).size, [filtered]);
  const uniqueCount = useMemo(() => new Set(filtered.map(c => c.visitor_id)).size, [filtered]);

  const periods = [{ key: '1', label: 'Heute' }, { key: '7', label: '7 Tage' }, { key: '30', label: '30 Tage' }];

  // Top industry
  const topIndustry = industryOverview[0]?.name || '–';

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }} className="kpi-grid">
        {[
          { label: 'Klicks gesamt', value: filtered.length, color: CORAL },
          { label: 'Unique Besucher', value: uniqueCount, color: '#3B82F6' },
          { label: 'Top Industrie', value: topIndustry, color: '#8B5CF6', isText: true },
          { label: 'Meistbesuchte Seite', value: topPage.slice(0, 25), color: '#EAB308', isText: true },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16, borderTop: `3px solid ${kpi.color}` }} title={kpi.isText ? (kpi.value as string) : undefined}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>{kpi.label}</p>
            <p style={{ fontSize: kpi.isText ? 13 : 24, fontWeight: 700, color: '#F0F0F5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString('de-DE') : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: '#111', borderRadius: 8, padding: 3, border: '1px solid #1E1E1E' }}>
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: period === p.key ? CORAL : 'transparent', color: period === p.key ? '#fff' : '#888' }}>
              {p.label}
            </button>
          ))}
        </div>
        <select value={pageFilter} onChange={e => setPageFilter(e.target.value)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#ccc' }}>
          <option value="all">Alle Seiten</option>
          {uniquePages.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', cursor: 'pointer' }}>
          <input type="checkbox" checked={identifiedOnly} onChange={e => setIdentifiedOnly(e.target.checked)} style={{ accentColor: CORAL }} />
          Nur identifizierte
        </label>

        {/* Tabs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, background: '#111', borderRadius: 8, padding: 3, border: '1px solid #1E1E1E' }}>
          {(['feed', 'analyse'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: tab === t ? '#3B82F6' : 'transparent', color: tab === t ? '#fff' : '#888' }}>
              {t === 'feed' ? 'Live-Feed' : 'Analyse'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #1E1E1E', borderTopColor: CORAL, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: '#888' }}>Lade Klick-Daten...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : tab === 'feed' ? (
        /* ── TAB 1: Live Feed + Analytics Grid ─────────────────────── */
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Row 1: Industry + Top Pages + Hot Leads */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="charts-grid">
            {/* Industrie-Uebersicht */}
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Industrie-Uebersicht</h3>
              {industryOverview.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {industryOverview.map((ind, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#ccc' }}>{ind.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F5' }}>{ind.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top-Seiten */}
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Top-Seiten</h3>
              {clicksByPage.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clicksByPage.slice(0, 6).map((pg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{pg.page}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F5' }}>{pg.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hot Leads (Repeat Visitors) */}
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Hot Leads</h3>
              {hotLeads.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine Wiederholungsbesucher.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {hotLeads.map((lead, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: lead.is_identified ? '#22C55E' : '#888' }}>{lead.name}</span>
                        {lead.company && <span style={{ color: '#555', fontSize: 11 }}> - {lead.company}</span>}
                      </div>
                      <span style={{ fontWeight: 600, color: '#F0F0F5', flexShrink: 0, marginLeft: 6 }}>{lead.visit_count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Live Feed */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', padding: '12px 16px', borderBottom: '1px solid #1E1E1E', margin: 0 }}>Live-Feed</h3>
            {filtered.length === 0 ? (
              <p style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: 13 }}>Keine Klicks im gewählten Zeitraum.</p>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {filtered.map((click, i) => {
                  const identified = !!click.lead_id;
                  const name = identified ? (click.lead_name || click.lead_email) : click.visitor_id?.slice(0, 8) + '...';
                  return (
                    <div key={click.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #1E1E1E', fontSize: 12 }}>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                        background: identified ? '#22C55E20' : '#55555520', color: identified ? '#22C55E' : '#555' }}>
                        {identified ? 'ID' : 'Anon'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#F0F0F5' }}>{name}</span>
                          <span style={{ color: '#555' }}> - </span>
                          <span style={{ color: '#ccc' }}>{click.button_text || click.button_id || 'click'}</span>
                        </p>
                        <span style={{ color: '#555', fontSize: 11 }}>{click.page}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {timeAgo(click.clicked_at || click.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── TAB 2: Analyse ───────────────────────────────────────────── */
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Row 1: Industrie + Produkt-Interesse + Top Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="charts-grid">
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Industrie-Uebersicht</h3>
              {industryOverview.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={industryOverview} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65}
                      label={({ name, count }: any) => `${name}: ${count}`} labelLine={false}>
                      {industryOverview.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Produkt-Interesse</h3>
              {productInterest.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={productInterest} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={{ stroke: '#333' }} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: '#333' }} width={75} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Top geklickte Buttons</h3>
              {topButtons.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topButtons.slice(0, 6).map((btn, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{btn.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F5' }}>{btn.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Clicks over time */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Klicks über Zeit</h3>
            {clicksByDay.length === 0 ? (
              <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={clicksByDay}>
                  <defs><linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CORAL} stopOpacity={0.3}/><stop offset="100%" stopColor={CORAL} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="day" tick={AXIS_TICK} axisLine={{ stroke: '#333' }} tickFormatter={(v: any) => { const d = new Date(v); return `${d.getDate()}.${d.getMonth()+1}.`; }} />
                  <YAxis tick={AXIS_TICK} axisLine={{ stroke: '#333' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="count" stroke={CORAL} fill="url(#clickGrad)" strokeWidth={2} name="Klicks" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Row 3: UTM Sources + Hour Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="charts-grid">
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Traffic-Quellen (UTM)</h3>
              {utmSources.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine UTM-Daten.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {utmSources.slice(0, 8).map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#ccc', width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</span>
                      <div style={{ flex: 1, height: 5, background: '#1E1E1E', borderRadius: 2.5 }}>
                        <div style={{ height: '100%', width: `${(s.count / (utmSources[0]?.count || 1)) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 2.5 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#888', width: 25, textAlign: 'right' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 12px' }}>Tageszeit-Verteilung</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
                {hourHeatmap.map(h => (
                  <div key={h.hour} style={{ textAlign: 'center' }}>
                    <div style={{
                      height: 24, borderRadius: 3, marginBottom: 2,
                      background: h.count > 0 ? `rgba(232,71,42,${0.15 + (h.count / maxHour) * 0.85})` : '#1A1A1A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {h.count > 0 && <span style={{ fontSize: 8, color: '#fff', fontWeight: 600 }}>{h.count}</span>}
                    </div>
                    <span style={{ fontSize: 8, color: '#555' }}>{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .charts-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
          .charts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
