'use client';

import { useState } from 'react';

const SECTORS = ['Immobilien', 'Handwerk', 'Bauunternehmen'];

const BUNDESLAENDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

const RESULT_COUNTS = [10, 25, 50, 100];

interface LeadSearchPanelProps {
  onSearch: (filters: { sector: string; state?: string; limit: number }) => void;
  loading: boolean;
}

export default function LeadSearchPanel({ onSearch, loading }: LeadSearchPanelProps) {
  const [sector, setSector] = useState('');
  const [state, setState] = useState('');
  const [limit, setLimit] = useState(25);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sector) return;
    onSearch({
      sector: sector.toLowerCase(),
      state: state || undefined,
      limit,
    });
  };

  return (
    <aside className="w-full lg:w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-shrink-0">
      <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Lead-Suche</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sector */}
        <div>
          <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-1">
            Sektor <span className="text-red-500">*</span>
          </label>
          <select
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Bitte wählen...</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Bundesland */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            Bundesland
          </label>
          <select
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Alle Bundesländer</option>
            {BUNDESLAENDER.map((bl) => (
              <option key={bl} value={bl}>
                {bl}
              </option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">
            Anzahl Ergebnisse
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            {RESULT_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        {/* Hide already contacted toggle — always on */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hideContacted"
            checked
            disabled
            className="h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
          />
          <label htmlFor="hideContacted" className="text-sm text-gray-500">
            Bereits kontaktierte ausblenden
          </label>
        </div>

        {/* Search button */}
        <button
          type="submit"
          disabled={!sector || loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Suche läuft...
            </span>
          ) : (
            'Suchen'
          )}
        </button>
      </form>
    </aside>
  );
}
