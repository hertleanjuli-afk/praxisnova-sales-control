'use client';

import { useState, useEffect, useMemo } from 'react';

// Types
interface Kpis {
  newLeads: number;
  contactedLeads: number;
  enrolledLeads: number;
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsReplied: number;
  meetingsBooked: number;
}

interface LeadRow {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  company: string | null;
  title: string | null;
  sector: string;
  sequenceStatus: string | null;
  sequenceStep: number;
  source: string | null;
  createdAt: string;
  enrolledAt: string | null;
  firstEmailSentAt: string | null;
  lastEmailSentAt: string | null;
  emailsSent: number;
  emailsOpened: number;
  emailsReplied: number;
}

interface SectorBreakdown {
  sector: string;
  count: number;
  enrolledCount: number;
}

interface DailyTimeline {
  day: string;
  newLeads: number;
  enrolled: number;
  inbound: number;
}

interface EmailTimeline {
  day: string;
  sent: number;
  opened: number;
  replied: number;
}

interface WochenberichtData {
  period: string;
  periodStart: string;
  generatedAt: string;
  kpis: Kpis;
  leadsBoard: LeadRow[];
  sectorBreakdown: SectorBreakdown[];
  dailyTimeline: DailyTimeline[];
  emailTimeline: EmailTimeline[];
}

// Constants
const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien',
  handwerk: 'Handwerk',
  bauunternehmen: 'Bau',
  bau: 'Bau',
  inbound: 'Inbound',
  allgemein: 'Allgemein',
};

const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A',
  handwerk: '#3B82F6',
  bauunternehmen: '#22C55E',
  bau: '#22C55E',
  inbound: '#EAB308',
  allgemein: '#8B5CF6',
};

// Helpers
function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

function timeDiff(from: string, to: string | null): string {
  if (!to) return '-';
  const diff = new Date(to).getTime() - new Date(from).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Std`;
  const days = Math.floor(hours / 24);
  return `${days} Tag${days === 1 ? '' : 'e'}`;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #1E1E1E',
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <Card>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: accent || '#fff', lineHeight: 1 }}>
        {value}
      </div>
      {sublabel && <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{sublabel}</div>}
    </Card>
  );
}

export default function WochenberichtPage() {
  const [data, setData] = useState<WochenberichtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'last7' | 'today'>('week');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/wochenbericht?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [period]);

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    if (sectorFilter === 'all') return data.leadsBoard;
    return data.leadsBoard.filter((l) => l.sector === sectorFilter);
  }, [data, sectorFilter]);

  if (loading) {
    return (
      <div style={{ padding: 40, color: '#888' }}>
        Wochenbericht wird geladen...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, color: '#EF4444' }}>
        Fehler: {error || 'Keine Daten'}
      </div>
    );
  }

  const { kpis } = data;
  const openRate = kpis.totalEmailsSent > 0
    ? ((kpis.totalEmailsOpened / kpis.totalEmailsSent) * 100).toFixed(1)
    : '0';
  const replyRate = kpis.totalEmailsSent > 0
    ? ((kpis.totalEmailsReplied / kpis.totalEmailsSent) * 100).toFixed(1)
    : '0';
  const contactRate = kpis.newLeads > 0
    ? ((kpis.contactedLeads / kpis.newLeads) * 100).toFixed(0)
    : '0';

  const maxDailyLeads = Math.max(...data.dailyTimeline.map((d) => d.newLeads), 1);

  return (
    <div style={{ padding: 24, background: '#0A0A0A', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Wochenbericht</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
            Lead-Pipeline und Email-Outreach seit {new Date(data.periodStart).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['today', 'week', 'last7'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? '#E8472A' : '#1a1a1a',
                color: period === p ? '#fff' : '#888',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p === 'today' ? 'Heute' : p === 'week' ? 'Diese Woche' : 'Letzte 7 Tage'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Neue Leads"
          value={kpis.newLeads}
          sublabel={`${contactRate}% wurden kontaktiert`}
          accent="#E8472A"
        />
        <KpiCard
          label="Kontaktiert per Email"
          value={kpis.contactedLeads}
          sublabel={`${kpis.totalEmailsSent} Emails gesendet`}
          accent="#3B82F6"
        />
        <KpiCard
          label="In Sequenz aufgenommen"
          value={kpis.enrolledLeads}
          sublabel="enrolled_at gesetzt"
          accent="#22C55E"
        />
        <KpiCard
          label="Emails geoeffnet"
          value={kpis.totalEmailsOpened}
          sublabel={`${openRate}% Open-Rate`}
          accent="#EAB308"
        />
        <KpiCard
          label="Email-Antworten"
          value={kpis.totalEmailsReplied}
          sublabel={`${replyRate}% Reply-Rate`}
          accent="#8B5CF6"
        />
        <KpiCard
          label="Termine gebucht"
          value={kpis.meetingsBooked}
          sublabel="sequence_status = booked"
          accent="#EC4899"
        />
      </div>

      {/* Daily Timeline + Sector Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Neue Leads pro Tag</div>
          {data.dailyTimeline.length === 0 ? (
            <div style={{ color: '#666', fontSize: 13 }}>Keine Daten</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
              {data.dailyTimeline.map((d) => (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 11, color: '#888' }}>{d.newLeads}</div>
                  <div
                    style={{
                      width: '100%',
                      height: `${(d.newLeads / maxDailyLeads) * 140}px`,
                      background: '#E8472A',
                      borderRadius: 4,
                      minHeight: 4,
                    }}
                    title={`${d.newLeads} Leads, ${d.enrolled} in Sequenz, ${d.inbound} Inbound`}
                  />
                  <div style={{ fontSize: 11, color: '#666' }}>{formatDate(d.day)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Sektoren</div>
          {data.sectorBreakdown.length === 0 ? (
            <div style={{ color: '#666', fontSize: 13 }}>Keine Daten</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.sectorBreakdown.map((s) => (
                <div key={s.sector}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{SECTOR_LABELS[s.sector] || s.sector}</span>
                    <span style={{ color: '#888' }}>
                      {s.count} / {s.enrolledCount} in Sequenz
                    </span>
                  </div>
                  <div style={{ background: '#1a1a1a', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${kpis.newLeads > 0 ? (s.count / kpis.newLeads) * 100 : 0}%`,
                        height: '100%',
                        background: SECTOR_COLORS[s.sector] || '#666',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#888' }}>Filter:</span>
        <button
          onClick={() => setSectorFilter('all')}
          style={{
            background: sectorFilter === 'all' ? '#E8472A' : '#1a1a1a',
            color: '#fff',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Alle ({data.leadsBoard.length})
        </button>
        {data.sectorBreakdown.map((s) => (
          <button
            key={s.sector}
            onClick={() => setSectorFilter(s.sector)}
            style={{
              background: sectorFilter === s.sector ? SECTOR_COLORS[s.sector] || '#666' : '#1a1a1a',
              color: '#fff',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {SECTOR_LABELS[s.sector] || s.sector} ({s.count})
          </button>
        ))}
      </div>

      {/* Detail Board Table */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          Lead-Board ({filteredLeads.length} Leads)
        </div>
        {filteredLeads.length === 0 ? (
          <div style={{ color: '#666', fontSize: 13, padding: 20, textAlign: 'center' }}>
            Keine Leads in diesem Zeitraum
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #1E1E1E' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Firma</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Sektor</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Quelle</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Hinzugefuegt</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>In Sequenz</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>1. Email</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Emails</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email;
                  const isContacted = lead.emailsSent > 0;
                  const isEnrolled = !!lead.enrolledAt;
                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid #161616',
                      }}
                    >
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 500 }}>{fullName}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{lead.email}</div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div>{lead.company || '-'}</div>
                        {lead.title && <div style={{ fontSize: 11, color: '#666' }}>{lead.title}</div>}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span
                          style={{
                            background: (SECTOR_COLORS[lead.sector] || '#666') + '20',
                            color: SECTOR_COLORS[lead.sector] || '#888',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {SECTOR_LABELS[lead.sector] || lead.sector}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', color: '#888' }}>{lead.source || '-'}</td>
                      <td style={{ padding: '10px 8px', color: '#ccc' }}>{formatDateTime(lead.createdAt)}</td>
                      <td style={{ padding: '10px 8px' }}>
                        {isEnrolled ? (
                          <div>
                            <div style={{ color: '#22C55E' }}>{formatDateTime(lead.enrolledAt)}</div>
                            <div style={{ fontSize: 10, color: '#666' }}>
                              +{timeDiff(lead.createdAt, lead.enrolledAt)} nach Import
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#666' }}>nicht aufgenommen</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {isContacted ? (
                          <div>
                            <div style={{ color: '#3B82F6' }}>{formatDateTime(lead.firstEmailSentAt)}</div>
                            <div style={{ fontSize: 10, color: '#666' }}>
                              +{timeDiff(lead.createdAt, lead.firstEmailSentAt)} nach Import
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#EF4444' }}>nicht kontaktiert</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#ccc' }}>
                        <div>
                          <span style={{ color: '#3B82F6' }}>{lead.emailsSent}</span>
                          {' / '}
                          <span style={{ color: '#EAB308' }}>{lead.emailsOpened}</span>
                          {' / '}
                          <span style={{ color: '#8B5CF6' }}>{lead.emailsReplied}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#666' }}>sent / open / reply</div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              lead.sequenceStatus === 'active'
                                ? '#22C55E'
                                : lead.sequenceStatus === 'booked'
                                ? '#EC4899'
                                : lead.sequenceStatus === 'pending_optin'
                                ? '#EAB308'
                                : '#888',
                          }}
                        >
                          {lead.sequenceStatus || '-'}
                        </span>
                        {lead.sequenceStep > 0 && (
                          <div style={{ fontSize: 10, color: '#666' }}>Step {lead.sequenceStep}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ fontSize: 11, color: '#555', textAlign: 'center', marginTop: 16 }}>
        Generiert: {new Date(data.generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
      </div>
    </div>
  );
}
