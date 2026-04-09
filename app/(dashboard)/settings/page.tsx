'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface ApiStatus {
  apollo: boolean;
  hubspot: boolean;
  brevo: boolean;
  database: boolean;
}

interface DbHealth {
  connected: boolean;
  latencyMs: number;
  error?: string;
  lastChecked: string;
  retryCount: number;
}

function StatusDot({ ok, pulsing }: { ok: boolean; pulsing?: boolean }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-green-500' : pulsing ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
  );
}

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ apollo: false, hubspot: false, brevo: false, database: false });
  const [dbHealth, setDbHealth] = useState<DbHealth>({ connected: false, latencyMs: 0, lastChecked: '', retryCount: 0 });
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [processMessage, setProcessMessage] = useState('');
  const [initMessage, setInitMessage] = useState('');

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectingRef = useRef(false);
  const retryCountRef = useRef(0);

  const tiktokEnabled = process.env.NEXT_PUBLIC_TIKTOK_MODULE_ENABLED === 'true';

  const checkHealth = useCallback(async (): Promise<DbHealth> => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      return {
        connected: data.database?.connected ?? false,
        latencyMs: data.database?.latencyMs ?? 0,
        error: data.database?.error,
        lastChecked: new Date().toLocaleTimeString('de-DE'),
        retryCount: retryCountRef.current,
      };
    } catch {
      return {
        connected: false,
        latencyMs: 0,
        error: 'Netzwerkfehler',
        lastChecked: new Date().toLocaleTimeString('de-DE'),
        retryCount: retryCountRef.current,
      };
    }
  }, []);

  const attemptReconnect = useCallback(async () => {
    if (reconnectingRef.current) return;
    reconnectingRef.current = true;
    retryCountRef.current++;

    const health = await checkHealth();
    setDbHealth(health);
    setApiStatus((prev) => ({ ...prev, database: health.connected }));

    if (!health.connected) {
      const delay = Math.min(15000, 3000 * retryCountRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectingRef.current = false;
        attemptReconnect();
      }, delay);
    } else {
      reconnectingRef.current = false;
      retryCountRef.current = 0;
    }
  }, [checkHealth]);

  useEffect(() => {
    async function initialCheck() {
      const health = await checkHealth();
      setDbHealth(health);
      setApiStatus({
        database: health.connected,
        apollo: !!process.env.NEXT_PUBLIC_APOLLO_CONFIGURED || true,
        hubspot: !!process.env.NEXT_PUBLIC_HUBSPOT_CONFIGURED || true,
        brevo: !!process.env.NEXT_PUBLIC_BREVO_CONFIGURED || true,
      });
      setLoading(false);
      if (!health.connected) {
        reconnectTimerRef.current = setTimeout(attemptReconnect, 3000);
      }
    }

    initialCheck();

    pollIntervalRef.current = setInterval(async () => {
      const health = await checkHealth();
      setDbHealth(health);
      setApiStatus((prev) => {
        if (!prev.database && health.connected) {
          reconnectingRef.current = false;
          retryCountRef.current = 0;
          if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
        }
        if (prev.database && !health.connected && !reconnectingRef.current) {
          setTimeout(attemptReconnect, 2000);
        }
        return { ...prev, database: health.connected };
      });
    }, 30000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [checkHealth, attemptReconnect]);

  const handleInitDb = async () => {
    setInitLoading(true);
    setInitMessage('');
    try {
      const res = await fetch('/api/settings/init-db', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setInitMessage(data.message ?? 'Datenbank erfolgreich initialisiert.');
        const health = await checkHealth();
        setDbHealth(health);
        setApiStatus((prev) => ({ ...prev, database: health.connected }));
        reconnectingRef.current = false;
        retryCountRef.current = 0;
      } else {
        setInitMessage(`Fehler: ${data.error ?? 'Unbekannter Fehler'}`);
      }
    } catch {
      setInitMessage('Verbindungsfehler beim Initialisieren der Datenbank.');
    } finally {
      setInitLoading(false);
    }
  };

  const isReconnecting = reconnectingRef.current || (!apiStatus.database && dbHealth.retryCount > 0);

  return (
    <div className="max-w-3xl space-y-6">
      {/* API Status */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
        <h3 className="text-base font-semibold text-[#F0F0F5] mb-4">API-Verbindungen</h3>
        {loading ? (
          <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-5 bg-[#1E1E1E] rounded w-48" />))}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><StatusDot ok={apiStatus.apollo} /><span className="text-sm text-[#ccc]">Apollo.io</span><span className="text-xs text-[#666]">{apiStatus.apollo ? 'Verbunden' : 'Nicht konfiguriert'}</span></div>
            <div className="flex items-center gap-3"><StatusDot ok={apiStatus.hubspot} /><span className="text-sm text-[#ccc]">HubSpot CRM</span><span className="text-xs text-[#666]">{apiStatus.hubspot ? 'Verbunden' : 'Nicht konfiguriert'}</span></div>
            <div className="flex items-center gap-3"><StatusDot ok={apiStatus.brevo} /><span className="text-sm text-[#ccc]">Brevo (E-Mail)</span><span className="text-xs text-[#666]">{apiStatus.brevo ? 'Verbunden' : 'Nicht konfiguriert'}</span></div>
          </div>
        )}
      </div>

      {/* Calendly */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
        <h3 className="text-base font-semibold text-[#F0F0F5] mb-3">Calendly-Link</h3>
        {process.env.NEXT_PUBLIC_CALENDLY_LINK ? (
          <a href={process.env.NEXT_PUBLIC_CALENDLY_LINK} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2563EB] font-mono bg-[#0A0A0A] rounded-md px-3 py-2 border border-[#1E1E1E] block hover:underline">{process.env.NEXT_PUBLIC_CALENDLY_LINK}</a>
        ) : (
          <p className="text-sm text-[#ccc] font-mono bg-[#0A0A0A] rounded-md px-3 py-2 border border-[#1E1E1E]">Nicht konfiguriert (CALENDLY_LINK in .env setzen)</p>
        )}
      </div>

      {/* Feature Flags */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
        <h3 className="text-base font-semibold text-[#F0F0F5] mb-4">Feature-Flags</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#ccc]">TikTok / Ads Modul</p>
            <p className="text-xs text-[#666] mt-0.5">NEXT_PUBLIC_TIKTOK_MODULE_ENABLED in .env ändern</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tiktokEnabled ? 'bg-green-100 text-green-800' : 'bg-[#1A1A1A] text-[#ccc]'}`}>
            {tiktokEnabled ? 'Aktiviert' : 'Deaktiviert'}
          </span>
        </div>
      </div>

      {/* Database */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
        <h3 className="text-base font-semibold text-[#F0F0F5] mb-4">Datenbank</h3>

        <div className="flex items-center gap-3 mb-3">
          <StatusDot ok={apiStatus.database} pulsing={isReconnecting} />
          <span className="text-sm text-[#ccc]">
            {apiStatus.database ? 'Verbunden' : isReconnecting ? 'Verbindet automatisch...' : 'Nicht verbunden'}
          </span>
          {apiStatus.database && dbHealth.latencyMs > 0 && (
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${dbHealth.latencyMs < 500 ? 'bg-green-50 text-green-700' : dbHealth.latencyMs < 2000 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
              {dbHealth.latencyMs} ms
            </span>
          )}
        </div>

        {/* Detailed status info */}
        <div className="bg-[#0A0A0A] rounded-md p-3 mb-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Letzte Prüfung</span>
            <span className="font-mono">{dbHealth.lastChecked || '–'}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Latenz</span>
            <span className="font-mono">{dbHealth.latencyMs > 0 ? `${dbHealth.latencyMs} ms` : '–'}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Timeout</span>
            <span className="font-mono">30 s</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Wiederholungsversuche</span>
            <span className="font-mono">3× mit Backoff</span>
          </div>
          {dbHealth.error && (
            <div className="flex items-center justify-between text-xs text-red-500">
              <span>Fehler</span>
              <span className="font-mono truncate max-w-[200px]" title={dbHealth.error}>{dbHealth.error}</span>
            </div>
          )}
          {isReconnecting && dbHealth.retryCount > 0 && (
            <div className="flex items-center justify-between text-xs text-yellow-600">
              <span>Wiederverbindungsversuch</span>
              <span className="font-mono">#{dbHealth.retryCount}</span>
            </div>
          )}
        </div>

        {!apiStatus.database && !isReconnecting && (
          <p className="text-xs text-[#666] mb-4">Verbindung wird automatisch alle 15 Sekunden erneut versucht.</p>
        )}
        {isReconnecting && (
          <p className="text-xs text-[#666] mb-4">Automatische Wiederverbindung läuft – bitte warten.</p>
        )}
        {apiStatus.database && (
          <p className="text-xs text-[#666] mb-4">Status wird alle 30 Sekunden geprüft. Abfragen werden bei Fehlern automatisch 3× wiederholt.</p>
        )}

        <div className="flex gap-3">
          <button onClick={handleInitDb} disabled={initLoading} className="rounded-md bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {initLoading ? 'Initialisiere...' : 'Datenbank initialisieren'}
          </button>
          <button
            onClick={async () => {
              const health = await checkHealth();
              setDbHealth(health);
              setApiStatus((prev) => ({ ...prev, database: health.connected }));
            }}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#ccc] hover:bg-[#0A0A0A] transition-colors"
          >
            Jetzt prüfen
          </button>
        </div>
        {initMessage && (
          <p className={`mt-3 text-sm ${initMessage.startsWith('Fehler') || initMessage.startsWith('Verbindungs') ? 'text-red-600' : 'text-green-600'}`}>{initMessage}</p>
        )}
      </div>

      {/* Manual Sequence Processing */}
      <div className="bg-[#111] rounded-lg shadow-sm border border-[#1E1E1E] p-6">
        <h3 className="text-lg font-semibold text-[#F0F0F5] mb-4">Sequenz-Verarbeitung</h3>
        <p className="text-sm text-[#888] mb-4">Sequenzen werden automatisch Mo-Fr verarbeitet. Hier können Sie die Verarbeitung manuell starten (ignoriert Zeitfenster).</p>
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
