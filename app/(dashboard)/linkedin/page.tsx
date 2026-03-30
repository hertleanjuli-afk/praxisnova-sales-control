'use client';
import { useState, useEffect } from 'react';

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  email: string;
  linkedin_url: string;
  industry: string;
  created_at: string;
  source: string | null;
  sequence_status: string | null;
  sequence_type: string | null;
  linkedin_status: string | null;
  linkedin_request_date: string | null;
  linkedin_connected_date: string | null;
  linkedin_message: string | null;
  linkedin_message_date: string | null;
  linkedin_reply: string | null;
  linkedin_reply_date: string | null;
  linkedin_no_profile_date: string | null;
}

function formatDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('de-DE');
}

function getLinkedInSearchUrl(lead: Lead): string {
  const keywords = [lead.first_name, lead.last_name, lead.company].filter(Boolean).join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

function getIndustryBadge(industry: string | null) {
  const lower = (industry || '').toLowerCase();
  switch (lower) {
    case 'immobilien':
      return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Immobilien</span>;
    case 'handwerk':
      return <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">Handwerk</span>;
    case 'bauunternehmen':
      return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Bau</span>;
    case 'inbound':
      return <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">Inbound</span>;
    case 'allgemein':
    default:
      return <span className="inline-flex items-center rounded-full bg-[#1A1A1A] px-2.5 py-0.5 text-xs font-medium text-[#ccc]">Allgemein</span>;
  }
}

function getStatusBadge(lead: Lead) {
  switch (lead.linkedin_status) {
    case 'request_sent':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          Anfrage gesendet
          {lead.linkedin_request_date && <span className="text-blue-500">{formatDate(lead.linkedin_request_date)}</span>}
        </span>
      );
    case 'connected':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Verbunden
          {lead.linkedin_connected_date && <span className="text-green-500">{formatDate(lead.linkedin_connected_date)}</span>}
        </span>
      );
    case 'message_sent':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
          Nachricht gesendet
          {lead.linkedin_message_date && <span className="text-purple-500">{formatDate(lead.linkedin_message_date)}</span>}
        </span>
      );
    case 'replied':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
          Antwort erhalten
          {lead.linkedin_reply_date && <span className="text-orange-500">{formatDate(lead.linkedin_reply_date)}</span>}
        </span>
      );
    case 'meeting_booked':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          Meeting gebucht
        </span>
      );
    case 'no_linkedin':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          Kein LinkedIn
          {lead.linkedin_no_profile_date && <span className="text-red-500">{formatDate(lead.linkedin_no_profile_date)}</span>}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-[#1A1A1A] px-2.5 py-0.5 text-xs font-medium text-[#aaa]">
          Offen
        </span>
      );
  }
}

const exportCSV = (leadsToExport: Lead[], filename: string) => {
  const headers = ['Name', 'Firma', 'Sektor', 'Position', 'E-Mail', 'LinkedIn Status', 'Datum'];
  const rows = leadsToExport.map((l) => [
    `${l.first_name || ''} ${l.last_name || ''}`.trim(),
    l.company || '',
    l.industry || '',
    l.title || '',
    l.email || '',
    l.linkedin_status || 'offen',
    l.created_at ? new Date(l.created_at).toLocaleDateString('de-DE') : '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function LinkedInPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState<{ leadId: number; type: 'message' | 'reply' } | null>(null);
  const [modalText, setModalText] = useState('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchList() {
      try {
        const res = await fetch('/api/linkedin/list');
        if (!res.ok) throw new Error('Fehler beim Laden');
        const json = await res.json();
        setLeads(json.leads || []);
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
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;
        const now = new Date().toISOString();
        switch (action) {
          case 'request_sent': return { ...lead, linkedin_status: 'request_sent', linkedin_request_date: now };
          case 'connected': return { ...lead, linkedin_status: 'connected', linkedin_connected_date: now };
          case 'message_sent': return { ...lead, linkedin_status: 'message_sent', linkedin_message: message || null, linkedin_message_date: now };
          case 'replied': return { ...lead, linkedin_status: 'replied', linkedin_reply: message || null, linkedin_reply_date: now };
          case 'meeting_booked': return { ...lead, linkedin_status: 'meeting_booked' };
          case 'no_linkedin': return { ...lead, linkedin_status: 'no_linkedin', linkedin_no_profile_date: now };
          default: return lead;
        }
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
      try {
        const res = await fetch('/api/linkedin/list');
        if (res.ok) { const json = await res.json(); setLeads(json.leads || []); }
      } catch { /* ignore */ }
    }
  };

  const handleModalSubmit = () => {
    if (!showMessageModal || !modalText.trim()) return;
    const action = showMessageModal.type === 'message' ? 'message_sent' : 'replied';
    handleStatusUpdate(showMessageModal.leadId, action, modalText.trim());
    setShowMessageModal(null);
    setModalText('');
  };

  const handleCopyAll = () => {
    if (leads.length === 0) return;
    const text = leads.map((lead) => `${lead.first_name} ${lead.last_name} - ${lead.company}`).join('\n');
    navigator.clipboard.writeText(text).then(() => setCopiedToast(true));
  };

  // Client-side filtering
  const filteredLeads = leads.filter((lead) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase().includes(q);
      const companyMatch = (lead.company || '').toLowerCase().includes(q);
      if (!nameMatch && !companyMatch) return false;
    }
    if (sectorFilter !== 'all') {
      if ((lead.industry || 'allgemein').toLowerCase() !== sectorFilter) return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'open') {
        if (lead.linkedin_status !== null && lead.linkedin_status !== undefined) return false;
      } else if ((lead.linkedin_status || '') !== statusFilter) {
        return false;
      }
    }
    return true;
  });

  const apolloLeads = filteredLeads.filter((l) => l.source === 'apollo');
  const manualLeads = filteredLeads.filter((l) => l.source !== 'apollo');

  const getActionButtons = (lead: Lead) => {
    switch (lead.linkedin_status) {
      case null:
      case undefined:
        return (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleStatusUpdate(lead.id, 'request_sent')} className="inline-flex items-center rounded-md border border-[#2563EB] bg-[#111] px-3 py-1.5 text-xs font-medium text-[#2563EB] hover:bg-blue-50 transition-colors">Anfrage gesendet</button>
            <button onClick={() => handleStatusUpdate(lead.id, 'no_linkedin')} className="rounded-md border border-red-300 bg-[#111] px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">Kein LinkedIn</button>
          </div>
        );
      case 'no_linkedin': return null;
      case 'request_sent':
        return (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleStatusUpdate(lead.id, 'connected')} className="inline-flex items-center rounded-md border border-green-600 bg-[#111] px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors">Verbunden</button>
          </div>
        );
      case 'connected':
        return (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setShowMessageModal({ leadId: lead.id, type: 'message' }); setModalText(''); }} className="inline-flex items-center rounded-md border border-purple-600 bg-[#111] px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors">Nachricht senden</button>
            <button onClick={() => handleStatusUpdate(lead.id, 'meeting_booked')} className="inline-flex items-center rounded-md border border-emerald-600 bg-[#111] px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">Meeting gebucht</button>
          </div>
        );
      case 'message_sent':
        return (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setShowMessageModal({ leadId: lead.id, type: 'reply' }); setModalText(''); }} className="inline-flex items-center rounded-md border border-orange-600 bg-[#111] px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors">Nachricht beantwortet</button>
            <button onClick={() => handleStatusUpdate(lead.id, 'meeting_booked')} className="inline-flex items-center rounded-md border border-emerald-600 bg-[#111] px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">Meeting gebucht</button>
          </div>
        );
      case 'replied':
      case 'meeting_booked':
      default:
        return null;
    }
  };

  const modalLead = showMessageModal ? leads.find((l) => l.id === showMessageModal.leadId) : null;

  const renderLeadCard = (lead: Lead) => (
    <div key={lead.id} className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
          <p className="text-xs text-[#aaa] truncate">{lead.company}</p>
        </div>
        {getIndustryBadge(lead.industry)}
      </div>
      {lead.title && <p className="text-xs text-[#888] truncate">{lead.title}</p>}
      <a href={getLinkedInSearchUrl(lead)} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline text-xs">Auf LinkedIn suchen</a>
      <div>{getStatusBadge(lead)}</div>
      {getActionButtons(lead)}
    </div>
  );

  const renderSection = (title: string, sectionLeads: Lead[], csvFilename: string) => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg font-bold text-[#F0F0F5]">{title} <span className="text-sm font-normal text-[#666]">({sectionLeads.length})</span></h2>
        <button onClick={() => exportCSV(sectionLeads, csvFilename)} disabled={sectionLeads.length === 0} className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          CSV exportieren
        </button>
      </div>
      {sectionLeads.length === 0 ? (
        <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-8 text-center"><p className="text-sm text-[#888]">Keine Leads in dieser Kategorie.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{sectionLeads.map(renderLeadCard)}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {copiedToast && (
        <div className="fixed top-4 right-4 z-50 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">Kopiert!</div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-[#F0F0F5]">LinkedIn-Liste</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopyAll} disabled={leads.length === 0} className="inline-flex items-center gap-2 rounded-md border border-[#2563EB] bg-[#111] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Alles kopieren
          </button>
          <button onClick={() => exportCSV(apolloLeads, 'apollo-leads.csv')} disabled={apolloLeads.length === 0} className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Apollo CSV</button>
          <button onClick={() => exportCSV(manualLeads, 'manuelle-leads.csv')} disabled={manualLeads.length === 0} className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Manuelle CSV</button>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Name oder Firma suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#2563EB] focus:ring-[#2563EB] focus:outline-none" />
          </div>
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-[#111] focus:border-[#2563EB] focus:ring-[#2563EB] focus:outline-none">
            <option value="all">Alle Sektoren</option>
            <option value="immobilien">Immobilien</option>
            <option value="bauunternehmen">Bau</option>
            <option value="handwerk">Handwerk</option>
            <option value="allgemein">Allgemein</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-[#111] focus:border-[#2563EB] focus:ring-[#2563EB] focus:outline-none">
            <option value="all">Alle Status</option>
            <option value="open">Offen</option>
            <option value="request_sent">Anfrage gesendet</option>
            <option value="connected">Verbunden</option>
            <option value="message_sent">Nachricht gesendet</option>
            <option value="replied">Antwort erhalten</option>
            <option value="meeting_booked">Meeting gebucht</option>
            <option value="no_linkedin">Kein LinkedIn</option>
          </select>
          {(searchQuery || sectorFilter !== 'all' || statusFilter !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setSectorFilter('all'); setStatusFilter('all'); }}
              className="rounded-md border border-gray-300 bg-[#111] px-3 py-2 text-sm font-medium text-[#aaa] hover:bg-[#0A0A0A] transition-colors whitespace-nowrap">
              Filter zurücksetzen
            </button>
          )}
        </div>
        {(searchQuery || sectorFilter !== 'all' || statusFilter !== 'all') && (
          <p className="mt-2 text-xs text-[#888]">{filteredLeads.length} von {leads.length} Leads angezeigt</p>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-5 animate-pulse">
              <div className="h-4 bg-[#1E1E1E] rounded w-32 mb-4" />
              <div className="space-y-3"><div className="h-3 bg-[#1E1E1E] rounded w-full" /><div className="h-3 bg-[#1E1E1E] rounded w-full" /><div className="h-3 bg-[#1E1E1E] rounded w-3/4" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredLeads.length > 0 && (
        <div className="space-y-10">
          {renderSection('Apollo Leads', apolloLeads, 'apollo-leads.csv')}
          {renderSection('Manuell hinzugefügt', manualLeads, 'manuelle-leads.csv')}
        </div>
      )}

      {!loading && filteredLeads.length === 0 && !error && (
        <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[#555]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          <p className="mt-3 text-sm text-[#888]">{leads.length === 0 ? 'Keine LinkedIn-Leads gefunden.' : 'Keine Leads entsprechen den Filterkriterien.'}</p>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && showMessageModal.type === 'message' && modalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#111] rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-[#F0F0F5] mb-1">LinkedIn-Nachricht &middot; {modalLead.first_name} {modalLead.last_name}</h2>
            <p className="text-sm text-[#888] mb-4">{modalLead.company} &middot; {modalLead.title}</p>
            <textarea value={modalText} onChange={(e) => setModalText(e.target.value)} placeholder="Gesendete Nachricht einfügen..." rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none resize-none" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowMessageModal(null); setModalText(''); }} className="rounded-md border border-gray-300 bg-[#111] px-4 py-2 text-sm font-medium text-[#ccc] hover:bg-[#0A0A0A] transition-colors">Abbrechen</button>
              <button onClick={handleModalSubmit} disabled={!modalText.trim()} className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Nachricht speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showMessageModal && showMessageModal.type === 'reply' && modalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#111] rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-[#F0F0F5] mb-1">LinkedIn-Antwort &middot; {modalLead.first_name} {modalLead.last_name}</h2>
            <p className="text-sm text-[#888] mb-4">{modalLead.company} &middot; {modalLead.title}</p>
            <textarea value={modalText} onChange={(e) => setModalText(e.target.value)} placeholder="Erhaltene Antwort einfügen..." rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none resize-none" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowMessageModal(null); setModalText(''); }} className="rounded-md border border-gray-300 bg-[#111] px-4 py-2 text-sm font-medium text-[#ccc] hover:bg-[#0A0A0A] transition-colors">Abbrechen</button>
              <button onClick={handleModalSubmit} disabled={!modalText.trim()} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Antwort speichern &amp; Sequenz stoppen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
