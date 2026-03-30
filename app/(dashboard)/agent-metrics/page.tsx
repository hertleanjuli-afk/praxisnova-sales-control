'use client';

import { useState, useEffect } from 'react';

interface MetricsData {
  automation: {
    emails_sent_week: number; emails_sent_total: number;
    open_rate: number; reply_rate: number;
    active_sequences: number; pipeline_leads: number; linkedin_manual: number;
  };
  agents: {
    prospect_qualified_week: number; prospect_qualified_total: number;
    prospect_avg_score: number; prospect_high_priority: number; prospect_approach: string;
    partner_qualified_month: number; partner_qualified_total: number;
    partner_tier1: number; partner_approach: string;
    linkedin_prepared: number; linkedin_ready: number;
    prospect_kpi: string; partner_kpi: string;
    re_engage_total: number; re_engage_with_signal: number;
  };
}

const KPI_MAP: Record<string, { label: string; color: string }> = {
  on_track: { label: '\u2705 Auf Kurs', color: '#22C55E' },
  below: { label: '\u26A0\uFE0F Unter Ziel', color: '#EAB308' },
  critical: { label: '\uD83D\uDD34 Kritisch', color: '#EF4444' },
};

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 10, padding: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#555', margin: '0 0 6px', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

export default function AgentMetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent-metrics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#888' }}>Laden...</p>;
  if (!data) return <p style={{ color: '#EF4444' }}>Fehler beim Laden der Metriken.</p>;

  const { automation: a, agents: ag } = data;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F5', marginBottom: 24 }}>Agent-Metriken</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* SECTION A — Automation */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#3B82F6' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>Automatisierter Workflow</h3>
          </div>
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <MetricCard label="E-Mails gesendet" value={a.emails_sent_total} sub={`Diese Woche: ${a.emails_sent_week}`} />
              <MetricCard label="\u00D6ffnungsrate" value={`${a.open_rate}%`} />
              <MetricCard label="Antwortrate" value={`${a.reply_rate}%`} />
              <MetricCard label="Aktive Sequenzen" value={a.active_sequences} />
              <MetricCard label="Leads in Pipeline" value={a.pipeline_leads} />
              <MetricCard label="LinkedIn Anfragen" value={a.linkedin_manual} sub="Manuell" />
            </div>
          </div>
        </div>

        {/* SECTION B — AI Agents */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#E8472A' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>KI-Agenten</h3>
          </div>
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <MetricCard label="Leads qualifiziert" value={ag.prospect_qualified_total} sub={`Diese Woche: ${ag.prospect_qualified_week}`} />
              <MetricCard label="Partner qualifiziert" value={ag.partner_qualified_total} sub={`Dieser Monat: ${ag.partner_qualified_month}`} />
              <MetricCard label="\u00D8 Score Leads" value={ag.prospect_avg_score} />
              <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#555', margin: '0 0 6px', textTransform: 'uppercase' }}>Aktiver Ansatz</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#888' }}>Prospect: </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: ag.prospect_approach === 'C' ? '#EF4444' : ag.prospect_approach === 'B' ? '#EAB308' : '#22C55E' }}>{ag.prospect_approach}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#888' }}>Partner: </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: ag.partner_approach === 'C' ? '#EF4444' : ag.partner_approach === 'B' ? '#EAB308' : '#22C55E' }}>{ag.partner_approach}</span>
                  </div>
                </div>
              </div>
              <MetricCard label="Personalisierte E-Mails" value="\u2014" sub="Phase 2" />
              <MetricCard label="LinkedIn vorbereitet" value={ag.linkedin_prepared} sub={`Bereit: ${ag.linkedin_ready}`} />
              <MetricCard label="Meetings \u2014 Prospects" value="\u2014" sub="Phase 2 (Calendly)" />
              <MetricCard label="Meetings \u2014 Partner" value="\u2014" sub="Phase 2 (Calendly)" />
            </div>

            {/* KPI Status */}
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#555', margin: '0 0 6px', textTransform: 'uppercase' }}>KPI Prospects</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: KPI_MAP[ag.prospect_kpi]?.color ?? '#888', margin: 0 }}>
                  {KPI_MAP[ag.prospect_kpi]?.label ?? '\u2014'}
                </p>
                <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>Pipeline: {ag.prospect_high_priority} / 67</p>
              </div>
              <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#555', margin: '0 0 6px', textTransform: 'uppercase' }}>KPI Partner</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: KPI_MAP[ag.partner_kpi]?.color ?? '#888', margin: 0 }}>
                  {KPI_MAP[ag.partner_kpi]?.label ?? '\u2014'}
                </p>
                <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>Pipeline: {ag.partner_tier1} / 50</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Re-Engagement Pool */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#EAB308' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>Re-Engagement Pool</h3>
          <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>Wartet auf Re-Engagement Agent</span>
        </div>
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <MetricCard label="Leads in 'Wieder aufnehmen'" value={ag.re_engage_total} />
            <MetricCard label="Davon mit Signal" value={ag.re_engage_with_signal} sub="E-Mail-Antwort, LinkedIn oder News" />
            <MetricCard label="Davon ohne Signal" value={ag.re_engage_total - ag.re_engage_with_signal} sub="Kein Grund zur Kontaktaufnahme" />
          </div>
        </div>
      </div>
    </div>
  );
}
