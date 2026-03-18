'use client';

import { useState, useEffect } from 'react';

interface InboundLead {
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  title: string;
  sequence_status: string;
  sequence_step: number;
  enrolled_at: string;
}

export default function InboundPage() {
  const [leads, setLeads] = useState<InboundLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInbound() {
      try {
        const res = await fetch('/api/sequences/status?sector=inbound');
        if (!res.ok) throw new Error('Fehler');
        const data = await res.json();
        setLeads(data.leads ?? []);
      } catch {
        setError('Eingehende Leads konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }
    fetchInbound();
  }, []);

  const pendingLeads = leads.filter(
    (l) => l.sequence_status === 'pending' || l.sequence_step === 0
  );
  const activeLeads = leads.filter(
    (l) => l.sequence_status === 'active' && l.sequence_step > 0
  );

  const renderLeadCard = (lead: InboundLead) => (
    <div
      key={lead.id}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col gap-2"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {lead.first_name} {lead.last_name}
          </h3>
          {lead.title && <p className="text-xs text-gray-500">{lead.title}</p>}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            lead.sequence_status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {lead.sequence_status === 'active' ? 'Aktiv' : 'Wartend'}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        {lead.company && (
          <p>
            <span className="font-medium text-[#1E3A5F]">Firma:</span> {lead.company}
          </p>
        )}
        <p>
          <span className="font-medium text-[#1E3A5F]">Schritt:</span>{' '}
          {lead.sequence_step} / 4
        </p>
        {lead.enrolled_at && (
          <p>
            <span className="font-medium text-[#1E3A5F]">Eingegangen:</span>{' '}
            {new Date(lead.enrolled_at).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
        <div
          className="bg-[#2563EB] h-1.5 rounded-full transition-all"
          style={{ width: `${(lead.sequence_step / 4) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
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
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Pending section */}
          <section>
            <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">
              Warte auf Bestätigung
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({pendingLeads.length})
              </span>
            </h3>
            {pendingLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingLeads.map(renderLeadCard)}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">
                  Keine wartenden Leads vorhanden.
                </p>
              </div>
            )}
          </section>

          {/* Active section */}
          <section>
            <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">
              Aktive Sequenzen
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({activeLeads.length})
              </span>
            </h3>
            {activeLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeLeads.map(renderLeadCard)}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">
                  Keine aktiven Inbound-Sequenzen.
                </p>
              </div>
            )}
          </section>

          {/* Global empty state */}
          {leads.length === 0 && (
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
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="mt-3 text-sm text-gray-500">
                Noch keine eingehenden Leads vorhanden. Leads werden über das
                Inbound-Webhook automatisch erfasst.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
