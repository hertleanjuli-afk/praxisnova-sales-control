'use client';

import { useEffect, useState } from 'react';

interface Report {
  id: number;
  check_time: string;
  agent_statuses: Record<string, string>;
  api_statuses: Record<string, { status: string; latencyMs?: number }>;
  db_stats: Record<string, number>;
  overall_status: string;
  alerts: string[];
}

function statusColor(s: string): string {
  switch (s) {
    case 'ok':
      return 'bg-green-100 text-green-700';
    case 'warning':
    case 'degraded':
      return 'bg-yellow-100 text-yellow-700';
    case 'critical':
    case 'error':
    case 'down':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function SystemHealthPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health-reports?limit=50')
      .then((r) => r.json())
      .then((j) => setReports(j.reports ?? []))
      .finally(() => setLoading(false));
  }, []);

  const latest = reports[0];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Health</h1>

      {loading ? (
        <p>Lade...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500">Noch keine Health-Reports. Overwatch-Cron ist noch nicht gelaufen.</p>
      ) : (
        <>
          {latest && (
            <section className="mb-6 border rounded p-4 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded font-semibold ${statusColor(latest.overall_status)}`}>
                  {latest.overall_status.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  Letzter Check: {new Date(latest.check_time).toLocaleString('de-DE')}
                </span>
              </div>

              <h3 className="font-semibold mt-3 mb-1">API Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {Object.entries(latest.api_statuses ?? {}).map(([name, info]) => (
                  <div key={name} className="border rounded p-2">
                    <div className="font-mono text-sm">{name}</div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${statusColor(info.status)}`}>
                      {info.status} {info.latencyMs ? `(${info.latencyMs}ms)` : ''}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold mt-4 mb-1">Agent-Aktivitaet</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(latest.agent_statuses ?? {}).map(([name, s]) => (
                  <div key={name} className="border rounded p-2">
                    <div className="font-mono text-xs">{name}</div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${statusColor(s)}`}>
                      {s}
                    </span>
                  </div>
                ))}
              </div>

              {latest.alerts && latest.alerts.length > 0 && (
                <>
                  <h3 className="font-semibold mt-4 mb-1">Alerts</h3>
                  <ul className="list-disc pl-5 text-sm text-red-700">
                    {latest.alerts.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </>
              )}

              {latest.db_stats && (
                <div className="mt-4 text-xs text-gray-500">
                  DB: {Object.entries(latest.db_stats).map(([k, v]) => `${k}=${v}`).join(', ')}
                </div>
              )}
            </section>
          )}

          <h2 className="font-semibold mb-2">Historie</h2>
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Zeit</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{new Date(r.check_time).toLocaleString('de-DE')}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor(r.overall_status)}`}>
                      {r.overall_status}
                    </span>
                  </td>
                  <td className="p-2 text-xs">{r.alerts?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
