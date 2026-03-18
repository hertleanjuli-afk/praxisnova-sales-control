'use client';

import { useState, useEffect } from 'react';

interface LinkedInLead {
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  linkedin_url: string;
  industry: string;
  created_at: string;
}

interface LinkedInData {
  leads: LinkedInLead[];
  week: string;
  generated_at: string;
}

export default function LinkedInPage() {
  const [data, setData] = useState<LinkedInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchList() {
      try {
        const res = await fetch('/api/linkedin/list');
        if (!res.ok) throw new Error('Fehler beim Laden');
        const json = await res.json();
        setData(json);
      } catch {
        setError('LinkedIn-Liste konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }
    fetchList();
  }, []);

  const handleExportCSV = () => {
    if (!data || data.leads.length === 0) return;

    const headers = [
      'Vorname',
      'Nachname',
      'Firma',
      'Position',
      'LinkedIn URL',
      'Branche',
    ];
    const rows = data.leads.map((lead) => [
      lead.first_name ?? '',
      lead.last_name ?? '',
      lead.company ?? '',
      lead.title ?? '',
      lead.linkedin_url ?? '',
      lead.industry ?? '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkedin-liste-${data.week}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Group leads by industry
  const groupedLeads: Record<string, LinkedInLead[]> = {};
  if (data) {
    for (const lead of data.leads) {
      const industry = lead.industry || 'Sonstige';
      if (!groupedLeads[industry]) groupedLeads[industry] = [];
      groupedLeads[industry].push(lead);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {data && (
            <p className="text-sm text-gray-500">
              Kalenderwoche: <span className="font-medium text-gray-700">{data.week}</span>
              {' | '}
              Generiert am:{' '}
              <span className="font-medium text-gray-700">
                {new Date(data.generated_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!data || data.leads.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV exportieren
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grouped leads */}
      {!loading && data && data.leads.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            {data.leads.length} Lead(s) mit LinkedIn-Profil diese Woche
          </p>

          {Object.entries(groupedLeads).map(([industry, leads]) => (
            <div
              key={industry}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-[#1E3A5F]">
                  {industry}{' '}
                  <span className="text-gray-400 font-normal">
                    ({leads.length})
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-2.5 font-medium text-gray-500">Name</th>
                      <th className="px-5 py-2.5 font-medium text-gray-500">Position</th>
                      <th className="px-5 py-2.5 font-medium text-gray-500">Firma</th>
                      <th className="px-5 py-2.5 font-medium text-gray-500">LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </td>
                        <td className="px-5 py-2.5 text-gray-600">{lead.title}</td>
                        <td className="px-5 py-2.5 text-gray-600">{lead.company}</td>
                        <td className="px-5 py-2.5">
                          <a
                            href={lead.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563EB] hover:underline text-xs"
                          >
                            Profil anzeigen
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.leads.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">
            Keine LinkedIn-Leads für diese Woche gefunden.
          </p>
        </div>
      )}
    </div>
  );
}
