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

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }} className="kpi-grid">
        {[
          { label: 'Klicks gesamt', value: filtered.length, color: CORAL },
          { label: 'Unique Besucher', value: uniqueCount, color: '#3B82F6' },
          { label: 'Identifizierte', value: identifiedCount, color: '#22C55E' },
          { label: 'Top-Seite', value: topPage, color: '#EAB308', isText: true },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16, borderTop: `3px solid ${kpi.color}` }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>{kpi.label}</p>
            <p style={{ fontSize: kpi.isText ? 14 : 24, fontWeight: 700, color: '#F0F0F5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        /* ── TAB 1: Live Feed ─────────────────────────────────────────── */
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 14 }}>Keine Klicks im gewählten Zeitraum.</p>
          ) : (
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {filtered.map((click, i) => {
                const identified = !!click.lead_id;
                const name = identified ? (click.lead_name || `${click.lead_email || ''}`) : click.visitor_id?.slice(0, 12) + '...';
                return (
                  <div key={click.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1E1E1E' }}>
                    {/* Badge */}
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                      background: identified ? '#22C55E20' : '#55555520', color: identified ? '#22C55E' : '#555' }}>
                      {identified ? 'Identifiziert' : 'Anonym'}
                    </span>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: '#F0F0F5' }}>{name}</span>
                        {click.lead_company && <span style={{ color: '#888' }}> · {click.lead_company}</span>}
                        <span style={{ color: '#555' }}> hat </span>
                        <span style={{ color: '#ccc' }}>{click.button_text || click.button_id || 'Seite'}</span>
                        <span style={{ color: '#555' }}> geklickt auf </span>
                        <span style={{ color: '#888' }}>{click.page}</span>
                      </p>
                      {click.utm_source && (
                        <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>
                          via {click.utm_source}{click.utm_medium ? ` / ${click.utm_medium}` : ''}
                          {click.utm_campaign ? ` (${click.utm_campaign})` : ''}
                        </p>
                      )}
                    </div>
                    {/* Time */}
                    <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {timeAgo(click.clicked_at || click.created_at)}
                    </span>
                    {/* Actions */}
                    {identified && click.lead_email && (
                      <a href={`mailto:${click.lead_email}`} style={{ fontSize: 14, textDecoration: 'none', flexShrink: 0 }} title="Email">✉️</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── TAB 2: Analyse ───────────────────────────────────────────── */
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Row 1: Top Buttons + Clicks by Page */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="charts-grid">
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Top geklickte Buttons</h3>
              {topButtons.length === 0 ? <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topButtons} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={{ stroke: '#333' }} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: '#333' }} width={120} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill={CORAL} radius={[0, 4, 4, 0]} name="Klicks" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Klicks nach Seite</h3>
              {clicksByPage.length === 0 ? <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={clicksByPage} dataKey="count" nameKey="page" cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      label={({ page, count }: any) => `${page}: ${count}`} labelLine={false}>
                      {clicksByPage.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 2: Clicks over time */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Klicks über Zeit</h3>
            {clicksByDay.length === 0 ? <p style={{ fontSize: 13, color: '#555' }}>Keine Daten.</p> : (
              <ResponsiveContainer width="100%" height={220}>
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
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Traffic-Quellen (UTM)</h3>
              {utmSources.length === 0 ? <p style={{ fontSize: 13, color: '#555' }}>Keine UTM-Daten.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {utmSources.slice(0, 8).map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#ccc', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</span>
                      <div style={{ flex: 1, height: 6, background: '#1E1E1E', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(s.count / (utmSources[0]?.count || 1)) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#888', width: 30, textAlign: 'right' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F5', margin: '0 0 16px' }}>Tageszeit-Verteilung</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                {hourHeatmap.map(h => (
                  <div key={h.hour} style={{ textAlign: 'center' }}>
                    <div style={{
                      height: 28, borderRadius: 4, marginBottom: 2,
                      background: h.count > 0 ? `rgba(232,71,42,${0.15 + (h.count / maxHour) * 0.85})` : '#1A1A1A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {h.count > 0 && <span style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>{h.count}</span>}
                    </div>
                    <span style={{ fontSize: 9, color: '#555' }}>{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .charts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
