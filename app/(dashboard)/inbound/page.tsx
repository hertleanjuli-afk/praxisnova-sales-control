'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

const CORAL = '#E8472A';
const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  pending_optin: { label: 'Wartend', icon: '🟡', color: '#EAB308', bg: '#EAB30820' },
  active: { label: 'In Sequenz', icon: '🔵', color: '#3B82F6', bg: '#3B82F620' },
  none: { label: 'Bestätigt', icon: '🟢', color: '#22C55E', bg: '#22C55E20' },
  completed: { label: 'Abgeschlossen', icon: '✅', color: '#22C55E', bg: '#22C55E20' },
  replied: { label: 'Beantwortet', icon: '💬', color: '#8B5CF6', bg: '#8B5CF620' },
  booked: { label: 'Gebucht', icon: '📅', color: '#EAB308', bg: '#EAB30820' },
};

function timeAgo(d: string | null): string {
  if (!d) return '–';
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return `vor ${Math.floor(h / 24)} T.`;
}

interface Lead {
  id: number; first_name: string; last_name: string; company: string; email: string;
  title: string; sequence_status: string; sequence_step: number; enrolled_at: string;
  created_at: string; source: string; lead_score: number;
}

export default function InboundPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sequences/status?sector=inbound');
      if (res.ok) { const d = await res.json(); setLeads(d.leads || []); }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  const stats = useMemo(() => ({
    today: leads.filter(l => new Date(l.created_at || l.enrolled_at).toDateString() === new Date().toDateString()).length,
    pending: leads.filter(l => l.sequence_status === 'pending_optin').length,
    inSequence: leads.filter(l => l.sequence_status === 'active').length,
    converted: leads.filter(l => ['replied', 'booked', 'completed'].includes(l.sequence_status)).length,
  }), [leads]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }} className="kpi-grid">
        {[
          { label: 'Neue Anfragen (heute)', value: stats.today, color: CORAL },
          { label: 'Wartend auf Bestätigung', value: stats.pending, color: '#EAB308' },
          { label: 'In Sequenz', value: stats.inSequence, color: '#3B82F6' },
          { label: 'Konvertiert', value: stats.converted, color: '#22C55E' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16, borderTop: `3px solid ${kpi.color}` }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>{kpi.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #1E1E1E', borderTopColor: CORAL, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : leads.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#555' }}>Keine eingehenden Leads.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                  {['Status', 'Name', 'Email', 'Firma', 'Quelle', 'Eingegangen', 'Aktionen'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const st = STATUS_CONFIG[lead.sequence_status] || { label: lead.sequence_status, icon: '⚪', color: '#555', bg: '#55555520' };
                  const isNew = Date.now() - new Date(lead.created_at || lead.enrolled_at).getTime() < 3600000;
                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #1E1E1E', borderLeft: isNew ? `3px solid ${CORAL}` : 'none' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color, fontWeight: 600 }}>
                          {st.icon} {st.label}
                        </span>
                        {isNew && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${CORAL}30`, color: CORAL, fontWeight: 700, marginLeft: 6, animation: 'pulse 2s infinite' }}>NEU</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#F0F0F5' }}>{lead.first_name} {lead.last_name}</td>
                      <td style={{ padding: '10px 14px', color: '#888', fontFamily: 'monospace', fontSize: 12 }}>{lead.email}</td>
                      <td style={{ padding: '10px 14px', color: '#ccc' }}>{lead.company || '–'}</td>
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: 12 }}>{lead.source || 'Website'}</td>
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: 12 }}>{timeAgo(lead.created_at || lead.enrolled_at)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a href={`mailto:${lead.email}`} style={{ fontSize: 14, textDecoration: 'none' }} title="Email">✉️</a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      <style>{`@media (max-width: 768px) { .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  );
}
