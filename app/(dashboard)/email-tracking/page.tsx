'use client';

import { useState, useEffect, useCallback } from 'react';

const CORAL = '#E8472A';
const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien', handwerk: 'Handwerk', bauunternehmen: 'Bau',
  inbound: 'Inbound', allgemein: 'Allgemein',
};
const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  opened: { icon: '📬', label: 'Geöffnet', color: '#22C55E', bg: '#22C55E20' },
  clicked: { icon: '🖱️', label: 'Geklickt', color: '#3B82F6', bg: '#3B82F620' },
  replied: { icon: '💬', label: 'Beantwortet', color: '#8B5CF6', bg: '#8B5CF620' },
  bounced: { icon: '❌', label: 'Bounced', color: '#EF4444', bg: '#EF444420' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'gestern';
  return `vor ${d} Tagen`;
}

interface EmailEvent {
  id: number; lead_id: number; sequence_type: string; step_number: number;
  event_type: string; created_at: string; first_name: string; last_name: string;
  email: string; company: string; title: string; linkedin_url: string;
  lead_score: number; sentiment: string | null; sentiment_confidence: number | null;
  multipleOpens: boolean; openCount: number; linkedin_status: string | null;
}

interface LeadDetail {
  events: any[]; calls: any[]; lead: any;
}

export default function EmailTrackingPage() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [sequence, setSequence] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/email-tracking?period=${period}&sequence=${sequence}&eventType=${eventType}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data.events || []);
      setStats(data.stats || { total: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 });
    } catch { setEvents([]); }
    setLoading(false);
  }, [period, sequence, eventType]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [fetchData]);

  const loadDetail = async (leadId: number) => {
    if (expandedLead === leadId) { setExpandedLead(null); return; }
    setExpandedLead(leadId);
    setDetailLoading(true);
    try {
      const res = await fetch('/api/email-tracking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) setLeadDetail(await res.json());
    } catch { /* */ }
    setDetailLoading(false);
  };

  const periods = [{ key: '1', label: 'Heute' }, { key: '7', label: '7 Tage' }, { key: '30', label: '30 Tage' }];
  const sequences = [{ key: 'all', label: 'Alle' }, { key: 'immobilien', label: 'Immobilien' }, { key: 'handwerk', label: 'Handwerk' }, { key: 'bauunternehmen', label: 'Bau' }, { key: 'allgemein', label: 'Allgemein' }, { key: 'inbound', label: 'Inbound' }];
  const eventTypes = [{ key: 'all', label: 'Alle' }, { key: 'opened', label: 'Geöffnet' }, { key: 'clicked', label: 'Geklickt' }, { key: 'replied', label: 'Beantwortet' }];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Period */}
        <div style={{ display: 'flex', gap: 3, background: '#111', borderRadius: 8, padding: 3, border: '1px solid #1E1E1E' }}>
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: period === p.key ? CORAL : 'transparent', color: period === p.key ? '#fff' : '#888' }}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Sequence */}
        <select value={sequence} onChange={e => setSequence(e.target.value)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#ccc', cursor: 'pointer' }}>
          {sequences.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {/* Event type */}
        <div style={{ display: 'flex', gap: 3, background: '#111', borderRadius: 8, padding: 3, border: '1px solid #1E1E1E' }}>
          {eventTypes.map(e => (
            <button key={e.key} onClick={() => setEventType(e.key)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: eventType === e.key ? '#3B82F6' : 'transparent', color: eventType === e.key ? '#fff' : '#888' }}>
              {e.label}
            </button>
          ))}
        </div>

        {/* Stats badges */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
            <span key={key} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>
              {cfg.icon} {(stats as any)[key] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #1E1E1E', borderTopColor: CORAL, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#888' }}>Lade Email-Events...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#555' }}>Keine Email-Events im gewählten Zeitraum.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                  {['', 'Name', 'Firma', 'Email', 'Sequenz', 'Event', 'Wann', 'Aktionen'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const cfg = EVENT_CONFIG[ev.event_type] || EVENT_CONFIG.opened;
                  const isExpanded = expandedLead === ev.lead_id;
                  const rowBorder = ev.event_type === 'replied' ? '2px solid #8B5CF6' :
                    ev.event_type === 'clicked' ? '2px solid #3B82F6' :
                    ev.multipleOpens ? '2px solid #EAB308' : '1px solid #1E1E1E';

                  return (
                    <tr key={ev.id} style={{ borderBottom: rowBorder, background: ev.event_type === 'replied' ? '#8B5CF610' : 'transparent' }}>
                      {/* Status */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                      </td>
                      {/* Name */}
                      <td style={{ padding: '10px 14px' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#F0F0F5' }}>{ev.first_name} {ev.last_name}</span>
                          {ev.multipleOpens && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#EAB30820', color: '#EAB308', fontWeight: 600, marginLeft: 6 }}>
                              🔥 {ev.openCount}x geöffnet
                            </span>
                          )}
                        </div>
                        {ev.title && <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>{ev.title}</p>}
                      </td>
                      {/* Firma */}
                      <td style={{ padding: '10px 14px', color: '#ccc' }}>{ev.company || '–'}</td>
                      {/* Email */}
                      <td style={{ padding: '10px 14px', color: '#888', fontFamily: 'monospace', fontSize: 12 }}>{ev.email}</td>
                      {/* Sequenz */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, color: '#ccc' }}>
                          {SECTOR_LABELS[ev.sequence_type] || ev.sequence_type} <span style={{ color: '#555' }}>Step {ev.step_number}</span>
                        </span>
                      </td>
                      {/* Event */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>
                          {cfg.label}
                        </span>
                      </td>
                      {/* Wann */}
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(ev.created_at)}</td>
                      {/* Aktionen */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {ev.email && <a href={`mailto:${ev.email}`} title="Email senden" style={{ fontSize: 14, textDecoration: 'none' }}>✉️</a>}
                          {ev.linkedin_url && <a href={ev.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ fontSize: 14, textDecoration: 'none' }}>🔗</a>}
                          <button onClick={() => loadDetail(ev.lead_id)} title="Details"
                            style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {isExpanded ? '▼' : '📋'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Detail Expansion ─────────────────────────────────────── */}
            {expandedLead && (
              <div style={{ background: '#0A0A0A', borderTop: '1px solid #1E1E1E', padding: 20 }}>
                {detailLoading ? (
                  <p style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>Lade Details...</p>
                ) : leadDetail ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Lead Info */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Lead-Info</p>
                      <div style={{ background: '#111', borderRadius: 8, padding: 14, border: '1px solid #1E1E1E' }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5', margin: '0 0 4px' }}>
                          {leadDetail.lead?.first_name} {leadDetail.lead?.last_name}
                        </p>
                        <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>{leadDetail.lead?.company} · {leadDetail.lead?.title}</p>
                        <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>{leadDetail.lead?.email}</p>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                          <span style={{ color: CORAL, fontWeight: 600 }}>Score: {leadDetail.lead?.lead_score || 0}</span>
                          <span style={{ color: '#888' }}>Status: {leadDetail.lead?.sequence_status}</span>
                          {leadDetail.lead?.linkedin_status && <span style={{ color: '#3B82F6' }}>LinkedIn: {leadDetail.lead.linkedin_status}</span>}
                          {leadDetail.lead?.reply_sentiment && <span style={{ color: '#8B5CF6' }}>Sentiment: {leadDetail.lead.reply_sentiment}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Event History */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Event-Verlauf</p>
                      <div style={{ background: '#111', borderRadius: 8, padding: 14, border: '1px solid #1E1E1E', maxHeight: 200, overflowY: 'auto' }}>
                        {leadDetail.events.map((e: any, i: number) => {
                          const eCfg = EVENT_CONFIG[e.event_type] || { icon: '📧', label: e.event_type, color: '#888', bg: '#88888820' };
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < leadDetail.events.length - 1 ? '1px solid #1E1E1E' : 'none' }}>
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: eCfg.bg, color: eCfg.color, fontWeight: 600 }}>{eCfg.label}</span>
                              <span style={{ fontSize: 11, color: '#888' }}>Step {e.step_number} · {e.sequence_type}</span>
                              <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>{timeAgo(e.created_at)}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Calls */}
                      {leadDetail.calls.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Anrufe</p>
                          {leadDetail.calls.map((c: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, color: '#888', padding: '2px 0' }}>
                              📞 {c.result} · {c.notes || '–'} · {timeAgo(c.call_date)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
