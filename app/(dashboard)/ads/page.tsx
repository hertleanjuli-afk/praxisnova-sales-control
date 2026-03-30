'use client';

const PLACEHOLDER_KPIS = [
  { label: 'Werbeausgaben', value: '--- EUR', icon: '~' },
  { label: 'Leads generiert', value: '---', icon: '~' },
  { label: 'Kosten pro Lead', value: '--- EUR', icon: '~' },
  { label: 'Conversion Rate', value: '---%', icon: '~' },
];

const PLACEHOLDER_SOURCES = [
  { source: 'Organisch', leads: '---', cost: '---', conversion: '---' },
  { source: 'TikTok Ads', leads: '---', cost: '---', conversion: '---' },
  { source: 'LinkedIn Ads', leads: '---', cost: '---', conversion: '---' },
  { source: 'Website Pop-up', leads: '---', cost: '---', conversion: '---' },
];

export default function AdsPage() {
  return (
    <div className="space-y-6">
      {/* Module not active banner */}
      <div className="rounded-md bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div>
          <h3 className="text-sm font-semibold text-amber-800">
            Modul noch nicht aktiviert
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            Dieses Modul wird in Phase 2 aktiviert. Ändern Sie{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">
              TIKTOK_MODULE_ENABLED=true
            </code>{' '}
            in den Umgebungsvariablen.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLACEHOLDER_KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6 opacity-60"
          >
            <p className="text-sm text-[#888] mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#555]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder chart */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
        <h3 className="text-base font-semibold text-[#F0F0F5] mb-4">
          Wöchentliche Werbeausgaben vs. Leads
        </h3>
        <div className="border-2 border-dashed border-[#1E1E1E] rounded-lg h-64 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-10 w-10 text-[#555] mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm text-[#666]">
              Diagramm wird verfügbar, sobald das Modul aktiviert ist.
            </p>
          </div>
        </div>
      </div>

      {/* Lead source tracking table */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
        <h3 className="text-base font-semibold text-[#F0F0F5] mb-4">
          Lead-Quellen Tracking
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                <th className="pb-3 font-medium text-[#888]">Quelle</th>
                <th className="pb-3 font-medium text-[#888] text-right">Leads</th>
                <th className="pb-3 font-medium text-[#888] text-right">Kosten</th>
                <th className="pb-3 font-medium text-[#888] text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_SOURCES.map((row) => (
                <tr
                  key={row.source}
                  className="border-b border-[#1E1E1E] last:border-0 opacity-50"
                >
                  <td className="py-3 font-medium text-[#ccc]">{row.source}</td>
                  <td className="py-3 text-right text-[#666]">{row.leads}</td>
                  <td className="py-3 text-right text-[#666]">{row.cost}</td>
                  <td className="py-3 text-right text-[#666]">{row.conversion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
