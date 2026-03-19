'use client';

import { useState } from 'react';
import LeadSearchPanel from '@/components/LeadSearchPanel';
import LeadCard from '@/components/LeadCard';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  title: string;
  industry: string;
  employee_count: number | null;
  linkedin_url: string;
  status: string;
  cooldown_days?: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Manual lead form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    title: '',
    industry: '',
    employee_count: '',
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  const handleSearch = async (filters: {
    sector: string;
    state?: string;
    limit: number;
  }) => {
    setLoading(true);
    setSelectedIds(new Set());
    setNotification(null);
    try {
      const params = new URLSearchParams({
        sector: filters.sector,
        limit: String(filters.limit),
      });
      if (filters.state) params.set('state', filters.state);

      const res = await fetch(`/api/leads/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Suche fehlgeschlagen');
      setLeads(data.results ?? data.leads ?? []);
      setSearched(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler bei der Lead-Suche.';
      setNotification({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnrollSingle = async (lead: Lead) => {
    setEnrolling(true);
    setNotification(null);
    try {
      const res = await fetch('/api/leads/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: [lead.id] }),
      });
      if (!res.ok) throw new Error('Enrollment failed');
      setNotification({
        type: 'success',
        message: `${lead.first_name} ${lead.last_name} zur Sequenz hinzugefügt.`,
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, status: 'in_sequence' } : l
        )
      );
    } catch {
      setNotification({ type: 'error', message: 'Fehler beim Hinzufügen.' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedIds.size === 0) return;
    setEnrolling(true);
    setNotification(null);
    try {
      const res = await fetch('/api/leads/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Enrollment failed');
      setNotification({
        type: 'success',
        message: `${selectedIds.size} Lead(s) zur Sequenz hinzugefügt.`,
      });
      setLeads((prev) =>
        prev.map((l) =>
          selectedIds.has(l.id) ? { ...l, status: 'in_sequence' } : l
        )
      );
      setSelectedIds(new Set());
    } catch {
      setNotification({
        type: 'error',
        message: 'Fehler beim Hinzufügen der Leads.',
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFormData.email || !manualFormData.industry) return;
    setSubmittingManual(true);
    setNotification(null);
    try {
      const res = await fetch('/api/leads/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: manualFormData.first_name,
          last_name: manualFormData.last_name,
          email: manualFormData.email,
          company: manualFormData.company,
          title: manualFormData.title,
          industry: manualFormData.industry,
          employee_count: manualFormData.employee_count
            ? Number(manualFormData.employee_count)
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Fehler beim Erstellen des Leads');
      }
      setNotification({
        type: 'success',
        message: 'Lead wurde erfolgreich hinzugefügt und Sequenz gestartet.',
      });
      setShowManualForm(false);
      setManualFormData({
        first_name: '',
        last_name: '',
        email: '',
        company: '',
        title: '',
        industry: '',
        employee_count: '',
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Fehler beim Erstellen des Leads.';
      setNotification({ type: 'error', message: msg });
    } finally {
      setSubmittingManual(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Search Panel */}
      <LeadSearchPanel onSearch={handleSearch} loading={loading} />

      {/* Results */}
      <div className="flex-1">
        {/* Header with manual add button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">Leads</h2>
          <button
            onClick={() => setShowManualForm((prev) => !prev)}
            className="rounded-md border border-[#2563EB] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-blue-50 transition-colors"
          >
            + Lead manuell hinzufügen
          </button>
        </div>

        {/* Manual lead form */}
        {showManualForm && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">
              Lead manuell hinzufügen
            </h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={manualFormData.first_name}
                    onChange={(e) =>
                      setManualFormData((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={manualFormData.last_name}
                    onChange={(e) =>
                      setManualFormData((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={manualFormData.email}
                  onChange={(e) =>
                    setManualFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                  placeholder="max@beispiel.de"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firma
                  </label>
                  <input
                    type="text"
                    value={manualFormData.company}
                    onChange={(e) =>
                      setManualFormData((prev) => ({
                        ...prev,
                        company: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                    placeholder="Firma GmbH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={manualFormData.title}
                    onChange={(e) =>
                      setManualFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                    placeholder="Geschäftsführer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branche <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={manualFormData.industry}
                    onChange={(e) =>
                      setManualFormData((prev) => ({
                        ...prev,
                        industry: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                  >
                    <option value="">Bitte wählen...</option>
                    <option value="Immobilien">Immobilien</option>
                    <option value="Handwerk">Handwerk</option>
                    <option value="Bauunternehmen">Bauunternehmen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mitarbeiterzahl
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualFormData.employee_count}
                    onChange={(e) =>
                      setManualFormData((prev) => ({
                        ...prev,
                        employee_count: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                    placeholder="z.B. 25"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="w-full rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingManual
                    ? 'Wird hinzugefügt...'
                    : 'Lead hinzufügen und Sequenz starten'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 rounded-md border p-3 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <p className="text-sm">{notification.message}</p>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
            <span className="text-sm text-blue-800 font-medium">
              {selectedIds.size} ausgewählt
            </span>
            <button
              onClick={handleBulkEnroll}
              disabled={enrolling}
              className="rounded-md bg-[#2563EB] px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {enrolling
                ? 'Wird hinzugefügt...'
                : 'Ausgewählte zur Sequenz hinzufügen'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-48 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-40 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-36" />
              </div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && leads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                selected={selectedIds.has(lead.id)}
                onSelect={toggleSelect}
                onEnroll={handleEnrollSingle}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && leads.length === 0 && (
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="mt-3 text-sm text-gray-500">
              Keine Leads gefunden. Versuchen Sie andere Suchkriterien.
            </p>
          </div>
        )}

        {/* Initial state */}
        {!loading && !searched && (
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="mt-3 text-sm text-gray-500">
              Wählen Sie einen Sektor und starten Sie die Suche.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
