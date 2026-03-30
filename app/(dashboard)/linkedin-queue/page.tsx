'use client';

import { useState, useEffect, useCallback } from 'react';

type QueueItem = {
  id: number;
  lead_id: number | null;
  partner_id: number | null;
  source: string;
  connection_message: string;
  follow_up_message: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  lead_first_name: string | null;
  lead_last_name: string | null;
  lead_company: string | null;
  partner_company: string | null;
  partner_contact_name: string | null;
};

type Tab = 'alle' | 'prospects' | 'partner' | 'gesendet';

export default function LinkedInQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [sentItems, setSentItems] = useState<QueueItem[]>([]);
  const [tab, setTab] = useState<Tab>('alle');
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [readyRes, sentRes] = await Promise.all([
        fetch('/api/linkedin/queue?status=ready'),
        fetch('/api/linkedin/queue?status=sent'),
      ]);
      const readyData = readyRes.ok ? await readyRes.json() : { queue: [] };
      const sentData = sentRes.ok ? await sentRes.json() : { queue: [] };
      setItems(readyData.queue || []);
      setSentItems(sentData.queue || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const markAsSent = async (id: number) => {
    // We need a simple endpoint for this — use direct fetch for now
    // This will be a PATCH-like operation
    try {
      // For now, update via the linkedin-queue-update endpoint we'll call
      await fetch('/api/linkedin/queue-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'sent' }),
      });
      fetchQueue();
    } catch { /* ignore */ }
  };

  const filtered = tab === 'gesendet'
    ? sentItems
    : items.filter(item => {
        if (tab === 'prospects') return item.lead_id !== null;
        if (tab === 'partner') return item.partner_id !== null;
        return true;
      });

  const readyCount = items.length;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'alle', label: `Alle (${readyCount})` },
    { key: 'prospects', label: 'Prospects' },
    { key: 'partner', label: 'Partner' },
    { key: 'gesendet', label: 'Gesendet' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', transition: 'all 0.15s',
              background: tab === t.key ? '#E8472A' : '#1E1E1E',
              color: tab === t.key ? 'white' : '#888',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: 14 }}>Laden...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: 14 }}>
            {tab === 'gesendet' ? 'Keine gesendeten Nachrichten.' : 'Keine Nachrichten in der Warteschlange.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(item => {
            const name = item.partner_id
              ? (item.partner_contact_name || item.partner_company || 'Partner')
              : `${item.lead_first_name || ''} ${item.lead_last_name || ''}`.trim() || 'Unbekannt';
            const company = item.partner_id ? item.partner_company : item.lead_company;
            const isAgent = item.source === 'agent';
            const isSent = item.status === 'sent';

            return (
              <div key={item.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: isAgent ? 'rgba(232,71,42,0.15)' : 'rgba(136,136,136,0.15)',
                      color: isAgent ? '#E8472A' : '#888',
                    }}>
                      {isAgent ? 'Agent' : 'Manuell'}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: item.partner_id ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
                      color: item.partner_id ? '#3B82F6' : '#22C55E',
                    }}>
                      {item.partner_id ? 'Partner' : 'Prospect'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#555' }}>
                    {new Date(item.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 2px' }}>{name}</p>
                  {company && <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{company}</p>}
                </div>

                <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#555', margin: '0 0 4px', textTransform: 'uppercase' }}>Verbindungsnachricht</p>
                  <p style={{ fontSize: 13, color: '#ccc', margin: 0, lineHeight: 1.5 }}>{item.connection_message}</p>
                </div>

                {item.follow_up_message && (
                  <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#555', margin: '0 0 4px', textTransform: 'uppercase' }}>Follow-Up</p>
                    <p style={{ fontSize: 13, color: '#ccc', margin: 0, lineHeight: 1.5 }}>{item.follow_up_message}</p>
                  </div>
                )}

                {!isSent && (
                  <button onClick={() => markAsSent(item.id)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: '#1E1E1E', color: '#F0F0F5', border: 'none', cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#E8472A'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1E1E1E'}
                  >
                    Als gesendet markieren
                  </button>
                )}
                {isSent && item.sent_at && (
                  <p style={{ fontSize: 12, color: '#22C55E', margin: 0 }}>
                    Gesendet am {new Date(item.sent_at).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
