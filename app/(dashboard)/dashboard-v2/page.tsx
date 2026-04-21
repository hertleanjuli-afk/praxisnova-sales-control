/**
 * Dashboard V2 (Track 1, T1.2).
 *
 * Server Component mit 60s-Revalidate (Track-1-Prompt + Spec Teil 1
 * Acceptance). Zaehlt Lead-, Sequenz-, LinkedIn-, Call- und Block-Metriken
 * parallel via Promise.all, liefert Konsistenz-Invariante am Footer.
 *
 * Gate 5 (Cost): kein LLM, nur SQL-Aggregation.
 * Gate 6 (Scale): Indexe aus Migration v9 + v10.
 * Gate 7 (Extensibility): Sequenz-Typen aus lib/metrics.ts, Sector-Breakdown
 *   kommt aus denselben Rows wie Total (COALESCE sequence_type).
 */

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import {
  buildTimeWindows,
  calcConversionRate,
  checkConsistency,
} from '@/lib/metrics';
import {
  getLeadMetrics,
  getSequenceMetrics,
  getLinkedInMetrics,
  getCallMetrics,
  getBlockMetrics,
  getConsistencyInput,
  type LinkedInTimeWindowCounts,
} from '@/lib/metrics-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// ---------------------------------------------------------------------------
// Design Tokens (an Bestands-Dashboard angelehnt)
// ---------------------------------------------------------------------------
const CORAL = '#E8472A';
const GREEN = '#22C55E';
const RED = '#EF4444';
const BG_CARD = '#1a1a1a';
const BORDER = '#333';
const TEXT_MUTED = '#888';

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: TEXT_MUTED,
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent = false,
  hint,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      style={{
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent ? CORAL : '#fff',
          lineHeight: 1.1,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
      </div>
      {hint ? (
        <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function LinkedInWindowBlock({
  heading,
  counts,
}: {
  heading: string;
  counts: LinkedInTimeWindowCounts;
}) {
  return (
    <div
      style={{
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: TEXT_MUTED,
          marginBottom: 8,
          fontWeight: 600,
          letterSpacing: 0.5,
        }}
      >
        {heading}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {(
          [
            ['Heute', counts.today],
            ['Woche', counts.thisWeek],
            ['Letzte', counts.lastWeek],
            ['Monat', counts.month],
          ] as const
        ).map(([label, val]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: TEXT_MUTED }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {val.toLocaleString('de-DE')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsistencyBanner({
  consistent,
  totalLeads,
  sectorSum,
  delta,
  sectorBreakdown,
}: {
  consistent: boolean;
  totalLeads: number;
  sectorSum: number;
  delta: number;
  sectorBreakdown: { sector: string; count: number }[];
}) {
  const bg = consistent ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
  const border = consistent ? GREEN : RED;
  const label = consistent ? 'Konsistenz OK' : 'Konsistenz-Alarm';
  const msg = consistent
    ? `Summe Branchen (${sectorSum}) = Gesamt (${totalLeads}).`
    : `Summe Branchen (${sectorSum}) weicht von Gesamt (${totalLeads}) um ${delta > 0 ? '+' : ''}${delta} ab. Query pruefen.`;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        color: '#fff',
      }}
    >
      <div style={{ fontWeight: 600, color: border, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#ddd', marginBottom: 6 }}>{msg}</div>
      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
        {sectorBreakdown
          .map((s) => `${s.sector}: ${s.count}`)
          .join(' | ')}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardV2Page() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const windows = buildTimeWindows();

  const [leads, sequences, linkedin, calls, blocks, consistencyInput] =
    await Promise.all([
      getLeadMetrics(windows),
      getSequenceMetrics(windows),
      getLinkedInMetrics(windows),
      getCallMetrics(windows),
      getBlockMetrics(windows),
      getConsistencyInput(),
    ]);

  const consistency = checkConsistency(
    consistencyInput.sectorBreakdown,
    consistencyInput.totalLeads
  );
  const conversionWeek = calcConversionRate(
    linkedin.requestsSent.thisWeek,
    linkedin.requestsAccepted.thisWeek
  );
  const conversionMonth = calcConversionRate(
    linkedin.requestsSent.month,
    linkedin.requestsAccepted.month
  );

  return (
    <div style={{ padding: 24, color: '#fff', maxWidth: 1400 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          Dashboard V2
        </h1>
        <div style={{ fontSize: 12, color: TEXT_MUTED }}>
          Aktualisiert: {new Date(windows.now).toLocaleString('de-DE')}{' '}
          (Cache 60s)
        </div>
      </div>

      <ConsistencyBanner
        consistent={consistency.consistent}
        totalLeads={consistency.totalLeads}
        sectorSum={consistency.sectorSum}
        delta={consistency.delta}
        sectorBreakdown={consistencyInput.sectorBreakdown}
      />

      <Section title="Leads">
        <Metric label="Heute" value={leads.today} accent />
        <Metric label="Diese Woche (Iso)" value={leads.thisWeek} />
        <Metric label="Letzte Woche" value={leads.lastWeek} />
        <Metric label="Dieser Monat" value={leads.month} />
      </Section>

      <Section title="Sequenzen">
        <Metric label="Gestartet heute" value={sequences.startedToday} accent />
        <Metric label="Gestartet Woche" value={sequences.startedThisWeek} />
        <Metric label="Gestartet letzte Woche" value={sequences.startedLastWeek} />
        <Metric label="Aktiv gesamt" value={sequences.activeTotal} />
        <Metric
          label="Auf letztem Step"
          value={sequences.onLastStep}
          hint="sequence_step >= Max pro Type"
        />
        <Metric label="Pausiert" value={sequences.paused} />
        <Metric
          label="Beendet ohne Reply"
          value={sequences.endedWithoutReply}
        />
      </Section>

      <Section title="LinkedIn">
        <LinkedInWindowBlock
          heading="Verknuepfungen verschickt"
          counts={linkedin.requestsSent}
        />
        <LinkedInWindowBlock
          heading="Verknuepfungen angenommen"
          counts={linkedin.requestsAccepted}
        />
        <LinkedInWindowBlock
          heading="Nachrichten verschickt"
          counts={linkedin.messagesSent}
        />
        <LinkedInWindowBlock
          heading="Nachrichten erhalten"
          counts={linkedin.messagesReceived}
        />
        <Metric
          label="Conversion Woche"
          value={`${conversionWeek}%`}
          hint="accepted / sent (Iso-Woche)"
        />
        <Metric
          label="Conversion Monat"
          value={`${conversionMonth}%`}
          accent
          hint="accepted / sent (Monat)"
        />
      </Section>

      <Section title="Anrufe">
        <Metric label="Offen heute" value={calls.openToday} accent />
        <Metric label="Erledigt heute" value={calls.doneToday} />
        <Metric label="Callbacks offen" value={calls.callbacksOpen} />
      </Section>

      <Section title="Blocks">
        <Metric label="Personen blockiert" value={blocks.personsBlocked} />
        <Metric label="Firmen blockiert" value={blocks.companiesBlocked} />
        <Metric
          label="Laeuft ab <=30 Tage"
          value={blocks.expiringIn30Days}
          hint="Personen + Firmen"
        />
      </Section>
    </div>
  );
}
