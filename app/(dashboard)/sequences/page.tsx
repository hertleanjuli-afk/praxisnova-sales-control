'use client';

import { useState, useEffect, useCallback } from 'react';

interface SequenceLead {
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  sequence_type: string;
  sequence_step: number;
  sequence_status: string;
  enrolled_at: string;
  lead_score: number;
}

type SectorFilter = 'all' | 'immobilien' | 'handwerk' | 'bauunternehmen' | 'inbound' | 'allgemein';
type StatusFilter = 'all' | 'active' | 'completed';

const SECTOR_TABS: { value: SectorFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'immobilien', label: 'Immobilien' },
  { value: 'handwerk', label: 'Handwerk' },
  { value: 'bauunternehmen', label: 'Bauunternehmen' },
  { value: 'allgemein', label: 'Allgemein' },
  { value: 'inbound', label: 'Inbound' },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
];

const STOP_REASONS = [
  { value: 'linkedin_contact', label: 'LinkedIn-Kontakt aufgenommen' },
  { value: 'phone_contact', label: 'Telefonisch kontaktiert' },
  { value: 'no_interest', label: 'Kein Interesse' },
  { value: 'wrong_contact', label: 'Falscher Ansprechpartner' },
  { value: 'other', label: 'Anderer Grund' },
];

export default function SequencesPage() {
  const [leads, setLeads] = useState<SequenceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Stop modal state
  const [showStopModal, setShowStopModal] = useState<number | null>(null);
  const [stopReason, setStopReason] = useState('');
  const [stopDetails, setStopDetails] = useState('');
  const [stoppingId, setStoppingId] = useState<number | null>(null);

  // Call modal state
  const [showCallModal, setShowCallModal] = useState<number | null>(null);
  const [callResult, setCallResult] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callDateTime, setCallDateTime] = useState('');
  const [savingCall, setSavingCall] = useState(false);

  const fetchSequences = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (sectorFilter !== 'all') params.set('sector', sectorFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/sequences/status?${params}`);
      if (!res.ok) throw new Error('Fehler');
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch {
      setError('Sequenzdaten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [sectorFilter, statusFilter]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const openStopModal = (leadId: number) => {
    setShowStopModal(leadId);
    setStopReason('');
    setStopDetails('');
  };

  const handleStopConfirm = async () => {
    if (!showStopModal || !stopReason) return;
    const leadId = showStopModal;
    setStoppingId(leadId);
    try {
      const res = await fetch('/api/sequences/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          reason: 'manual_stop',
          stop_reason: stopReason,
          stop_details: stopDetails,
        }),
      });
      if (!res.ok) throw new Error('Stop failed');
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, sequence_status: 'stopped' } : l
        )
      );
      setShowStopModal(null);
      setStopReason('');
      setStopDetails('');
    } catch {
      setError('Sequenz konnte nicht gestoppt werden.');
    } finally {
      setStoppingId(null);
    }
  };

  const handleBooked = async (leadId: number) => {
    setBookingId(leadId);
    try {
      const res = await fetch('/api/sequences/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, reason: 'booked' }),
      });
      if (!res.ok) throw new Error('Booking failed');
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, sequence_status: 'booked' } : l
        )
      );
    } catch {
      setError('Status konnte nicht aktualisiert werden.');
    } finally {
      setBookingId(null);
    }
  };

  const openCallModal = (leadId: number) => {
    setShowCallModal(leadId);
    setCallResult('');
    setCallNotes('');
    // Pre-fill with current date/time
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    setCallDateTime(local.toISOString().slice(0, 16));
  };

  const handleCallSave = async () => {
    if (!showCallModal || !callResult) return;
    const leadId = showCallModal;
    setSavingCall(true);
    try {
      const res = await fetch('/api/leads/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          result: callResult,
          notes: callNotes,
          dateTime: callDateTime,
        }),
      });
      if (!res.ok) throw new Error('Call save failed');
      if (callResult === 'appointment') {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, sequence_status: 'booked' } : l
          )
        );
      }
      setShowCallModal(null);
      setCallResult('');
      setCallNotes('');
    } catch {
      setError('Anruf konnte nicht gespeichert werden.');
    } finally {
      setSavingCall(false);
    }
  };

  const getStepLabel = (step: number, type: string) => {
    const maxSteps = type === 'inbound' ? 4 : 5;
    return `Schritt ${step} / ${maxSteps}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Aktiv
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Abgeschlossen
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            Gestoppt
          </span>
        );
      case 'booked':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Termin gebucht
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
            Antwort erhalten
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sector filter */}
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {SECTOR_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSectorFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sectorFilter === tab.value
                  ? 'bg-[#2563EB] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {!loading && leads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...leads].sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0)).map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </h3>
                  <p className="text-xs text-gray-500">{lead.company}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(lead.sequence_status)}
                  {lead.lead_score > 0 && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lead.lead_score >= 30 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {lead.lead_score} Punkte
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-[#1E3A5F]">Typ:</span>{' '}
                  {lead.sequence_type}
                </p>
                <p>
                  <span className="font-medium text-[#1E3A5F]">Fortschritt:</span>{' '}
                  {getStepLabel(lead.sequence_step, lead.sequence_type)}
                </p>
                {lead.enrolled_at && (
                  <p>
                    <span className="font-medium text-[#1E3A5F]">Gestartet:</span>{' '}
                    {new Date(lead.enrolled_at).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-[#2563EB] h-2 rounded-full transition-all"
                  style={{
                    width: `${(lead.sequence_step / (lead.sequence_type === 'inbound' ? 4 : 5)) * 100}%`,
                  }}
                />
              </div>

              {lead.sequence_status === 'active' && (
                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBooked(lead.id)}
                      disabled={bookingId === lead.id}
                      className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {bookingId === lead.id ? 'Wird gespeichert...' : 'Termin gebucht'}
                    </button>
                    <button
                      onClick={() => openCallModal(lead.id)}
                      className="flex-1 rounded-md border border-[#2563EB] bg-white px-3 py-1.5 text-sm font-medium text-[#2563EB] hover:bg-blue-50 transition-colors"
                    >
                      Anruf erfassen
                    </button>
                  </div>
                  <button
                    onClick={() => openStopModal(lead.id)}
                    className="w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sequenz stoppen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && leads.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">
            Keine Sequenzen für die ausgewählten Filter gefunden.
          </p>
        </div>
      )}

      {/* Stop Modal */}
      {showStopModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
              Sequenz stoppen
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grund <span className="text-red-500">*</span>
                </label>
                <select
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                >
                  <option value="">Bitte wählen...</option>
                  {STOP_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {stopReason === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details
                  </label>
                  <textarea
                    value={stopDetails}
                    onChange={(e) => setStopDetails(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none resize-none"
                    placeholder="Bitte beschreiben Sie den Grund..."
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleStopConfirm}
                  disabled={!stopReason || stoppingId === showStopModal}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {stoppingId === showStopModal
                    ? 'Wird gestoppt...'
                    : 'Sequenz stoppen'}
                </button>
                <button
                  onClick={() => {
                    setShowStopModal(null);
                    setStopReason('');
                    setStopDetails('');
                  }}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
              Anruf erfassen
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum/Uhrzeit
                </label>
                <input
                  type="datetime-local"
                  value={callDateTime}
                  onChange={(e) => setCallDateTime(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ergebnis <span className="text-red-500">*</span>
                </label>
                <select
                  value={callResult}
                  onChange={(e) => setCallResult(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                >
                  <option value="">Bitte wählen...</option>
                  <option value="reached">Erreicht</option>
                  <option value="not_reached">Nicht erreicht</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="appointment">Termin vereinbart</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notiz
                </label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none resize-none"
                  placeholder="Notizen zum Anruf..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCallSave}
                  disabled={!callResult || savingCall}
                  className="flex-1 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingCall ? 'Wird gespeichert...' : 'Anruf speichern'}
                </button>
                <button
                  onClick={() => {
                    setShowCallModal(null);
                    setCallResult('');
                    setCallNotes('');
                  }}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
