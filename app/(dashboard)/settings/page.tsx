'use client';
import { useState, useEffect, useRef } from 'react';

interface ApiStatus {
  apollo: boolean;
  hubspot: boolean;
  brevo: boolean;
  database: boolean;
}

function StatusDot({ ok, pulsing }: { ok: boolean; pulsing?: boolean }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-green-500' : pulsing ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
  );
}

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ apollo: false, hubspot: false, brevo: false, database: false });
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [processMessage, setProcessMessage] = useState('');
  const [initMessage, setInitMessage] = useState('');
  const [reconnecting, setReconnecting] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectingRef = useRef(false);

  const tiktokEnabled = process.env.NEXT_PUBLIC_TIKTOK_MODULE_ENABLED === 'true';

  const checkDatabaseStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/analytics?period=week');
      return res.ok;
    } catch {
      return false;
    }
  };

  const attemptReconnect = async () => {
    if (reconnectingRef.current) return;
    reconnectingRef.current = true;
    setReconnecting(true);
    try {
      await fetch('/api/settings/init-db', { method: 'POST' });
      const ok = await checkDatabaseStatus();
      setApiStatus((prev) => ({ ...prev, database: ok }));
      if (!ok) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectingRef.current = false;
          attemptReconnect();
        }, 15000);
      } else {
        reconnectingRef.current = false;
        setReconnecting(false);
      }
    } catch {
      reconnectTimerRef.current = setTimeout(() => {
        reconnectingRef.current = false;
        attemptReconnect();
      }, 15000);
    }
  };

  useEffect(() => {
    async function initialCheck() {
      const dbOk = await checkDatabaseStatus();
      setApiStatus({
        database: dbOk,
        apollo: !!process.env.NEXT_PUBLIC_APOLLO_CONFIGURED || true,
        hubspot: !!process.env.NEXT_PUBLIC_HUBSPOT_CONFIGURED || true,
        brevo: !!process.env.NEXT_PUBLIC_BREVO_CONFIGURED || true,
      });
      setLoading(false);
      if (!dbOk) {
        reconnectTimerRef.current = setTimeout(attemptReconnect, 3000);
      }
    }

    initialCheck();

    // Poll DB status every 30s; auto-reconnect on disconnect
    pollIntervalRef.current = setInterval(async () => {
      const dbOk = await checkDatabaseStatus();
      setApiStatus((prev) => {
        if (!prev.database && dbOk) {
          // Reconnected
          reconnectingRef.current = false;
          setReconnecting(false);
          if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
        }
        if (prev.database && !dbOk && !reconnectingRef.current) {
          // Just lost connection
          setTimeout(attemptReconnect, 2000);
        }
        return { ...prev, database: dbOk };
      });
    }, 30000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        reconnectingRef.current = false;
        setReconnecting(false);
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
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">API-Verbindungen</h3>
        {loading ? (
          <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-5 bg-gray-200 rounded w-48" />))}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><StatusDot ok={apiStatus.apollo} /><span className="text-sm text-gray-700">Apollo.io</span><span className="text-xs text-gray-400">{apiStatus.apollo ? 'Verbunden' : 'Nicht konfiguriert'}</span></div>
            <div className="flex items-center gap-3"><StatusDot ok={apiStatus.hubspot} /><span className="text-sm text-gray-700">HubSpot CRM</span><span className="text-xs text-gray-400">{apiStatus.hubspot ? 'Verbunden' : 'Nicht konfiguriert'}</span></div>
            <div className="flex items-center gap-3"><StatusDot ok={apiStatus.brevo} /><span className="text-sm text-gray-700">Brevo (E-Mail)</span><span className="text-xs text-gray-400">{apiStatus.brevo ? 'Verbunden' : 'Nicht konfiguriert'}</span></div>
          </div>
        )}
      </div>

      {/* Calendly */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-3">Calendly-Link</h3>
        {process.env.NEXT_PUBLIC_CALENDLY_LINK ? (
          <a href={process.env.NEXT_PUBLIC_CALENDLY_LINK} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2563EB] font-mono bg-gray-50 rounded-md px-3 py-2 border border-gray-100 block hover:underline">{process.env.NEXT_PUBLIC_CALENDLY_LINK}</a>
        ) : (
          <p className="text-sm text-gray-600 font-mono bg-gray-50 rounded-md px-3 py-2 border border-gray-100">Nicht konfiguriert (CALENDLY_LINK in .env setzen)</p>
        )}
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">Feature-Flags</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">TikTok / Ads Modul</p>
            <p className="text-xs text-gray-400 mt-0.5">NEXT_PUBLIC_TIKTOK_MODULE_ENABLED in .env ändern</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tiktokEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {tiktokEnabled ? 'Aktiviert' : 'Deaktiviert'}
          </span>
        </div>
      </div>

      {/* Database */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-[#1E3A5F] mb-4">Datenbank</h3>
        <div className="flex items-center gap-3 mb-2">
          <StatusDot ok={apiStatus.database} pulsing={reconnecting} />
          <span className="text-sm text-gray-700">
            {apiStatus.database ? 'Verbunden' : reconnecting ? 'Verbindet automatisch...' : 'Nicht verbunden'}
          </span>
        </div>
        {!apiStatus.database && !reconnecting && (
          <p className="text-xs text-gray-400 mb-4">Verbindung wird automatisch alle 15 Sekunden erneut versucht.</p>
        )}
        {reconnecting && (
          <p className="text-xs text-gray-400 mb-4">Automatische Wiederverbindung läuft — bitte warten.</p>
        )}
        {apiStatus.database && (
          <p className="text-xs text-gray-400 mb-4">Status wird alle 30 Sekunden geprüft.</p>
        )}
        <button onClick={handleInitDb} disabled={initLoading} className="rounded-md bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {initLoading ? 'Initialisiere...' : 'Datenbank initialisieren'}
        </button>
        {initMessage && (
          <p className={`mt-3 text-sm ${initMessage.startsWith('Fehler') || initMessage.startsWith('Verbindungs') ? 'text-red-600' : 'text-green-600'}`}>{initMessage}</p>
        )}
      </div>

      {/* Manual Sequence Processing */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">Sequenz-Verarbeitung</h3>
        <p className="text-sm text-gray-500 mb-4">Sequenzen werden automatisch Mo-Fr verarbeitet. Hier können Sie die Verarbeitung manuell starten (ignoriert Zeitfenster).</p>
        <button
          onClick={async () => {
            setProcessMessage('');
            setProcessLoading(true);
            try {
              const res = await fetch('/api/cron/process-sequences', { headers: { 'x-manual-trigger': 'true' } });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Fehler');
              const s = data.stats;
              setProcessMessage(`Verarbeitet: ${s.processed} Leads, ${s.sent} gesendet, ${s.failed} fehlgeschlagen, ${s.completed} abgeschlossen`);
            } catch (err) {
              setProcessMessage(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
              setProcessLoading(false);
            }
          }}
          disabled={processLoading}
          className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processLoading ? 'Wird verarbeitet...' : 'Sequenz-Verarbeitung jetzt starten'}
        </button>
        {processMessage && (
          <p className={`mt-3 text-sm ${processMessage.startsWith('Fehler') ? 'text-red-600' : 'text-green-600'}`}>{processMessage}</p>
        )}
      </div>
    </div>
  );
}
