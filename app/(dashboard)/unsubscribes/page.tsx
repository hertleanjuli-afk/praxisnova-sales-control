'use client';

import { useState, useEffect } from 'react';

interface UnsubscribedLead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  title: string;
  industry: string;
  sequence_type: string;
  sequence_step: number;
  enrolled_at: string;
  exited_at: string;
  unsubscribed_at: string;
  permanently_blocked: boolean;
  hubspot_id: string;
  linkedin_url: string;
}

interface Stats {
  total: number;
  permanently_blocked: number;
  last_7_days: number;
  unsubscribe_rate: number;
}

interface TimelineEntry {
  week_start: string;
  count: number;
}

interface SectorEntry {
  sector: string;
  count: number;
}

interface StepEntry {
  step: number;
  count: number;
}

interface DomainEntry {
  domain: string;
  count: number;
  companies: string[];
}

interface Data {
  leads: UnsubscribedLead[];
  stats: Stats;
  timeline: TimelineEntry[];
  by_sector: SectorEntry[];
  by_step: StepEntry[];
  by_domain: DomainEntry[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function UnsubscribesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/unsubscribes');
        if (!res.ok) throw new Error('Fehler');
        setData(await res.json());
      } catch {
        setError('Daten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const filteredLeads = data.leads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (lead.first_name || '').toLowerCase().includes(q) ||
      (lead.last_name || '').toLowerCase().includes(q) ||
      (lead.email || '').toLowerCase().includes(q) ||
      (lead.company || '').toLowerCase().includes(q)
    );
  });

  const maxTimelineCount = Math.max(...data.timeline.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-sm text-gray-500 mb-1">Gesamt abgemeldet</p>
          <p className="text-2xl font-bold text-amber-600">{data.stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-sm text-gray-500 mb-1">Permanent gesperrt</p>
          <p className="text-2xl font-bold text-red-600">{data.stats.permanently_blocked}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-sm text-gray-500 mb-1">Letzte 7 Tage</p>
          <p className="text-2xl font-bold text-amber-600">{data.stats.last_7_days}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-sm text-gray-500 mb-1">Abmelderate</p>
          <p className="text-2xl font-bold text-[#1E3A5F]">
            {(data.stats.unsubscribe_rate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm border p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#1E3A5F] mb-4">Abmeldungen pro Woche (90 Tage)</h3>
          {data.timeline.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Daten vorhanden.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {data.timeline.map((entry) => (
                <div key={entry.week_start} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{entry.count}</span>
                  <div
                    className="w-full bg-amber-400 rounded-t"
                    style={{ height: `${(entry.count / maxTimelineCount) * 100}%`, minHeight: entry.count > 0 ? 4 : 0 }}
                  />
                  <span className="text-[10px] text-gray-400 rotate-[-45deg] origin-top-left whitespace-nowrap">
                    {new Date(entry.week_start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Sector */}
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-[#1E3A5F] mb-4">Nach Sektor</h3>
          <div className="space-y-3">
            {data.by_sector.map((s) => (
              <div key={s.sector} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-700">{s.sector}</span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {s.count}
                </span>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-[#1E3A5F] mt-6 mb-4">Nach Sequenz-Schritt</h3>
          <div className="space-y-2">
            {data.by_step.map((s) => (
              <div key={s.step} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {s.step === 0 ? 'Vor Start' : `Email ${s.step}`}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Domain */}
      {data.by_domain.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-[#1E3A5F] mb-4">Nach Domain / Firma</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-600">Domain</th>
                  <th className="text-left p-2 font-medium text-gray-600">Firmen</th>
                  <th className="text-right p-2 font-medium text-gray-600">Anzahl</th>
                </tr>
              </thead>
              <tbody>
                {data.by_domain.map((d) => (
                  <tr key={d.domain} className="border-t border-gray-100">
                    <td className="p-2 font-mono text-xs text-gray-700">{d.domain}</td>
                    <td className="p-2 text-gray-500 text-xs">
                      {Array.from(new Set(d.companies.filter(Boolean))).slice(0, 3).join(', ')}
                    </td>
                    <td className="p-2 text-right">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        {d.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Lead List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#1E3A5F]">
            Alle abgemeldeten Kontakte ({filteredLeads.length})
          </h3>
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail, Firma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Name</th>
                <th className="text-left p-3 font-medium text-gray-600">E-Mail</th>
                <th className="text-left p-3 font-medium text-gray-600">Firma</th>
                <th className="text-left p-3 font-medium text-gray-600">Sequenz</th>
                <th className="text-center p-3 font-medium text-gray-600">Schritt</th>
                <th className="text-left p-3 font-medium text-gray-600">Abgemeldet</th>
                <th className="text-center p-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400">
                    {search ? 'Keine Ergebnisse für diese Suche.' : 'Keine Abmeldungen vorhanden.'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">
                      {lead.first_name} {lead.last_name}
                      {lead.title && (
                        <span className="block text-xs text-gray-400">{lead.title}</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 text-xs font-mono">{lead.email}</td>
                    <td className="p-3 text-gray-600">{lead.company || '–'}</td>
                    <td className="p-3">
                      <span className="capitalize text-gray-500">{lead.sequence_type || '–'}</span>
                    </td>
                    <td className="p-3 text-center text-gray-500">
                      {lead.sequence_step > 0 ? `Email ${lead.sequence_step}` : '–'}
                    </td>
                    <td className="p-3 text-gray-400 text-xs">
                      {formatDate(lead.unsubscribed_at || lead.exited_at)}
                    </td>
                    <td className="p-3 text-center">
                      {lead.permanently_blocked ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Permanent gesperrt
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Abgemeldet
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DSGVO Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>DSGVO-Hinweis:</strong> Permanent gesperrte Kontakte k&ouml;nnen nicht erneut in Sequenzen aufgenommen werden.
          Bei Abmeldung wird der Kontakt dauerhaft blockiert und erh&auml;lt keine weiteren E-Mails.
          Gem&auml;&szlig; UWG &sect;7 und DSGVO Art. 21 muss dieser Wunsch jederzeit respektiert werden.
        </p>
      </div>
    </div>
  );
}
