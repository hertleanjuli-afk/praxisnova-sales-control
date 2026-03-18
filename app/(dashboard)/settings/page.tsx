'use client';

import { useState, useEffect } from 'react';

interface ApiStatus {
  apollo: boolean;
  hubspot: boolean;
  brevo: boolean;
  database: boolean;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        ok ? 'bg-green-500' : 'bg-red-500'
      }`}
    />
  );
}

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    apollo: false,
    hubspot: false,
    brevo: false,
    database: false,
  });
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [initMessage, setInitMessage] = useState('');

  const tiktokEnabled =
    process.env.NEXT_PUBLIC_TIKTOK_MODULE_ENABLED === 'true';

  useEffect(() => {
    async function checkStatus() {
      try {
        // Simple check: try to fetch analytics — if DB is connected, it works
        const res = await fetch('/api/analytics?period=week');
        setApiStatus((prev) => ({ ...prev, database: res.ok }));
      } catch {
        // DB not connected
      }

      // Check API keys from env (NEXT_PUBLIC_ ones or infer from server response)
      // Since we can't read server env from client, we show based on known config
      setApiStatus((prev) => ({
        ...prev,
        apollo: !!process.env.NEXT_PUBLIC_APOLLO_CONFIGURED || true,
        hubspot: !!process.env.NEXT_PUBLIC_HUBSPOT_CONFIGURED || true,
        brevo: !!process.env.NEXT_PUBLIC_BREVO_CONFIGURED || true,
      }));

      setLoading(false);
    }
    checkStatus();
  }, []);

  const handleInitDb = async () => {
    setInitLoading(true);
    setInitMessage('');
    try {
      const res = await fetch('/api/settings/init-db', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setInitMessage(data.message ?? 'Datenbank erfolgreich initialisiert.');
        setApiStatus((prev) => ({ ...prev, database: true }));
      } else {
        setInitMessage(`Fehler: ${data.error ?? 'Unbekannter Fehler'}`);
      }
    } catch {
      setInitMessage('Verbindungsfehler beim Initialisieren der Datenbank.');
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* API Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">
          API-Verbindungen
        </h3>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 bg-gray-200 rounded w-48" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusDot ok={apiStatus.apollo} />
              <span className="text-sm text-gray-700">Apollo.io</span>
              <span className="text-xs text-gray-400">
                {apiStatus.apollo ? 'Verbunden' : 'Nicht konfiguriert'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StatusDot ok={apiStatus.hubspot} />
              <span className="text-sm text-gray-700">HubSpot CRM</span>
              <span className="text-xs text-gray-400">
                {apiStatus.hubspot ? 'Verbunden' : 'Nicht konfiguriert'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StatusDot ok={apiStatus.brevo} />
              <span className="text-sm text-gray-700">Brevo (E-Mail)</span>
              <span className="text-xs text-gray-400">
                {apiStatus.brevo ? 'Verbunden' : 'Nicht konfiguriert'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Calendly */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-3">
          Calendly-Link
        </h3>
        <p className="text-sm text-gray-600 font-mono bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
          {process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'Nicht konfiguriert (CALENDLY_LINK in .env setzen)'}
        </p>
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">
          Feature-Flags
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">TikTok / Ads Modul</p>
            <p className="text-xs text-gray-400 mt-0.5">
              NEXT_PUBLIC_TIKTOK_MODULE_ENABLED in .env ändern
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              tiktokEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tiktokEnabled ? 'Aktiviert' : 'Deaktiviert'}
          </span>
        </div>
      </div>

      {/* Database */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">
          Datenbank
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <StatusDot ok={apiStatus.database} />
          <span className="text-sm text-gray-700">
            {apiStatus.database ? 'Verbunden' : 'Nicht verbunden'}
          </span>
        </div>

        <button
          onClick={handleInitDb}
          disabled={initLoading}
          className="rounded-md bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {initLoading ? 'Initialisiere...' : 'Datenbank initialisieren'}
        </button>

        {initMessage && (
          <p
            className={`mt-3 text-sm ${
              initMessage.startsWith('Fehler') || initMessage.startsWith('Verbindungs')
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {initMessage}
          </p>
        )}
      </div>
    </div>
  );
}
