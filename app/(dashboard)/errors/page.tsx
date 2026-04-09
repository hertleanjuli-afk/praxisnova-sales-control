'use client';

import { useState, useEffect } from 'react';

interface ErrorLog {
  id: number;
  error_type: string;
  lead_id: number | null;
  sequence_type: string | null;
  step_number: number | null;
  error_message: string;
  context: string | null;
  notified: boolean;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  lead_email: string | null;
  company: string | null;
}

interface ErrorStat {
  error_type: string;
  count: number;
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  brevo_send_failed: 'E-Mail-Versand fehlgeschlagen',
  hubspot_sync_failed: 'HubSpot-Sync fehlgeschlagen',
  sequence_step_failed: 'Sequenz-Schritt fehlgeschlagen',
  webhook_processing_failed: 'Webhook-Verarbeitung fehlgeschlagen',
  database_error: 'Datenbankfehler',
  apollo_api_error: 'Apollo API Fehler',
};

export default function ErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/errors')
      .then((res) => res.json())
      .then((data) => {
        setErrors(data.errors || []);
        setStats(data.stats || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Fehler-Log</h1>
      <p className="text-sm text-[#888] mb-6">Fehler der letzten 7 Tage</p>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {stats.map((s) => (
            <div
              key={s.error_type}
              className="bg-[#111] rounded-lg border border-red-200 p-3 text-center"
            >
              <div className="text-2xl font-bold text-red-600">
                {Number(s.count)}
              </div>
              <div className="text-xs text-[#888] mt-1">
                {ERROR_TYPE_LABELS[s.error_type] || s.error_type}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#111] rounded-lg border border-[#1E1E1E] p-4 animate-pulse"
            >
              <div className="h-4 bg-[#1E1E1E] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[#1E1E1E] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : errors.length === 0 ? (
        <div className="bg-[#111] rounded-lg border border-[#1E1E1E] p-12 text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <p className="text-[#888]">
            Keine Fehler in den letzten 7 Tagen
          </p>
        </div>
      ) : (
        <div className="bg-[#111] rounded-lg border border-[#1E1E1E] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0A0A0A] text-[#ccc]">
              <tr>
                <th className="text-left p-3">Zeitpunkt</th>
                <th className="text-left p-3">Typ</th>
                <th className="text-left p-3">Lead</th>
                <th className="text-left p-3">Sequenz</th>
                <th className="text-left p-3">Fehlermeldung</th>
                <th className="text-left p-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err) => (
                <tr
                  key={err.id}
                  className="border-t border-[#1E1E1E] hover:bg-red-50/30"
                >
                  <td className="p-3 text-[#888] whitespace-nowrap text-xs">
                    {formatDate(err.created_at)}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {ERROR_TYPE_LABELS[err.error_type] || err.error_type}
                    </span>
                  </td>
                  <td className="p-3 text-[#ccc]">
                    {err.lead_email ? (
                      <span>
                        {err.first_name} {err.last_name}
                        <br />
                        <span className="text-xs text-[#666]">
                          {err.lead_email}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#666]">–</span>
                    )}
                  </td>
                  <td className="p-3 text-[#888] text-xs">
                    {err.sequence_type || '–'}
                    {err.step_number != null && `, Schritt ${err.step_number}`}
                  </td>
                  <td className="p-3 text-red-700 text-xs max-w-xs truncate">
                    {err.error_message}
                  </td>
                  <td className="p-3">
                    {err.notified && (
                      <span title="E-Mail-Benachrichtigung gesendet" className="text-green-500">
                        &#9993;
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
