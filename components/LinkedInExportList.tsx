'use client';

import { useState } from 'react';

interface LinkedInExportListProps {
  leads: any[];
  week: string;
  generatedAt: string;
}

const SECTORS = ['Immobilien', 'Handwerk', 'Bauunternehmen'];

function downloadCSV(leads: any[]) {
  const header = 'Name,Firma,Position,LinkedIn URL,Sektor,Datum';
  const rows = leads.map((lead) => {
    const name = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim();
    const escape = (val: string) => `"${(val ?? '').replace(/"/g, '""')}"`;
    return [
      escape(name),
      escape(lead.company ?? ''),
      escape(lead.position ?? ''),
      escape(lead.linkedin_url ?? ''),
      escape(lead.sector ?? ''),
      escape(lead.date_added ?? ''),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `linkedin-aufgaben-kw${leads.length > 0 ? '' : ''}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function LinkedInExportList({ leads, week, generatedAt }: LinkedInExportListProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [collapsedSectors, setCollapsedSectors] = useState<Set<string>>(new Set());

  const toggleCompleted = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSector = (sector: string) => {
    setCollapsedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  };

  const groupedBySector = SECTORS.map((sector) => ({
    sector,
    items: leads.filter((l) => l.sector === sector),
  }));

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">Keine LinkedIn-Aufgaben für diese Woche vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1E3A5F]">
            LinkedIn-Aufgaben – KW {week}
          </h2>
          <p className="text-xs text-gray-500">Generiert am {generatedAt}</p>
        </div>
        <button
          onClick={() => downloadCSV(leads)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV exportieren
        </button>
      </div>

      {/* Sector sections */}
      {groupedBySector.map(({ sector, items }) => {
        if (items.length === 0) return null;
        const isCollapsed = collapsedSectors.has(sector);

        return (
          <div key={sector} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Sector header */}
            <button
              onClick={() => toggleSector(sector)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-[#1E3A5F]">
                {sector} ({items.length})
              </span>
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Entries */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {/* Table header */}
                <div className="hidden sm:grid sm:grid-cols-6 gap-2 px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50/50">
                  <span>Name</span>
                  <span>Firma</span>
                  <span>Position</span>
                  <span>LinkedIn</span>
                  <span>Hinzugefügt</span>
                  <span>Erledigt</span>
                </div>

                {items.map((lead: any) => {
                  const id = lead.id?.toString() ?? `${lead.first_name}-${lead.last_name}`;
                  const fullName = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim();

                  return (
                    <div
                      key={id}
                      className={`grid grid-cols-1 sm:grid-cols-6 gap-1 sm:gap-2 px-4 py-3 text-sm items-center ${
                        completedIds.has(id) ? 'bg-green-50 opacity-60' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-900">{fullName}</span>
                      <span className="text-gray-700">{lead.company ?? '-'}</span>
                      <span className="text-gray-700">{lead.position ?? '-'}</span>
                      <a
                        href={lead.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline truncate"
                      >
                        Profil
                      </a>
                      <span className="text-gray-500 text-xs">{lead.date_added ?? '-'}</span>
                      <div>
                        <input
                          type="checkbox"
                          checked={completedIds.has(id)}
                          onChange={() => toggleCompleted(id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                          aria-label="Als erledigt markieren"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
