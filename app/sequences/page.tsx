'use client';

import { useState, useEffect, useCallback } from 'react';

// Typen
interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string;
  title: string;
  industry: string;
  agent_score: number;
  pipeline_stage: string;
  pipeline_notes: string;
  blocked_until: string | null;
  block_reason: string | null;
  signal_email_reply: boolean;
  signal_linkedin_interest: boolean;
  linkedin_url: string | null;
  website_url: string | null;
}

// Block-Dialog Komponente
function BlockDialog({
  lead,
  onBlock,
  onClose,
}: {
  lead: Lead;
  onBlock: (reason: string, months: number, notes: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('no_interest');
  const [months, setMonths] = useState(9);
  const [notes, setNotes] = useState('');

  // Dauer automatisch anpassen
  useEffect(() => {
    if (reason === 'wrong_timing') setMonths(3);
    else setMonths(9);
  }, [reason]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Lead blockieren: {lead.first_name} {lead.last_name}
        </h3>
        <p className="text-sm text-gray-600 mb-4">{lead.company}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Grund</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="no_interest">Kein Interesse (9 Monate)</option>
              <option value="wrong_timing">Falscher Zeitpunkt (3 Monate)</option>
              <option value="manual_stop">Manuell gestoppt (9 Monate)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dauer (Monate)</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value, 10))}
              min={1}
              max={24}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notiz (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={2}
              placeholder="Optionaler Kommentar..."
            />
          </div>

          <p className="text-sm text-orange-600">
            Alle Leads der Firma &quot;{lead.company}&quot; werden ebenfalls blockiert.
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onBlock(reason, months, notes)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Blockieren
          </button>
        </div>
      </div>
    </div>
  );
}

// OOO-Dialog Komponente
function OOODialog({
  lead,
  onPause,
  onClose,
}: {
  lead: Lead;
  onPause: (resumeDate: string) => void;
  onClose: () => void;
}) {
  const [resumeDate, setResumeDate] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          OOO Pause: {lead.first_name} {lead.last_name}
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1">Rueckkehr-Datum</label>
          <input
            type="date"
            value={resumeDate}
            onChange={(e) => setResumeDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
            Abbrechen
          </button>
          <button
            onClick={() => resumeDate && onPause(resumeDate)}
            disabled={!resumeDate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Pausieren
          </button>
        </div>
      </div>
    </div>
  );
}

// Lead-Karte Komponente
function LeadCard({
  lead,
  onBlock,
  onBook,
  onPause,
}: {
  lead: Lead;
  onBlock: () => void;
  onBook: () => void;
  onPause: () => void;
}) {
  const stageColors: Record<string, string> = {
    'Neu': 'bg-gray-100 text-gray-800',
    'In Outreach': 'bg-blue-100 text-blue-800',
    'Replied': 'bg-green-100 text-green-800',
    'Booked': 'bg-purple-100 text-purple-800',
    'Blocked': 'bg-red-100 text-red-800',
    'Customer': 'bg-emerald-100 text-emerald-800',
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">
            {lead.first_name} {lead.last_name}
          </h3>
          <p className="text-sm text-gray-600">{lead.title} - {lead.company}</p>
          <p className="text-sm text-gray-500">{lead.email}</p>
          {lead.phone && (
            <p className="text-sm text-gray-500">Tel: {lead.phone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${stageColors[lead.pipeline_stage] || 'bg-gray-100'}`}>
            {lead.pipeline_stage}
          </span>
          <span className="text-sm font-bold">Score: {lead.agent_score}</span>
        </div>
      </div>

      {/* Signals */}
      <div className="flex gap-2 mt-2">
        {lead.signal_email_reply && (
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Email-Antwort</span>
        )}
        {lead.signal_linkedin_interest && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">LinkedIn-Interesse</span>
        )}
        {lead.blocked_until && (
          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
            Gesperrt bis {new Date(lead.blocked_until).toLocaleDateString('de-DE')}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t">
        <button
          onClick={onBook}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Termin gebucht
        </button>
        <button
          onClick={onBlock}
          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Stoppen
        </button>
        <button
          onClick={onPause}
          className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
        >
          OOO Pause
        </button>
        {lead.linkedin_url && (
          <a
            href={lead.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

// Hauptseite
export default function SequencesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [blockTarget, setBlockTarget] = useState<Lead | null>(null);
  const [oooTarget, setOOOTarget] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageFilter !== 'all') params.set('stage', stageFilter);

      const res = await fetch(`/api/leads/manage?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleBlock = async (reason: string, months: number, notes: string) => {
    if (!blockTarget) return;
    try {
      await fetch(`/api/leads/${blockTarget.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, duration_months: months, notes, block_company: true }),
      });
      setBlockTarget(null);
      loadLeads();
    } catch (err) {
      console.error('Block-Fehler:', err);
    }
  };

  const handleBook = async (lead: Lead) => {
    try {
      await fetch(`/api/leads/${lead.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      loadLeads();
    } catch (err) {
      console.error('Booking-Fehler:', err);
    }
  };

  const handlePause = async (resumeDate: string) => {
    if (!oooTarget) return;
    try {
      await fetch(`/api/leads/${oooTarget.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_date: resumeDate, reason: 'ooo' }),
      });
      setOOOTarget(null);
      loadLeads();
    } catch (err) {
      console.error('Pause-Fehler:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Lead-Verwaltung</h1>

      {/* Filter */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Suche nach Name, Firma, Email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded px-4 py-2"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="border rounded px-4 py-2"
        >
          <option value="all">Alle Stages</option>
          <option value="Neu">Neu</option>
          <option value="In Outreach">In Outreach</option>
          <option value="Replied">Replied</option>
          <option value="Booked">Booked</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>

      {/* Lead-Liste */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Laden...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Keine Leads gefunden</div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onBlock={() => setBlockTarget(lead)}
              onBook={() => handleBook(lead)}
              onPause={() => setOOOTarget(lead)}
            />
          ))}
        </div>
      )}

      {/* Dialoge */}
      {blockTarget && (
        <BlockDialog
          lead={blockTarget}
          onBlock={handleBlock}
          onClose={() => setBlockTarget(null)}
        />
      )}
      {oooTarget && (
        <OOODialog
          lead={oooTarget}
          onPause={handlePause}
          onClose={() => setOOOTarget(null)}
        />
      )}
    </div>
  );
}
