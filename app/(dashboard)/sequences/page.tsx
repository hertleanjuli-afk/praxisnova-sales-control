'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

const CORAL = '#E8472A';
const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A', handwerk: '#3B82F6', bauunternehmen: '#22C55E',
  inbound: '#EAB308', allgemein: '#8B5CF6',
};
const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien', handwerk: 'Handwerk', bauunternehmen: 'Bau',
  inbound: 'Inbound', allgemein: 'Allgemein',
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktiv', color: '#22C55E', bg: '#22C55E20' },
  completed: { label: 'Fertig', color: '#3B82F6', bg: '#3B82F620' },
  stopped: { label: 'Gestoppt', color: '#888', bg: '#88888820' },
  booked: { label: 'Gebucht', color: '#EAB308', bg: '#EAB30820' },
  replied: { label: 'Beantwortet', color: '#8B5CF6', bg: '#8B5CF620' },
  unsubscribed: { label: 'Abgemeldet', color: '#EF4444', bg: '#EF444420' },
  bounced: { label: 'Bounced', color: '#EF4444', bg: '#EF444420' },
  cooldown: { label: 'Cooldown', color: '#888', bg: '#88888820' },
  none: { label: 'Keine', color: '#555', bg: '#55555520' },
};

interface Lead {
  id: number; first_name: string; last_name: string; company: string; email: string; title: string;
  sequence_type: string; sequence_step: number; sequence_status: string; enrolled_at: string;
  lead_score: number; linkedin_url: string; exited_at: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '–';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} T.`;
}

const MAX_STEPS = 6;

export default function SequencesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'lead_score' | 'name' | 'step' | 'enrolled'>('lead_score');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadEvents, setLeadEvents] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sectorFilter !== 'all') params.set('sector', sectorFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/sequences/status?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeads(data.leads || []);
    } catch { setLeads([]); }
    setLoading(false);
  }, [sectorFilter, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Sector stats
  const sectorStats = useMemo(() => {
    const stats: Record<string, { active: number; totalStep: number; count: number }> = {};
    for (const lead of leads) {
      const s = lead.sequence_type || 'allgemein';
      if (!stats[s]) stats[s] = { active: 0, totalStep: 0, count: 0 };
      if (lead.sequence_status === 'active') stats[s].active++;
      stats[s].totalStep += lead.sequence_step;
      stats[s].count++;
    }
    return stats;
  }, [leads]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => `${l.first_name} ${l.last_name} ${l.company} ${l.email}`.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'lead_score') return (b.lead_score || 0) - (a.lead_score || 0);
      if (sortBy === 'name') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      if (sortBy === 'step') return b.sequence_step - a.sequence_step;
      if (sortBy === 'enrolled') return new Date(b.enrolled_at || 0).getTime() - new Date(a.enrolled_at || 0).getTime();
      return 0;
    });
    return result;
  }, [leads, search, sortBy]);

  // Load detail
  const openDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    setDetailLoading(true);
    try {
      const res = await fetch('/api/email-tracking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeadEvents(data.events || []);
      }
    } catch { /* */ }
    setDetailLoading(false);
  };

  const sectors = ['immobilien', 'handwerk', 'bauunternehmen', 'allgemein', 'inbound'];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Sector Overview Cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }} className="sector-grid">
        {sectors.map(s => {
          const st = sectorStats[s] || { active: 0, totalStep: 0, count: 0 };
          const avgStep = st.count > 0 ? (st.totalStep / st.count).toFixed(1) : '0';
          return (
            <button key={s} onClick={() => setSectorFilter(sectorFilter === s ? 'all' : s)}
              style={{
                background: sectorFilter === s ? `${SECTOR_COLORS[s]}20` : '#111',
                border: `1px solid ${sectorFilter === s ? SECTOR_COLORS[s] : '#1E1E1E'}`,
                borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'left',
                borderTop: `3px solid ${SECTOR_COLORS[s]}`,
              }}>
              <p style={{ fontSize: 12, color: SECTOR_COLORS[s], fontWeight: 600, margin: '0 0 6px' }}>{SECTOR_LABELS[s]}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F5', margin: '0 0 4px' }}>{st.active}</p>
              <p style={{ fontSize: 11, color: '#555', margin: 0 }}>aktiv · Ø Step {avgStep}</p>
            </button>
          );
        })}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Suche nach Name, Firma..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#ccc', width: 220 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#ccc' }}>
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="completed">Abgeschlossen</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#ccc' }}>
          <option value="lead_score">Score (höchste)</option>
          <option value="name">Name</option>
          <option value="step">Step</option>
          <option value="enrolled">Enrolled</option>
        </select>
        <span style={{ fontSize: 12, color: '#555', marginLeft: 'auto' }}>{filtered.length} Leads</span>
      </div>

      {/* ── Lead Table ────────────────────────────────────────────────── */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #1E1E1E', borderTopColor: CORAL, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#888' }}>Lade Sequenzen...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 14 }}>Keine Leads gefunden.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                  {['Name', 'Firma', 'Branche', 'Step', 'Status', 'Score', 'Enrolled', 'Aktionen'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const status = STATUS_CONFIG[lead.sequence_status] || STATUS_CONFIG.none;
                  const stepPct = Math.min((lead.sequence_step / MAX_STEPS) * 100, 100);
                  const scoreColor = lead.lead_score >= 80 ? CORAL : lead.lead_score >= 50 ? '#EAB308' : '#555';
                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #1E1E1E', cursor: 'pointer' }}
                      onClick={() => openDetail(lead)}
                      onMouseEnter={e => e.currentTarget.style.background = '#1A1A1A'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600, color: '#F0F0F5' }}>{lead.first_name} {lead.last_name}</span>
                        {lead.title && <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>{lead.title}</p>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#ccc' }}>{lead.company || '–'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${SECTOR_COLORS[lead.sequence_type] || '#555'}20`, color: SECTOR_COLORS[lead.sequence_type] || '#888', fontWeight: 600 }}>
                          {SECTOR_LABELS[lead.sequence_type] || lead.sequence_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 6, background: '#1E1E1E', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${stepPct}%`, background: SECTOR_COLORS[lead.sequence_type] || '#888', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#888' }}>{lead.sequence_step}/{MAX_STEPS}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: status.bg, color: status.color, fontWeight: 600 }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor }}>{lead.lead_score || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: 12 }}>
                        {lead.enrolled_at ? timeAgo(lead.enrolled_at) : '–'}
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a href={`mailto:${lead.email}`} title="Email" style={{ fontSize: 14, textDecoration: 'none' }}>✉️</a>
                          {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ fontSize: 14, textDecoration: 'none' }}>🔗</a>}
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

      {/* ── Detail Modal ──────────────────────────────────────────────── */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setSelectedLead(null)}>
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '80vh', overflowY: 'auto', padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>{selectedLead.first_name} {selectedLead.last_name}</h2>
                <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{selectedLead.company} · {selectedLead.title} · {selectedLead.email}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            {/* Lead info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Score', value: selectedLead.lead_score || 0, color: selectedLead.lead_score >= 80 ? CORAL : selectedLead.lead_score >= 50 ? '#EAB308' : '#555' },
                { label: 'Sequenz', value: SECTOR_LABELS[selectedLead.sequence_type] || '–' },
                { label: 'Step', value: `${selectedLead.sequence_step}/${MAX_STEPS}` },
                { label: 'Status', value: (STATUS_CONFIG[selectedLead.sequence_status] || STATUS_CONFIG.none).label },
              ].map((item, i) => (
                <div key={i} style={{ background: '#0A0A0A', borderRadius: 8, padding: 12, border: '1px solid #1E1E1E' }}>
                  <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: (item as any).color || '#F0F0F5', margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Event Timeline */}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Sequenz-Timeline</p>
            <div style={{ background: '#0A0A0A', borderRadius: 8, padding: 14, border: '1px solid #1E1E1E', maxHeight: 250, overflowY: 'auto', marginBottom: 16 }}>
              {detailLoading ? (
                <p style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>Lade...</p>
              ) : leadEvents.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>Keine Events.</p>
              ) : leadEvents.map((e: any, i: number) => {
                const eventColors: Record<string, string> = { sent: '#888', opened: '#22C55E', clicked: '#3B82F6', replied: '#8B5CF6', bounced: '#EF4444', failed: '#EF4444' };
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < leadEvents.length - 1 ? '1px solid #1E1E1E' : 'none' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: eventColors[e.event_type] || '#555', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#ccc', fontWeight: 500 }}>{e.event_type}</span>
                    <span style={{ fontSize: 11, color: '#555' }}>Step {e.step_number} · {e.sequence_type}</span>
                    <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>{timeAgo(e.created_at)}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`mailto:${selectedLead.email}`}
                style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#1E1E1E', borderRadius: 8, color: '#ccc', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                ✉️ Email senden
              </a>
              {selectedLead.linkedin_url && (
                <a href={selectedLead.linkedin_url} target="_blank" rel="noreferrer"
                  style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#1E1E1E', borderRadius: 8, color: '#ccc', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                  🔗 LinkedIn öffnen
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) { .sector-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  );
}
