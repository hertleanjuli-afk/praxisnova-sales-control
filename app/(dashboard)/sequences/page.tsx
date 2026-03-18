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
}

type SectorFilter = 'all' | 'Immobilien' | 'Handwerk' | 'Bauunternehmen' | 'inbound';
type StatusFilter = 'all' | 'active' | 'completed';

const SECTOR_TABS: { value: SectorFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'Immobilien', label: 'Immobilien' },
  { value: 'Handwerk', label: 'Handwerk' },
  { value: 'Bauunternehmen', label: 'Bauunternehmen' },
  { value: 'inbound', label: 'Inbound' },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
];

export default function SequencesPage() {
  const [leads, setLeads] = useState<SequenceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stoppingId, setStoppingId] = useState<number | null>(null);

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

  const handleStop = async (leadId: number) => {
    setStoppingId(leadId);
    try {
      const res = await fetch('/api/sequences/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error('Stop failed');
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, sequence_status: 'stopped' } : l
        )
      );
    } catch {
      setError('Sequenz konnte nicht gestoppt werden.');
    } finally {
      setStoppingId(null);
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
          {leads.map((lead) => (
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
                {getStatusBadge(lead.sequence_status)}
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
                <button
                  onClick={() => handleStop(lead.id)}
                  disabled={stoppingId === lead.id}
                  className="mt-auto w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {stoppingId === lead.id ? 'Wird gestoppt...' : 'Sequenz stoppen'}
                </button>
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
    </div>
  );
}
