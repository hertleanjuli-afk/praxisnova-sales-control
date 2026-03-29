'use client';

import { useState, useEffect, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClickEntry {
  id?: number;
  button_id: string;
  button_text?: string | null;
  page: string;
  referrer?: string | null;
  visitor_id: string;
  lead_id?: number;
  lead_name?: string;
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

interface ClickCategory {
  label: string;
  category: 'workshop' | 'automation' | 'cta' | 'pageview' | 'other';
}

// ── Category Colors ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  ClickCategory['category'],
  { title: string; color: string; bgLight: string; textColor: string }
> = {
  workshop: {
    title: 'Workshops',
    color: 'bg-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  automation: {
    title: 'Automatisierung',
    color: 'bg-green-600',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600',
  },
  cta: {
    title: 'Allgemeine CTAs',
    color: 'bg-purple-600',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  pageview: {
    title: 'Seitenaufrufe',
    color: 'bg-gray-500',
    bgLight: 'bg-gray-50',
    textColor: 'text-gray-500',
  },
  other: {
    title: 'Sonstige',
    color: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-500',
  },
};

// ── Categorization Function ────────────────────────────────────────────────────

function categorizeClick(
  buttonId: string,
  buttonText: string | null,
): ClickCategory {
  const id = (buttonId || '').toLowerCase();
  const text = (buttonText || '').toLowerCase();

  // Workshops
  if (
    id.includes('workshop_01') ||
    (id.includes('service_cta_01') && text.includes('workshop'))
  )
    return { label: 'Workshop Starter', category: 'workshop' };
  if (
    id.includes('workshop_02') ||
    (id.includes('service_cta_02') && text.includes('workshop'))
  )
    return { label: 'Workshop Professional', category: 'workshop' };
  if (
    id.includes('workshop_03') ||
    (text.includes('automatisierung') && text.includes('workshop'))
  )
    return { label: 'KI-Prozessautomatisierung', category: 'workshop' };

  // Automation
  if (id.includes('auto_01') || text.includes('immobilien'))
    return { label: 'Immobilienmakler', category: 'automation' };
  if (id.includes('auto_02') || text.includes('handwerk'))
    return { label: 'Handwerksbetriebe', category: 'automation' };
  if (id.includes('auto_03') || text.includes('bau'))
    return { label: 'Bauunternehmen', category: 'automation' };

  // CTAs
  if (id === 'hero_cta_primary' || text.includes('workshops entdecken'))
    return { label: 'Hero: Workshops entdecken', category: 'cta' };
  if (id === 'hero_cta_secondary' || text.includes('audit'))
    return { label: 'Hero: Kostenlosen Audit buchen', category: 'cta' };
  if (id === 'cta_bottom')
    return { label: 'Bottom CTA', category: 'cta' };
  if (id === 'launch_banner_cta' || text.includes('platz sichern'))
    return { label: 'Launch Banner', category: 'cta' };
  if (id.includes('calendly') || text.includes('termin'))
    return { label: 'Calendly Link', category: 'cta' };

  // Pageviews & Scroll
  if (id === 'pageview')
    return { label: 'Seitenaufruf', category: 'pageview' };
  if (id.includes('scroll') || id.includes('time_on_page'))
    return { label: buttonText || id, category: 'pageview' };

  // Other
  return {
    label: buttonText || buttonId || 'Unbekannt',
    category: 'other',
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface GroupedItem {
  label: string;
  count: number;
}

interface CategoryGroup {
  category: ClickCategory['category'];
  total: number;
  items: GroupedItem[];
}

function groupClicksByCategory(
  clicks: ClickEntry[],
): Record<ClickCategory['category'], CategoryGroup> {
  const groups: Record<ClickCategory['category'], CategoryGroup> = {
    workshop: { category: 'workshop', total: 0, items: [] },
    automation: { category: 'automation', total: 0, items: [] },
    cta: { category: 'cta', total: 0, items: [] },
    pageview: { category: 'pageview', total: 0, items: [] },
    other: { category: 'other', total: 0, items: [] },
  };

  const labelCounts: Record<string, Record<string, number>> = {};

  for (const click of clicks) {
    const { label, category } = categorizeClick(
      click.button_id,
      click.button_text ?? null,
    );
    groups[category].total++;

    if (!labelCounts[category]) labelCounts[category] = {};
    labelCounts[category][label] = (labelCounts[category][label] || 0) + 1;
  }

  for (const cat of Object.keys(labelCounts) as ClickCategory['category'][]) {
    groups[cat].items = Object.entries(labelCounts[cat])
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  return groups;
}

// ── Percentage Bar Component ───────────────────────────────────────────────────

function PercentageBar({
  count,
  max,
  colorClass,
}: {
  count: number;
  max: number;
  colorClass: string;
}) {
  const percentage = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`${colorClass} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{count}</span>
    </div>
  );
}

// ── Category Section Component ─────────────────────────────────────────────────

function CategorySection({
  group,
  totalClicks,
}: {
  group: CategoryGroup;
  totalClicks: number;
}) {
  const config = CATEGORY_CONFIG[group.category];
  const maxItem = group.items.length > 0 ? group.items[0].count : 1;
  const sharePercent =
    totalClicks > 0 ? ((group.total / totalClicks) * 100).toFixed(1) : '0';

  if (group.total === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#1E3A5F]">
          {config.title}
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${config.bgLight} ${config.textColor}`}
        >
          {group.total} Klicks
        </span>
      </div>

      {/* Share of total */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Anteil an Gesamtklicks</span>
          <span>{sharePercent}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`${config.color} h-2 rounded-full transition-all`}
            style={{ width: `${sharePercent}%` }}
          />
        </div>
      </div>

      {/* Individual items */}
      <div className="space-y-3">
        {group.items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="text-gray-500">{item.count}</span>
            </div>
            <PercentageBar
              count={item.count}
              max={maxItem}
              colorClass={config.color}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Category Badge for Table ───────────────────────────────────────────────────

function CategoryBadge({ category }: { category: ClickCategory['category'] }) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bgLight} ${config.textColor}`}
    >
      {config.title}
    </span>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────

export default function ClicksPage() {
  const [clicks, setClicks] = useState<ClickEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/webhooks/website-clicks');
        if (!res.ok) throw new Error('Fehler beim Laden der Daten');
        const data = await res.json();
        setClicks(data.clicks ?? []);
        setStats(data.stats ?? null);
      } catch {
        setError('Daten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Process clicks into category groups
  const grouped = useMemo(() => groupClicksByCategory(clicks), [clicks]);

  // Compute stats from clicks as fallback
  const totalClicks = stats?.total_clicks ?? clicks.length;
  const uniqueVisitors = useMemo(() => {
    if (stats?.unique_visitors != null) return stats.unique_visitors;
    return new Set(clicks.map((c) => c.visitor_id)).size;
  }, [clicks, stats]);
  const identifiedVisitors = useMemo(() => {
    if (stats?.identified_visitors != null) return stats.identified_visitors;
    return clicks.filter((c) => c.lead_id).length;
  }, [clicks, stats]);

  // Categorized clicks for the table
  const categorizedClicks = useMemo(
    () =>
      clicks.map((click) => ({
        ...click,
        ...categorizeClick(click.button_id, click.button_text ?? null),
      })),
    [clicks],
  );

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Stats Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Klicks gesamt</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                {totalClicks}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Eindeutige Besucher</p>
              <p className="text-2xl font-bold text-[#2563EB]">
                {uniqueVisitors}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Identifizierte Besucher</p>
              <p className="text-2xl font-bold text-emerald-600">
                {identifiedVisitors}
              </p>
            </div>
          </div>

          {/* ── Section 1: Workshops ─────────────────────────────────────── */}
          <CategorySection
            group={grouped.workshop}
            totalClicks={totalClicks}
          />

          {/* ── Section 2: Automatisierung ───────────────────────────────── */}
          <CategorySection
            group={grouped.automation}
            totalClicks={totalClicks}
          />

          {/* ── Section 3: Allgemeine CTAs ───────────────────────────────── */}
          <CategorySection group={grouped.cta} totalClicks={totalClicks} />

          {/* ── Section 4: Seitenaufrufe ─────────────────────────────────── */}
          {grouped.pageview.total > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1E3A5F]">
                  Seitenaufrufe
                </h3>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-gray-50 text-gray-500">
                  {grouped.pageview.total} gesamt
                </span>
              </div>

              {/* Pageview share */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Anteil an Gesamtklicks</span>
                  <span>
                    {totalClicks > 0
                      ? ((grouped.pageview.total / totalClicks) * 100).toFixed(
                          1,
                        )
                      : '0'}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gray-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${totalClicks > 0 ? (grouped.pageview.total / totalClicks) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Breakdown by label (scroll depths, pageviews, etc.) */}
              <div className="space-y-3">
                {grouped.pageview.items.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {item.label}
                      </span>
                      <span className="text-gray-500">{item.count}</span>
                    </div>
                    <PercentageBar
                      count={item.count}
                      max={grouped.pageview.items[0]?.count || 1}
                      colorClass="bg-gray-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 5: Sonstige ──────────────────────────────────────── */}
          <CategorySection group={grouped.other} totalClicks={totalClicks} />

          {/* ── Section 6: Alle Klicks (Table) ───────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#1E3A5F]">
                Alle Klicks
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 font-medium text-gray-500">
                      Zeitpunkt
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">
                      Kategorie
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">
                      Button
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">
                      Seite
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">
                      Referrer
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">
                      UTM
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">
                      Besucher
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">
                      Lead
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categorizedClicks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        Keine Klicks vorhanden.
                      </td>
                    </tr>
                  ) : (
                    categorizedClicks.map((click, idx) => (
                      <tr
                        key={click.id ?? idx}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                          {new Date(click.created_at).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-3">
                          <CategoryBadge category={click.category} />
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          <span className="font-medium">{click.label}</span>
                          <span className="block text-xs text-gray-400 mt-0.5">
                            {click.button_id}
                          </span>
                        </td>
                        <td
                          className="px-6 py-3 text-gray-700 max-w-[200px] truncate"
                          title={click.page}
                        >
                          {click.page}
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-xs max-w-[150px] truncate" title={click.referrer || ''}>
                          {click.referrer ? (() => { try { return new URL(click.referrer!).hostname; } catch { return click.referrer; } })() : '-'}
                        </td>
                        <td className="px-6 py-3 text-xs">
                          {click.utm_source ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-blue-50 text-blue-600 font-medium">
                              {click.utm_source}{click.utm_medium ? ` / ${click.utm_medium}` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                          {click.visitor_id?.slice(0, 12)}...
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          {click.lead_name ? (
                            <span className="text-emerald-600 font-medium">
                              {click.lead_name}
                            </span>
                          ) : click.lead_id ? (
                            <span className="text-gray-500">
                              #{click.lead_id}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
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
