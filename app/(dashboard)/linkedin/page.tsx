'use client';

import { useState, useEffect } from 'react';

type LinkedInStatus = 'request_sent' | 'connected' | 'message_sent' | null;

interface LinkedInLead {
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  linkedin_url: string;
  industry: string;
  created_at: string;
  linkedin_status: LinkedInStatus;
  linkedin_request_date: string | null;
  linkedin_connected_date: string | null;
  linkedin_message: string | null;
  linkedin_message_date: string | null;
}

interface LinkedInData {
  leads: LinkedInLead[];
  week: string;
  generated_at: string;
}

const INDUSTRY_ORDER = ['Immobilien', 'Handwerk', 'Bauunternehmen'];

function formatDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('de-DE');
}

function getLinkedInSearchUrl(lead: LinkedInLead): string {
  const keywords = [lead.first_name, lead.last_name, lead.company]
    .filter(Boolean)
    .join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

export default function LinkedInPage() {
  const [data, setData] = useState<LinkedInData | null>(null);
  const [leads, setLeads] = useState<LinkedInLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchList() {
      try {
        const res = await fetch('/api/linkedin/list');
        if (!res.ok) throw new Error('Fehler beim Laden');
        const json: LinkedInData = await res.json();
        setData(json);
        setLeads(json.leads);
      } catch {
        setError('LinkedIn-Liste konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }
    fetchList();
  }, []);

  useEffect(() => {
    if (!copiedToast) return;
    const timer = setTimeout(() => setCopiedToast(false), 2500);
    return () => clearTimeout(timer);
  }, [copiedToast]);

  const handleStatusUpdate = async (leadId: number, action: string, message?: string) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;
        const now = new Date().toISOString();
        if (action === 'request_sent') {
          return { ...lead, linkedin_status: 'request_sent' as LinkedInStatus, linkedin_request_date: now };
        }
        if (action === 'connected') {
          return { ...lead, linkedin_status: 'connected' as LinkedInStatus, linkedin_connected_date: now };
        }
        if (action === 'message_sent') {
          return {
            ...lead,
            linkedin_status: 'message_sent' as LinkedInStatus,
            linkedin_message: message || null,
            linkedin_message_date: now,
          };
        }
        return lead;
      })
    );

    try {
      const body: Record<string, string | undefined> = { leadId: String(leadId), action };
      if (message) body.message = message;
      const res = await fetch('/api/linkedin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Status update failed');
    } catch {
      setError('Status konnte nicht aktualisiert werden.');
      // Revert: refetch
      try {
        const res = await fetch('/api/linkedin/list');
        if (res.ok) {
          const json: LinkedInData = await res.json();
          setLeads(json.leads);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleSendMessage = () => {
    if (showMessageModal === null || !messageText.trim()) return;
    handleStatusUpdate(showMessageModal, 'message_sent', messageText.trim());
    setShowMessageModal(null);
    setMessageText('');
  };

  const handleCopyAll = () => {
    if (leads.length === 0) return;
    const text = leads
      .map((lead) => `${lead.first_name} ${lead.last_name} - ${lead.company}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => setCopiedToast(true));
  };

  const handleExportCSV = () => {
    if (!data || leads.length === 0) return;
    const headers = [
      'Vorname',
      'Nachname',
      'Firma',
      'Position',
      'LinkedIn URL',
      'LinkedIn-Suche',
      'Branche',
      'Status',
      'Anfrage-Datum',
      'Verbunden-Datum',
      'Nachricht-Datum',
    ];
    const rows = leads.map((lead) => [
      lead.first_name ?? '',
      lead.last_name ?? '',
      lead.company ?? '',
      lead.title ?? '',
      lead.linkedin_url ?? '',
      getLinkedInSearchUrl(lead),
      lead.industry ?? '',
      lead.linkedin_status ?? 'Offen',
      formatDate(lead.linkedin_request_date),
      formatDate(lead.linkedin_connected_date),
      formatDate(lead.linkedin_message_date),
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

  const toggleSection = (industry: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(industry)) {
        next.delete(industry);
      } else {
        next.add(industry);
      }
      return next;
    });
  };

  // Group leads by industry
  const groupedLeads: Record<string, LinkedInLead[]> = {};
  for (const lead of leads) {
    const industry = lead.industry || 'Sonstige';
    if (!groupedLeads[industry]) groupedLeads[industry] = [];
    groupedLeads[industry].push(lead);
  }
  const sortedGroups = Object.entries(groupedLeads).sort(([a], [b]) => {
    const idxA = INDUSTRY_ORDER.indexOf(a);
    const idxB = INDUSTRY_ORDER.indexOf(b);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  const getStatusBadge = (lead: LinkedInLead) => {
    switch (lead.linkedin_status) {
      case 'request_sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Anfrage gesendet
            {lead.linkedin_request_date && (
              <span className="text-blue-500">{formatDate(lead.linkedin_request_date)}</span>
            )}
          </span>
        );
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Verbunden
            {lead.linkedin_connected_date && (
              <span className="text-green-500">{formatDate(lead.linkedin_connected_date)}</span>
            )}
          </span>
        );
      case 'message_sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
            Nachricht gesendet
            {lead.linkedin_message_date && (
              <span className="text-purple-500">{formatDate(lead.linkedin_message_date)}</span>
            )}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Offen
          </span>
        );
    }
  };

  const getActionButton = (lead: LinkedInLead) => {
    switch (lead.linkedin_status) {
      case null:
      case undefined:
        return (
          <button
            onClick={() => handleStatusUpdate(lead.id, 'request_sent')}
            className="inline-flex items-center rounded-md border border-[#2563EB] bg-white px-3 py-1.5 text-xs font-medium text-[#2563EB] hover:bg-blue-50 transition-colors"
          >
            Anfrage gesendet
          </button>
        );
      case 'request_sent':
        return (
          <button
            onClick={() => handleStatusUpdate(lead.id, 'connected')}
            className="inline-flex items-center rounded-md border border-green-600 bg-white px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
          >
            Verbunden
          </button>
        );
      case 'connected':
        return (
          <button
            onClick={() => {
              setShowMessageModal(lead.id);
              setMessageText('');
            }}
            className="inline-flex items-center rounded-md border border-purple-600 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
          >
            Nachricht senden
          </button>
        );
      default:
        return null;
    }
  };

  const modalLead = leads.find((l) => l.id === showMessageModal);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {copiedToast && (
        <div className="fixed top-4 right-4 z-50 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Kopiert!
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E3A5F]">LinkedIn-Liste</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-1">
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
        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            disabled={leads.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-[#2563EB] bg-white px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Alles kopieren
          </button>
          <button
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV exportieren
          </button>
        </div>
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
      {!loading && leads.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            {leads.length} Lead(s) mit LinkedIn-Profil diese Woche
          </p>

          {sortedGroups.map(([industry, groupLeads]) => {
            const isCollapsed = collapsedSections.has(industry);
            return (
              <div
                key={industry}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(industry)}
                  className="w-full bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-[#1E3A5F]">
                    {industry}{' '}
                    <span className="text-gray-400 font-normal">
                      ({groupLeads.length})
                    </span>
                  </h3>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-5 py-2.5 font-medium text-gray-500">Name</th>
                          <th className="px-5 py-2.5 font-medium text-gray-500">Firma</th>
                          <th className="px-5 py-2.5 font-medium text-gray-500">Position</th>
                          <th className="px-5 py-2.5 font-medium text-gray-500">LinkedIn-Suche</th>
                          <th className="px-5 py-2.5 font-medium text-gray-500">Status</th>
                          <th className="px-5 py-2.5 font-medium text-gray-500">Aktion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupLeads.map((lead) => (
                          <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                            <td className="px-5 py-2.5 font-medium text-gray-900">
                              {lead.first_name} {lead.last_name}
                            </td>
                            <td className="px-5 py-2.5 text-gray-600">{lead.company}</td>
                            <td className="px-5 py-2.5 text-gray-600">{lead.title}</td>
                            <td className="px-5 py-2.5">
                              <a
                                href={getLinkedInSearchUrl(lead)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2563EB] hover:underline text-xs"
                              >
                                Auf LinkedIn suchen
                              </a>
                            </td>
                            <td className="px-5 py-2.5">{getStatusBadge(lead)}</td>
                            <td className="px-5 py-2.5">{getActionButton(lead)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && leads.length === 0 && data && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">
            Keine LinkedIn-Leads für diese Woche gefunden.
          </p>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal !== null && modalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-1">
              Nachricht an {modalLead.first_name} {modalLead.last_name}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {modalLead.company} &middot; {modalLead.title}
            </p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="LinkedIn-Nachricht einfügen"
              rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowMessageModal(null);
                  setMessageText('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Nachricht speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
