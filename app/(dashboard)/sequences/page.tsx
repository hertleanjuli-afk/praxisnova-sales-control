'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

const CORAL = '#E8472A';

const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A',
  handwerk: '#3B82F6',
  bauunternehmen: '#22C55E',
  inbound: '#EAB308',
  allgemein: '#8B5CF6',
};

const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien',
  handwerk: 'Handwerk',
  bauunternehmen: 'Bau',
  inbound: 'Inbound',
  allgemein: 'Allgemein',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktiv', color: '#22C55E', bg: '#22C55E20' },
  paused: { label: 'Pausiert', color: '#F59E0B', bg: '#F59E0B20' },
  blocked: { label: 'Blockiert', color: '#EF4444', bg: '#EF444420' },
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
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  title: string;
  sequence_type: string;
  sequence_step: number;
  sequence_status: string;
  enrolled_at: string;
  lead_score: number;
  linkedin_url: string;
  exited_at: string | null;
  paused_at: string | null;
  resume_at: string | null;
  pause_reason: string | null;
  block_reason: string | null;
  blocked_until: string | null;
  pipeline_stage: string;
  phone: string | null;
  // Signal-Indikatoren (aus /api/sequences/status)
  has_opened?: boolean;
  linkedin_connected?: boolean;
  last_event?: { event_type: string; step_number: number; created_at: string } | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} T.`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const MAX_STEPS = 6;

// Block Dialog
function BlockDialog({ lead, onBlock, onClose }: {
  lead: Lead;
  onBlock: (reason: string, months: number, notes: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('manual_stop');
  const [months, setMonths] = useState(9);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (reason === 'wrong_timing') setMonths(3);
    else setMonths(9);
  }, [reason]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F5', margin: '0 0 4px' }}>Sequence stoppen</h3>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>{lead.first_name} {lead.last_name} - {lead.company}</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Grund</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ccc' }}>
            <option value="manual_stop">Manuell gestoppt (9 Monate)</option>
            <option value="no_interest">Kein Interesse (9 Monate)</option>
            <option value="wrong_timing">Falscher Zeitpunkt (3 Monate)</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Dauer (Monate)</label>
          <input type="number" value={months} onChange={e => setMonths(parseInt(e.target.value, 10))} min={1} max={24}
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ccc' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Notiz (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optionaler Kommentar..."
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ccc', resize: 'vertical' }} />
        </div>

        <p style={{ fontSize: 12, color: '#F59E0B', margin: '0 0 16px' }}>
          Alle Leads der Firma &quot;{lead.company}&quot; werden ebenfalls blockiert.
        </p>

        <div id="block-error" />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#1E1E1E', border: 'none', borderRadius: 8, color: '#ccc', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={() => onBlock(reason, months, notes)} style={{ padding: '8px 16px', background: '#EF4444', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Stoppen &amp; Blockieren</button>
        </div>
      </div>
    </div>
  );
}

// OOO / Pause Dialog
function OOODialog({ lead, onPause, onClose }: {
  lead: Lead;
  onPause: (resumeDate: string, reason: string) => void;
  onClose: () => void;
}) {
  const [resumeDate, setResumeDate] = useState('');
  const [reason, setReason] = useState('ooo');
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F5', margin: '0 0 4px' }}>OOO / Pause setzen</h3>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>{lead.first_name} {lead.last_name} - {lead.company}</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Grund</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ccc' }}>
            <option value="ooo">Out of Office / Urlaub</option>
            <option value="manual_pause">Manuell pausiert</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Sequence weiter ab (Datum)</label>
          <input type="date" value={resumeDate} onChange={e => setResumeDate(e.target.value)} min={today}
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ccc' }} />
        </div>

        <p style={{ fontSize: 12, color: '#3B82F6', margin: '0 0 16px' }}>
          Die Sequence wird automatisch am gewaehlten Datum fortgesetzt.
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#1E1E1E', border: 'none', borderRadius: 8, color: '#ccc', fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={() => resumeDate && onPause(resumeDate, reason)} disabled={!resumeDate}
            style={{ padding: '8px 16px', background: resumeDate ? '#F59E0B' : '#333', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 600, cursor: resumeDate ? 'pointer' : 'not-allowed', opacity: resumeDate ? 1 : 0.5 }}>Pausieren</button>
        </div>
      </div>
    </div>
  );
}

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
  const [blockTarget, setBlockTarget] = useState<Lead | null>(null);
  const [oooTarget, setOOOTarget] = useState<Lead | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sectorFilter !== 'all') params.set('sector', sectorFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (!statusFilter || statusFilter === 'all') params.set('status', 'all');
      const res = await fetch(`/api/sequences/status?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      setLeads([]);
    }
    setLoading(false);
  }, [sectorFilter, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Sector stats
  const sectorStats = useMemo(() => {
    const stats: Record<string, { active: number; paused: number; blocked: number; totalStep: number; count: number }> = {};
    for (const lead of leads) {
      const s = lead.sequence_type || 'allgemein';
      if (!stats[s]) stats[s] = { active: 0, paused: 0, blocked: 0, totalStep: 0, count: 0 };
      if (lead.sequence_status === 'active') stats[s].active++;
      if (lead.sequence_status === 'paused') stats[s].paused++;
      if (lead.sequence_status === 'blocked') stats[s].blocked++;
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
      result = result.filter(l =>
        `${l.first_name} ${l.last_name} ${l.company} ${l.email}`.toLowerCase().includes(q)
      );
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeadEvents(data.events || []);
      }
    } catch { /* */ }
    setDetailLoading(false);
  };

  // Block handler
  const handleBlock = async (reason: string, months: number, notes: string) => {
    if (!blockTarget) return;
    setActionLoading(blockTarget.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/leads/${blockTarget.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, duration_months: months, notes, block_company: true }),
      });
      if (res.ok) {
        setBlockTarget(null);
        setSelectedLead(null);
        fetchLeads();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || `Fehler ${res.status}: ${res.statusText}`;
        setActionError(msg);
        console.error('Block API error:', res.status, data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Netzwerkfehler';
      setActionError(msg);
      console.error('Block error:', err);
    }
    setActionLoading(null);
  };

  // OOO Pause handler
  const handlePause = async (resumeDate: string, reason: string) => {
    if (!oooTarget) return;
    setActionLoading(oooTarget.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/leads/${oooTarget.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_date: resumeDate, reason }),
      });
      if (res.ok) {
        setOOOTarget(null);
        setSelectedLead(null);
        fetchLeads();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || `Fehler ${res.status}: ${res.statusText}`;
        setActionError(msg);
        console.error('Pause API error:', res.status, data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Netzwerkfehler';
      setActionError(msg);
      console.error('Pause error:', err);
    }
    setActionLoading(null);
  };

  // Resume handler
  const handleResume = async (lead: Lead) => {
    setActionLoading(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/pause`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error('Resume error:', err);
    }
    setActionLoading(null);
  };

  // Unblock handler
  const handleUnblock = async (lead: Lead) => {
    setActionLoading(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/block`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error('Unblock error:', err);
    }
    setActionLoading(null);
  };

  const sectors = ['immobilien', 'handwerk', 'bauunternehmen', 'allgemein', 'inbound'];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Sector Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }} className="sector-grid">
        {sectors.map(s => {
          const st = sectorStats[s] || { active: 0, paused: 0, blocked: 0, totalStep: 0, count: 0 };
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
              <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                aktiv ÃÂ· {st.paused > 0 ? `${st.paused} pausiert ÃÂ· ` : ''}{st.blocked > 0 ? `${st.blocked} blockiert ÃÂ· ` : ''}ÃÂ Step {avgStep}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Suche nach Name, Firma..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#ccc', width: 220 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#ccc' }}>
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="paused">Pausiert / OOO</option>
          <option value="blocked">Blockiert</option>
          <option value="completed">Abgeschlossen</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#ccc' }}>
          <option value="lead_score">Score (hoechste)</option>
          <option value="name">Name</option>
          <option value="step">Step</option>
          <option value="enrolled">Enrolled</option>
        </select>
        <span style={{ fontSize: 12, color: '#555', marginLeft: 'auto' }}>{filtered.length} Leads</span>
      </div>

      {/* Lead Table */}
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
                  const isLoading = actionLoading === lead.id;

                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #1E1E1E', cursor: 'pointer' }}
                      onClick={() => openDetail(lead)}
                      onMouseEnter={e => e.currentTarget.style.background = '#1A1A1A'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <Link
                          href={`/lead/${lead.id}`}
                          style={{ fontWeight: 600, color: '#F0F0F5', textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#E8472A')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#F0F0F5')}
                        >
                          {lead.first_name} {lead.last_name}
                        </Link>
                        {lead.has_opened && (
                          <span title="Email geöffnet" style={{ marginLeft: 6, fontSize: 13 }}>&#128293;</span>
                        )}
                        {lead.linkedin_connected && (
                          <span title="LinkedIn vernetzt" style={{ marginLeft: 4, fontSize: 13 }}>&#128279;</span>
                        )}
                        {lead.title && <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>{lead.title}</p>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#ccc' }}>{lead.company || '-'}</td>
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
                        {lead.sequence_status === 'paused' && lead.resume_at && (
                          <p style={{ fontSize: 10, color: '#F59E0B', margin: '2px 0 0' }}>bis {formatDate(lead.resume_at)}</p>
                        )}
                        {lead.sequence_status === 'blocked' && lead.blocked_until && (
                          <p style={{ fontSize: 10, color: '#EF4444', margin: '2px 0 0' }}>bis {formatDate(lead.blocked_until)}</p>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor }}>{lead.lead_score || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: 12 }}>
                        {lead.enrolled_at ? timeAgo(lead.enrolled_at) : '-'}
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {lead.sequence_status === 'active' && (
                            <>
                              <button onClick={() => setBlockTarget(lead)} disabled={isLoading}
                                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#EF444420', color: '#EF4444', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                Stoppen
                              </button>
                              <button onClick={() => setOOOTarget(lead)} disabled={isLoading}
                                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#F59E0B20', color: '#F59E0B', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                OOO
                              </button>
                            </>
                          )}
                          {lead.sequence_status === 'paused' && (
                            <button onClick={() => handleResume(lead)} disabled={isLoading}
                              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#22C55E20', color: '#22C55E', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                              {isLoading ? '...' : 'Fortsetzen'}
                            </button>
                          )}
                          {lead.sequence_status === 'blocked' && (
                            <button onClick={() => handleUnblock(lead)} disabled={isLoading}
                              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#3B82F620', color: '#3B82F6', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                              {isLoading ? '...' : 'Entsperren'}
                            </button>
                          )}
                          <a href={`mailto:${lead.email}`} title="Email" style={{ fontSize: 14, textDecoration: 'none', padding: '2px 4px' }}>&#9993;</a>
                          {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ fontSize: 14, textDecoration: 'none', padding: '2px 4px' }}>&#128279;</a>}
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

      {/* Detail Modal */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setSelectedLead(null)}>
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '80vh', overflowY: 'auto', padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>{selectedLead.first_name} {selectedLead.last_name}</h2>
                <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{selectedLead.company} - {selectedLead.title} - {selectedLead.email}{selectedLead.phone ? ` - ${selectedLead.phone}` : ''}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 24, cursor: 'pointer' }}>x</button>
            </div>

            {/* Lead info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Score', value: selectedLead.lead_score || 0, color: selectedLead.lead_score >= 80 ? CORAL : selectedLead.lead_score >= 50 ? '#EAB308' : '#555' },
                { label: 'Sequenz', value: SECTOR_LABELS[selectedLead.sequence_type] || '-' },
                { label: 'Step', value: `${selectedLead.sequence_step}/${MAX_STEPS}` },
                { label: 'Status', value: (STATUS_CONFIG[selectedLead.sequence_status] || STATUS_CONFIG.none).label },
              ].map((item, i) => (
                <div key={i} style={{ background: '#0A0A0A', borderRadius: 8, padding: 12, border: '1px solid #1E1E1E' }}>
                  <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: (item as any).color || '#F0F0F5', margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Pause/Block Info */}
            {selectedLead.sequence_status === 'paused' && (
              <div style={{ background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600, margin: '0 0 4px' }}>Pausiert{selectedLead.pause_reason === 'ooo' ? ' (Out of Office)' : ''}</p>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                  Seit {formatDate(selectedLead.paused_at)} - Weiter ab {formatDate(selectedLead.resume_at)}
                </p>
              </div>
            )}
            {selectedLead.sequence_status === 'blocked' && (
              <div style={{ background: '#EF444415', border: '1px solid #EF444440', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, margin: '0 0 4px' }}>Blockiert{selectedLead.block_reason ? ` (${selectedLead.block_reason})` : ''}</p>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                  Gesperrt bis {formatDate(selectedLead.blocked_until)}
                </p>
              </div>
            )}

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
                    <span style={{ fontSize: 11, color: '#555' }}>Step {e.step_number} - {e.sequence_type}</span>
                    <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>{timeAgo(e.created_at)}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedLead.sequence_status === 'active' && (
                <>
                  <button onClick={() => { setBlockTarget(selectedLead); }}
                    style={{ flex: 1, textAlign: 'center', padding: 10, background: '#EF444420', borderRadius: 8, color: '#EF4444', fontSize: 13, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    Sequence stoppen
                  </button>
                  <button onClick={() => { setOOOTarget(selectedLead); }}
                    style={{ flex: 1, textAlign: 'center', padding: 10, background: '#F59E0B20', borderRadius: 8, color: '#F59E0B', fontSize: 13, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    OOO / Pause
                  </button>
                </>
              )}
              {selectedLead.sequence_status === 'paused' && (
                <button onClick={() => handleResume(selectedLead)}
                  style={{ flex: 1, textAlign: 'center', padding: 10, background: '#22C55E20', borderRadius: 8, color: '#22C55E', fontSize: 13, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  Pause aufheben / Fortsetzen
                </button>
              )}
              {selectedLead.sequence_status === 'blocked' && (
                <button onClick={() => handleUnblock(selectedLead)}
                  style={{ flex: 1, textAlign: 'center', padding: 10, background: '#3B82F620', borderRadius: 8, color: '#3B82F6', fontSize: 13, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  Entsperren
                </button>
              )}
              <a href={`mailto:${selectedLead.email}`}
                style={{ flex: 1, textAlign: 'center', padding: 10, background: '#1E1E1E', borderRadius: 8, color: '#ccc', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                Email senden
              </a>
              {selectedLead.phone && (
                <a href={`tel:${selectedLead.phone}`}
                  style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#1E1E1E', borderRadius: 8, color: '#ccc', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                  {selectedLead.phone}
                </a>
              )}
              {selectedLead.linkedin_url && (
                <a href={selectedLead.linkedin_url} target="_blank" rel="noreferrer"
                  style={{ flex: 1, textAlign: 'center', padding: 10, background: '#1E1E1E', borderRadius: 8, color: '#ccc', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                  LinkedIn oeffnen
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {actionError && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: '#EF4444', color: 'white', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, maxWidth: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>x</button>
        </div>
      )}

      {/* Dialogs */}
      {blockTarget && (
        <BlockDialog lead={blockTarget} onBlock={handleBlock} onClose={() => { setBlockTarget(null); setActionError(null); }} />
      )}
      {oooTarget && (
        <OOODialog lead={oooTarget} onPause={handlePause} onClose={() => { setOOOTarget(null); setActionError(null); }} />
      )}

      <style>{`
        @media (max-width: 768px) {
          .sector-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
