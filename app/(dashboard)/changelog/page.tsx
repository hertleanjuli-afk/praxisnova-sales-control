'use client';

import { useState, useEffect } from 'react';

interface ChangeLogEntry {
  id: number;
  change_date: string;
  change_type: string;
  change_description: string;
  changed_by: string;
  expected_impact: string | null;
  actual_impact: string | null;
  created_at: string;
}

const CHANGE_TYPES = [
  'Sequenz',
  'E-Mail Template',
  'Timing',
  'Sektor',
  'LinkedIn',
  'Sonstiges',
];

const CHANGE_TYPE_COLORS: Record<string, string> = {
  Sequenz: 'bg-blue-100 text-blue-800',
  'E-Mail Template': 'bg-purple-100 text-purple-800',
  Timing: 'bg-yellow-100 text-yellow-800',
  Sektor: 'bg-green-100 text-green-800',
  LinkedIn: 'bg-sky-100 text-sky-800',
  Sonstiges: 'bg-gray-100 text-gray-800',
};

export default function ChangeLogPage() {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [changeDate, setChangeDate] = useState(today);
  const [changeType, setChangeType] = useState(CHANGE_TYPES[0]);
  const [changeDescription, setChangeDescription] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchEntries = () => {
    fetch('/api/changelog')
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries || []);
      })
      .catch(() => setError('Fehler beim Laden der Eintraege'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeDescription.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change_date: changeDate,
          change_type: changeType,
          change_description: changeDescription,
          expected_impact: expectedImpact || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      setSuccess('Aenderung erfolgreich gespeichert');
      setChangeDescription('');
      setExpectedImpact('');
      setChangeDate(today);
      setChangeType(CHANGE_TYPES[0]);
      fetchEntries();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActualImpactSave = async (id: number) => {
    try {
      const res = await fetch(`/api/changelog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_impact: editValue || null }),
      });

      if (!res.ok) throw new Error('Fehler beim Speichern');

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, actual_impact: editValue || null } : e
        )
      );
      setEditingId(null);
    } catch {
      setError('Fehler beim Speichern der tatsaechlichen Auswirkung');
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E3A5F] mb-6">Change Log</h1>
      <p className="text-sm text-gray-500 mb-6">
        Dokumentiere alle Aenderungen an Sequenzen, Templates und Strategie
      </p>

      {/* Success / Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Add Change Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">
          Neue Aenderung erfassen
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum
              </label>
              <input
                type="date"
                value={changeDate}
                onChange={(e) => setChangeDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ
              </label>
              <select
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              >
                {CHANGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <textarea
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              placeholder="Was wurde geaendert?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Erwartete Auswirkung
            </label>
            <textarea
              value={expectedImpact}
              onChange={(e) => setExpectedImpact(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              placeholder="Welche Auswirkung wird erwartet?"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !changeDescription.trim()}
            className="bg-[#2563EB] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Speichern...' : 'Aenderung speichern'}
          </button>
        </form>
      </div>

      {/* Change Log Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            Noch keine Aenderungen dokumentiert
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Datum</th>
                  <th className="text-left p-3">Typ</th>
                  <th className="text-left p-3">Beschreibung</th>
                  <th className="text-left p-3">Erwartete Auswirkung</th>
                  <th className="text-left p-3">Tatsaechliche Auswirkung</th>
                  <th className="text-left p-3">Erstellt von</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="p-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(entry.change_date)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          CHANGE_TYPE_COLORS[entry.change_type] ||
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {entry.change_type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700 max-w-xs">
                      {entry.change_description}
                    </td>
                    <td className="p-3 text-gray-500 max-w-xs text-xs">
                      {entry.expected_impact || (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>
                    <td
                      className="p-3 max-w-xs text-xs cursor-pointer"
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditValue(entry.actual_impact || '');
                      }}
                    >
                      {editingId === entry.id ? (
                        <textarea
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleActualImpactSave(entry.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleActualImpactSave(entry.id);
                            }
                            if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          rows={2}
                          className="w-full border border-[#2563EB] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                        />
                      ) : entry.actual_impact ? (
                        <span className="text-gray-700">
                          {entry.actual_impact}
                        </span>
                      ) : (
                        <span className="text-gray-300 italic hover:text-gray-500">
                          Klicken zum Bearbeiten
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 whitespace-nowrap text-xs">
                      {entry.changed_by}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
