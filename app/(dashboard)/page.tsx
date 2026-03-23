'use client';

import { useState, useEffect, useCallback } from 'react';
import FeedbackBanner from '@/components/FeedbackBanner';

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
  linkedin_replies?: number;
  linkedin_meetings?: number;
  linkedin_no_profile?: number;
  linkedin_by_sector?: { sector: string; requests: number; connected: number; messages: number; replied: number; meetings: number; no_linkedin: number }[];
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

function getReadableName(buttonId: string, buttonText: string | null): string {
  const id = (buttonId || '').toLowerCase();
  const text = (buttonText || '').toLowerCase();
  if (id.includes('workshop_01') || (id.includes('service_cta_01') && text.includes('workshop'))) return 'Workshop Starter';
  if (id.includes('workshop_02') || (id.includes('service_cta_02') && text.includes('workshop'))) return 'Workshop Professional';
  if (id.includes('workshop_03')) return 'KI-Prozessautomatisierung';
  if (id.includes('auto_01') || text.includes('immobilien')) return 'Immobilienmakler';
  if (id.includes('auto_02') || text.includes('handwerk')) return 'Handwerksbetriebe';
  if (id.includes('auto_03') || text.includes('bau')) return 'Bauunternehmen';
  if (id === 'hero_cta_primary') return 'Hero: Workshops entdecken';
  if (id === 'hero_cta_secondary') return 'Hero: Audit buchen';
  if (id === 'cta_bottom') return 'Bottom CTA';
  if (id === 'launch_banner_cta') return 'Launch Banner';
  if (id === 'pageview') return 'Seitenaufruf';
  if (id.includes('scroll')) return buttonText || 'Scroll';
  return buttonText || buttonId || 'Unbekannt';
}

function getClickCategory(buttonId: string, buttonText: string | null): 'workshop' | 'automation' | 'cta' | 'other' {
  const id = (buttonId || '').toLowerCase();
  const text = (buttonText || '').toLowerCase();
  if (id.includes('workshop') || (id.includes('service_cta') && text.includes('workshop'))) return 'workshop';
  if (id.includes('auto_') || text.includes('immobilien') || text.includes('handwerk') || text.includes('bau')) return 'automation';
  if (id.includes('hero_cta') || id === 'cta_bottom' || id === 'launch_banner_cta' || id.includes('calendly') || text.includes('audit') || text.includes('termin')) return 'cta';
  return 'other';
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
      {/* Weekly Feedback Banner */}
      <FeedbackBanner />

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
              {analytics.website_clicks?.top_buttons && analytics.website_clicks.top_buttons.length > 0 && (() => {
                const topButtons = analytics.website_clicks?.top_buttons || [];
                const workshopClicks = topButtons.filter(b => getClickCategory(b.button_id, b.button_text) === 'workshop').reduce((s, b) => s + b.count, 0);
                const automationClicks = topButtons.filter(b => getClickCategory(b.button_id, b.button_text) === 'automation').reduce((s, b) => s + b.count, 0);
                const ctaClicks = topButtons.filter(b => getClickCategory(b.button_id, b.button_text) === 'cta').reduce((s, b) => s + b.count, 0);
                return (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-[#1E3A5F] mb-3">Klick-Kategorien</h4>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-blue-700">{workshopClicks}</div>
                        <div className="text-xs text-blue-600">Workshops</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-green-700">{automationClicks}</div>
                        <div className="text-xs text-green-600">Automatisierung</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-purple-700">{ctaClicks}</div>
                        <div className="text-xs text-purple-600">CTAs</div>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-[#1E3A5F] mt-4 mb-3">Top Buttons</h4>
                    <div className="space-y-2">
                      {topButtons.slice(0, 5).map((btn, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700 min-w-0 truncate flex-1">{getReadableName(btn.button_id, btn.button_text)}</span>
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-[#2563EB] h-1.5 rounded-full" style={{ width: `${Math.min(100, (btn.count / Math.max(...topButtons.map(b => b.count))) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{btn.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
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

            {/* LinkedIn Aktivität */}
            <div>
              <h3 className="text-lg font-semibold text-[#1E3A5F] mb-3">LinkedIn Aktivit&auml;t</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-blue-600">{analytics.linkedin_requests ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Anfragen gesendet</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-green-600">{analytics.linkedin_connected ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Verbunden</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-purple-600">{analytics.linkedin_messages ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Nachrichten gesendet</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-orange-600">{analytics.linkedin_replies ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Antworten erhalten</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-emerald-600">{analytics.linkedin_meetings ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Termine via LinkedIn</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-red-600">{analytics.linkedin_no_profile ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Kein LinkedIn</div>
                </div>
              </div>

              {/* Sector breakdown */}
              {analytics.linkedin_by_sector && analytics.linkedin_by_sector.length > 0 && (
                <div className="mt-3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium text-gray-600">Sektor</th>
                        <th className="text-center p-2 font-medium text-gray-600">Anfragen</th>
                        <th className="text-center p-2 font-medium text-gray-600">Verbunden</th>
                        <th className="text-center p-2 font-medium text-gray-600">Nachrichten</th>
                        <th className="text-center p-2 font-medium text-gray-600">Antworten</th>
                        <th className="text-center p-2 font-medium text-gray-600">Meetings</th>
                        <th className="text-center p-2 font-medium text-gray-600">Kein LI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.linkedin_by_sector.map(s => (
                        <tr key={s.sector} className="border-t border-gray-100">
                          <td className="p-2 font-medium capitalize">{s.sector}</td>
                          <td className="p-2 text-center">{s.requests}</td>
                          <td className="p-2 text-center">{s.connected}</td>
                          <td className="p-2 text-center">{s.messages}</td>
                          <td className="p-2 text-center">{s.replied}</td>
                          <td className="p-2 text-center">{s.meetings}</td>
                          <td className="p-2 text-center">{s.no_linkedin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Extended KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
