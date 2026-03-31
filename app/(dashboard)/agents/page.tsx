'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ─── */

interface AgentDecision {
  id: number;
  decision_type: string;
  subject_company: string | null;
  subject_email: string | null;
  score: number | null;
  reasoning: string | null;
  status: string;
  created_at: string;
  data_payload?: unknown;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  schedule: string;
  role: string;
  last_active: string | null;
  decisions_today: number;
  status: 'active' | 'idle' | 'never_run';
  thinking_trail: AgentDecision[];
}

interface QueueEntry {
  id: number;
  agent_name: string;
  decision_type: string;
  subject_company: string | null;
  score: number | null;
  status: string;
  created_at: string;
}

interface Instruction {
  id: number;
  message: string;
  status: string;
  response: string | null;
  created_at: string;
}

/* ─── Constants ─── */

const AGENTS_FALLBACK: Agent[] = [];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: 'Aktiv',         bg: '#22C55E', color: '#000' },
  idle:      { label: 'Bereit',        bg: '#555',    color: '#F0F0F5' },
  never_run: { label: 'Nie gelaufen',  bg: '#EAB308', color: '#000' },
};

const DECISION_TYPE_COLOR: Record<string, string> = {
  approve:  '#22C55E',
  reject:   '#EF4444',
  qualify:  '#3B82F6',
  feedback: '#EAB308',
};

const DECISION_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#EAB308', color: '#000' },
  approved:  { bg: '#22C55E', color: '#000' },
  rejected:  { bg: '#EF4444', color: '#FFF' },
  completed: { bg: '#3B82F6', color: '#FFF' },
};

const AGENT_EMOJI_MAP: Record<string, string> = {
  prospect_researcher: '🔍',
  partner_researcher: '🤝',
  operations_manager: '📊',
  sales_supervisor: '✅',
  partner_supervisor: '🔎',
  outreach_strategist: '✉️',
  partner_outreach_strategist: '📨',
  inbound_response_agent: '⚡',
  market_intelligence: '🌍',
};

/* ─── Helpers ─── */

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ─── Sub-components ─── */

function Badge({ label, bg, color, fontSize = 10 }: { label: string; bg: string; color: string; fontSize?: number }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize,
      fontWeight: 600,
      background: bg,
      color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

/* ─── Agent Card ─── */

function AgentCard({ agent, selected, onClick }: { agent: Agent; selected: boolean; onClick: () => void }) {
  const s = STATUS_BADGE[agent.status] ?? STATUS_BADGE.idle;
  return (
    <div
      onClick={onClick}
      style={{
        background: '#111',
        border: selected ? '1.5px solid #E8472A' : '1px solid #1E1E1E',
        borderRadius: 10,
        padding: 12,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>
          {agent.emoji} {agent.name}
        </span>
        <Badge label={s.label} bg={s.bg} color={s.color} />
      </div>
      <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>{agent.role}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: '#555' }}>{agent.schedule}</span>
        {agent.decisions_today > 0 && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            background: '#E8472A',
            color: '#FFF',
            borderRadius: 10,
            padding: '1px 7px',
          }}>
            {agent.decisions_today} heute
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Thinking Trail Entry ─── */

function TrailEntry({ decision }: { decision: AgentDecision }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = DECISION_TYPE_COLOR[decision.decision_type] ?? '#555';
  const statusStyle = DECISION_STATUS_COLOR[decision.status] ?? { bg: '#555', color: '#F0F0F5' };

  return (
    <div style={{
      background: '#111',
      border: '1px solid #1E1E1E',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
            {formatTime(decision.created_at)}
          </span>
          <Badge label={decision.decision_type} bg={typeColor} color="#FFF" />
        </div>
        <Badge label={decision.status} bg={statusStyle.bg} color={statusStyle.color} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        {decision.subject_company && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5' }}>
            {decision.subject_company}
          </span>
        )}
        {decision.subject_email && !decision.subject_company && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5' }}>
            {decision.subject_email}
          </span>
        )}
        {decision.score !== null && decision.score !== undefined && (
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: decision.score >= 7 ? '#22C55E' : decision.score >= 4 ? '#EAB308' : '#EF4444',
          }}>
            {decision.score}/10
          </span>
        )}
      </div>

      {decision.reasoning && (
        <p
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 12,
            color: '#888',
            margin: '4px 0 0',
            cursor: 'pointer',
            display: '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' as unknown as number : 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: expanded ? 'visible' : 'hidden',
            lineHeight: '1.4',
          }}
        >
          {decision.reasoning}
        </p>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default function AgentDashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(AGENTS_FALLBACK);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─ Fetch agents data ─ */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) return;
      const data = await res.json();
      setAgents(data.agents ?? []);
      setQueue(data.queue ?? []);
      if (!selectedId && data.agents?.length > 0) {
        setSelectedId(data.agents[0].id);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [selectedId]);

  /* ─ Fetch instructions ─ */
  const fetchInstructions = useCallback(async () => {
    try {
      const res = await fetch('/api/manager-instructions');
      if (!res.ok) return;
      const data = await res.json();
      setInstructions(data.instructions ?? []);
    } catch { /* silent */ }
  }, []);

  /* ─ Initial load + 30s refresh ─ */
  useEffect(() => {
    fetchData();
    fetchInstructions();
    intervalRef.current = setInterval(() => {
      fetchData();
      fetchInstructions();
    }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData, fetchInstructions]);

  /* ─ Send instruction ─ */
  const sendInstruction = async () => {
    if (!msgText.trim()) return;
    const selected = agents.find(a => a.id === selectedId);
    const prefix = selected ? `${selected.id}: ` : '';
    const fullMessage = prefix + msgText.trim();

    // Optimistic update
    const optimistic: Instruction = {
      id: Date.now(),
      message: fullMessage,
      status: 'unread',
      response: null,
      created_at: new Date().toISOString(),
    };
    setInstructions(prev => [optimistic, ...prev]);
    setMsgText('');
    setSending(true);

    try {
      await fetch('/api/manager-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage }),
      });
      await fetchInstructions();
    } catch { /* keep optimistic */ }
    setSending(false);
  };

  /* ─ Derived state ─ */
  const selectedAgent = agents.find(a => a.id === selectedId) ?? null;
  const trail = selectedAgent?.thinking_trail ?? [];
  const recentInstructions = instructions.slice(0, 5);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#888', fontSize: 14 }}>Laden...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', minHeight: '80vh' }}>
      {/* ─── Header ─── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
          Agent Dashboard
        </h1>
        <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>
          Mission Control — {agents.length} Agenten | Letzte Aktualisierung alle 30s
        </p>
      </div>

      {/* ─── Top: 3-Column Layout ─── */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>

        {/* ── Section 1: Agent-Liste ── */}
        <div style={{
          width: 300,
          minWidth: 300,
          overflowY: 'auto',
          paddingRight: 4,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Agent-Liste
          </h2>
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={agent.id === selectedId}
              onClick={() => setSelectedId(agent.id)}
            />
          ))}
        </div>

        {/* ── Section 2: Thinking Trail ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: '#0A0A0A',
          border: '1px solid #1E1E1E',
          borderRadius: 12,
          padding: 16,
        }}>
          {selectedAgent ? (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F5', margin: '0 0 16px' }}>
                {'🧠'} Thinking Trail — {selectedAgent.emoji} {selectedAgent.name}
              </h2>
              {trail.length === 0 ? (
                <p style={{ color: '#555', fontSize: 13 }}>Keine Entscheidungen vorhanden.</p>
              ) : (
                trail.map(d => <TrailEntry key={d.id} decision={d} />)
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ color: '#555', fontSize: 14 }}>
                {'W\u00E4hle einen Agenten aus der Liste'}
              </p>
            </div>
          )}
        </div>

        {/* ── Section 3: Chat Panel ── */}
        <div style={{
          width: 320,
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          background: '#0A0A0A',
          border: '1px solid #1E1E1E',
          borderRadius: 12,
          padding: 16,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5', margin: '0 0 12px' }}>
            {'💬'} Anweisung an {selectedAgent ? `${selectedAgent.emoji} ${selectedAgent.name}` : 'Agenten'}
          </h2>

          <textarea
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            placeholder="Schreib dem Agenten eine Anweisung..."
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInstruction(); } }}
            style={{
              width: '100%',
              minHeight: 80,
              background: '#111',
              border: '1px solid #1E1E1E',
              borderRadius: 8,
              color: '#F0F0F5',
              fontSize: 13,
              padding: 10,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={sendInstruction}
            disabled={sending || !msgText.trim()}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '8px 0',
              background: sending || !msgText.trim() ? '#555' : '#E8472A',
              color: '#FFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: sending || !msgText.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {sending ? 'Wird gesendet...' : 'Senden'}
          </button>

          {/* Recent instructions */}
          <div style={{ marginTop: 16, flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>
              Letzte Anweisungen
            </p>
            {recentInstructions.length === 0 ? (
              <p style={{ fontSize: 12, color: '#555' }}>Keine Anweisungen.</p>
            ) : (
              recentInstructions.map(instr => (
                <div key={instr.id} style={{
                  background: '#111',
                  border: '1px solid #1E1E1E',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: '#555' }}>{formatTime(instr.created_at)}</span>
                    <Badge
                      label={instr.status === 'actioned' ? 'Bearbeitet' : 'Ungelesen'}
                      bg={instr.status === 'actioned' ? '#22C55E' : '#555'}
                      color={instr.status === 'actioned' ? '#000' : '#F0F0F5'}
                      fontSize={9}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: '#F0F0F5', margin: 0, lineHeight: 1.3 }}>
                    {instr.message}
                  </p>
                  {instr.response && (
                    <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0', borderTop: '1px solid #1E1E1E', paddingTop: 6 }}>
                      {instr.response}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Section 4: Queue (full width) ─── */}
      <div style={{
        marginTop: 16,
        background: '#0A0A0A',
        border: '1px solid #1E1E1E',
        borderRadius: 12,
        padding: 16,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5', margin: '0 0 12px' }}>
          {'📋'} Heutige Aktivit&auml;t
        </h2>
        {queue.length === 0 ? (
          <p style={{ color: '#555', fontSize: 13 }}>Noch keine Aktivit&auml;t heute</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Zeit', 'Agent', 'Typ', 'Unternehmen', 'Score', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderBottom: '1px solid #1E1E1E',
                      color: '#555',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map(entry => {
                  const agentObj = agents.find(a => a.id === entry.agent_name);
                  const emoji = AGENT_EMOJI_MAP[entry.agent_name] ?? '';
                  const typeColor = DECISION_TYPE_COLOR[entry.decision_type] ?? '#555';
                  const statusStyle = DECISION_STATUS_COLOR[entry.status] ?? { bg: '#555', color: '#F0F0F5' };

                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                      <td style={{ padding: '6px 10px', color: '#888', fontFamily: 'monospace' }}>
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#F0F0F5' }}>
                        {emoji} {agentObj?.name ?? entry.agent_name}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <Badge label={entry.decision_type} bg={typeColor} color="#FFF" />
                      </td>
                      <td style={{ padding: '6px 10px', color: '#F0F0F5' }}>
                        {entry.subject_company ?? '—'}
                      </td>
                      <td style={{ padding: '6px 10px', color: entry.score !== null && entry.score >= 7 ? '#22C55E' : entry.score !== null && entry.score >= 4 ? '#EAB308' : '#888', fontWeight: 600 }}>
                        {entry.score !== null ? `${entry.score}/10` : '—'}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <Badge label={entry.status} bg={statusStyle.bg} color={statusStyle.color} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
