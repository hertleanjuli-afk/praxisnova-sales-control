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

interface LiveLogEntry {
  id: number;
  run_id: string;
  agent_name: string;
  action: string;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AgentRunStatus {
  running: boolean;
  started_at: string | null;
  finished_at: string | null;
  recent_logs: number;
}

interface Instruction {
  id: number;
  message: string;
  status: string;
  response: string | null;
  created_at: string;
}

/* ─── Constants ─── */

const AGENTS_CONFIG = [
  { id: 'prospect_researcher', name: 'Prospect Researcher', emoji: '🔍', schedule: '08:00 täglich', role: 'Leads qualifizieren & scoren' },
  { id: 'partner_researcher', name: 'Partner Researcher', emoji: '🤝', schedule: '08:00 täglich', role: 'Partner recherchieren & bewerten' },
  { id: 'operations_manager', name: 'Operations Manager', emoji: '📊', schedule: '08:00 täglich', role: 'Morgen-Briefing & KPI-Tracking' },
  { id: 'outreach_strategist', name: 'Outreach Strategist', emoji: '✉️', schedule: '12:00 täglich', role: 'Personalisierte Lead-E-Mails' },
  { id: 'inbound_response_agent', name: 'Inbound Response', emoji: '⚡', schedule: 'Webhook (sofort)', role: 'Reagiert auf neue Leads' },
  { id: 'market_intelligence', name: 'Market Intelligence', emoji: '🌍', schedule: 'Sonntag 08:00', role: 'Wöchentliche Branchenanalyse' },
];

const AGENT_EMOJI: Record<string, string> = {
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

const AGENT_NAME: Record<string, string> = {
  prospect_researcher: 'Prospect Researcher',
  partner_researcher: 'Partner Researcher',
  operations_manager: 'Operations Manager',
  sales_supervisor: 'Sales Supervisor',
  partner_supervisor: 'Partner Supervisor',
  outreach_strategist: 'Outreach Strategist',
  partner_outreach_strategist: 'Partner Outreach',
  inbound_response_agent: 'Inbound Response',
  market_intelligence: 'Market Intelligence',
};

const ACTION_STYLE: Record<string, { color: string; icon: string }> = {
  started:          { color: '#3B82F6', icon: '▶' },
  completed:        { color: '#22C55E', icon: '✓' },
  finished:         { color: '#22C55E', icon: '✓' },
  research_lead:    { color: '#8B5CF6', icon: '🔍' },
  score_lead:       { color: '#8B5CF6', icon: '⭐' },
  qualify_lead:     { color: '#8B5CF6', icon: '📋' },
  send_email:       { color: '#E8472A', icon: '✉' },
  morning_briefing_sent: { color: '#22C55E', icon: '📧' },
  pipeline_health:  { color: '#EAB308', icon: '📊' },
  load_leads:       { color: '#555', icon: '📥' },
  load_partners:    { color: '#555', icon: '📥' },
  write_decision:   { color: '#3B82F6', icon: '📝' },
  partial:          { color: '#EAB308', icon: '⚠' },
  error:            { color: '#EF4444', icon: '✗' },
};

/* ─── Helpers ─── */

function ts(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function elapsed(start: string, end?: string | null): string {
  const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function Badge({ label, bg, color, size = 10 }: { label: string; bg: string; color: string; size?: number }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: size, fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

/* ─── Live Log Entry ─── */
function LogRow({ entry }: { entry: LiveLogEntry }) {
  const [open, setOpen] = useState(false);
  const style = ACTION_STYLE[entry.action] ?? ACTION_STYLE[entry.status] ?? { color: '#555', icon: '·' };
  const emoji = AGENT_EMOJI[entry.agent_name] ?? '🤖';
  const name = AGENT_NAME[entry.agent_name] ?? entry.agent_name;

  const hasDetails = entry.details && Object.keys(entry.details).length > 0;

  // Build a human-readable summary from details
  let summary = '';
  if (entry.details) {
    const d = entry.details;
    if (d.company) summary = String(d.company);
    else if (d.total_leads) summary = `${d.total_leads} Leads geladen`;
    else if (d.processed) summary = `${d.processed} verarbeitet`;
    else if (d.score !== undefined) summary = `Score: ${d.score}/10`;
    else if (d.stage) summary = String(d.stage);
    else if (d.email) summary = String(d.email);
  }

  return (
    <div
      onClick={() => hasDetails && setOpen(!open)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '7px 0',
        borderBottom: '1px solid #111',
        cursor: hasDetails ? 'pointer' : 'default',
      }}
    >
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0, paddingTop: 2 }}>
        <span style={{ fontSize: 12, color: style.color, lineHeight: 1 }}>{style.icon}</span>
        <div style={{ width: 1, flex: 1, background: '#1E1E1E', marginTop: 4 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', flexShrink: 0 }}>{ts(entry.created_at)}</span>
          <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{emoji} {name}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: style.color }}>{entry.action.replace(/_/g, ' ')}</span>
          {summary && <span style={{ fontSize: 12, color: '#F0F0F5' }}>— {summary}</span>}
          {entry.status === 'error' && <Badge label="FEHLER" bg="#EF4444" color="#FFF" />}
          {entry.status === 'partial' && <Badge label="PARTIAL" bg="#EAB308" color="#000" />}
        </div>
        {open && entry.details && (
          <pre style={{
            marginTop: 6,
            padding: '8px 10px',
            background: '#111',
            borderRadius: 6,
            fontSize: 11,
            color: '#888',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

/* ─── Agent Status Card ─── */
function AgentStatusCard({ agent, runStatus, onClick, selected }: {
  agent: typeof AGENTS_CONFIG[0];
  runStatus?: AgentRunStatus;
  onClick: () => void;
  selected: boolean;
}) {
  const isRunning = runStatus?.running ?? false;
  const hasRun = !!(runStatus?.started_at);

  return (
    <div
      onClick={onClick}
      style={{
        background: '#111',
        border: selected ? '1.5px solid #E8472A' : isRunning ? '1.5px solid #3B82F6' : '1px solid #1E1E1E',
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        marginBottom: 8,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F0F0F5' }}>
          {agent.emoji} {agent.name}
        </span>
        {isRunning ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700 }}>LÄUFT</span>
          </span>
        ) : hasRun ? (
          <Badge label="Bereit" bg="#1E1E1E" color="#888" />
        ) : (
          <Badge label="Nie gelaufen" bg="#EAB308" color="#000" />
        )}
      </div>
      <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>{agent.role}</p>
      {isRunning && runStatus?.started_at && (
        <p style={{ fontSize: 10, color: '#3B82F6', margin: '4px 0 0' }}>
          ⏱ Läuft seit {elapsed(runStatus.started_at)}
        </p>
      )}
      {!isRunning && runStatus?.finished_at && (
        <p style={{ fontSize: 10, color: '#555', margin: '4px 0 0' }}>
          ✓ Fertig um {ts(runStatus.finished_at)}
          {runStatus.started_at && ` (${elapsed(runStatus.started_at, runStatus.finished_at)})`}
        </p>
      )}
    </div>
  );
}

/* ─── Thinking Trail Entry ─── */
function TrailEntry({ decision }: { decision: AgentDecision }) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = decision.score !== null
    ? (decision.score >= 7 ? '#22C55E' : decision.score >= 4 ? '#EAB308' : '#EF4444')
    : '#888';

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{ts(decision.created_at)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', background: '#1A1A1A', padding: '1px 7px', borderRadius: 4 }}>
            {decision.decision_type.replace(/_/g, ' ')}
          </span>
        </div>
        {decision.score !== null && (
          <span style={{ fontSize: 15, fontWeight: 800, color: scoreColor }}>{decision.score}/10</span>
        )}
      </div>
      {(decision.subject_company || decision.subject_email) && (
        <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', margin: '0 0 4px' }}>
          {decision.subject_company ?? decision.subject_email}
        </p>
      )}
      {decision.reasoning && (
        <p
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 12, color: '#888', margin: 0, cursor: 'pointer', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: 'vertical' as const, overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          {decision.reasoning}
        </p>
      )}
      {decision.reasoning && !expanded && (
        <span style={{ fontSize: 10, color: '#444', cursor: 'pointer' }} onClick={() => setExpanded(true)}>
          mehr anzeigen ▾
        </span>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

type Tab = 'live' | 'trail' | 'chat';

export default function AgentDashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [liveLogs, setLiveLogs] = useState<LiveLogEntry[]>([]);
  const [agentRunStatus, setAgentRunStatus] = useState<Record<string, AgentRunStatus>>({});
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('live');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const prevLogCount = useRef(0);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
        if (!selectedAgent && data.agents?.length > 0) setSelectedAgent(data.agents[0].id);
      }
    } catch { /* silent */ }
  }, [selectedAgent]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/live-log?hours=24&limit=200');
      if (res.ok) {
        const data = await res.json();
        const logs: LiveLogEntry[] = data.logs ?? [];
        setLiveLogs(logs);
        setAgentRunStatus(data.agentStatus ?? {});
        setLastUpdate(new Date());
        // Auto-scroll live feed if new entries arrived
        if (logs.length > prevLogCount.current && liveRef.current) {
          liveRef.current.scrollTop = 0;
        }
        prevLogCount.current = logs.length;
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const fetchInstructions = useCallback(async () => {
    try {
      const res = await fetch('/api/manager-instructions');
      if (res.ok) {
        const data = await res.json();
        setInstructions(data.instructions ?? []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchLive();
    fetchInstructions();
    // Live feed: 5s refresh
    const liveTimer = setInterval(fetchLive, 5000);
    // Agents: 30s refresh
    const agentTimer = setInterval(() => { fetchAgents(); fetchInstructions(); }, 30000);
    return () => { clearInterval(liveTimer); clearInterval(agentTimer); };
  }, [fetchAgents, fetchLive, fetchInstructions]);

  const sendInstruction = async () => {
    if (!msgText.trim()) return;
    const prefix = selectedAgent ? `${selectedAgent}: ` : '';
    const fullMessage = prefix + msgText.trim();
    const optimistic: Instruction = { id: Date.now(), message: fullMessage, status: 'unread', response: null, created_at: new Date().toISOString() };
    setInstructions(prev => [optimistic, ...prev]);
    setMsgText('');
    setSending(true);
    try {
      await fetch('/api/manager-instructions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: fullMessage }) });
      await fetchInstructions();
    } catch { /* keep optimistic */ }
    setSending(false);
  };

  const anyRunning = Object.values(agentRunStatus).some(s => s.running);
  const selectedAgentObj = agents.find(a => a.id === selectedAgent) ?? null;
  const trail = selectedAgentObj?.thinking_trail ?? [];

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 700,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#E8472A' : '#111',
    color: active ? '#FFF' : '#555',
    transition: 'background 0.15s',
  });

  if (loading) {
    return <div style={{ padding: 32 }}><p style={{ color: '#555', fontSize: 14 }}>Laden...</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: '80vh' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
            Agent Dashboard
          </h1>
          <p style={{ fontSize: 12, color: '#444', margin: '4px 0 0' }}>
            {anyRunning
              ? <span style={{ color: '#3B82F6' }}>● Agent läuft gerade…</span>
              : <span>Alle Agenten bereit</span>}
            {lastUpdate && <span style={{ marginLeft: 12, color: '#333' }}>Aktualisiert {ts(lastUpdate.toISOString())}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={TAB_STYLE(tab === 'live')} onClick={() => setTab('live')}>
            {anyRunning ? '🔴 ' : ''}Live Feed
          </button>
          <button style={TAB_STYLE(tab === 'trail')} onClick={() => setTab('trail')}>
            🧠 Thinking Trail
          </button>
          <button style={TAB_STYLE(tab === 'chat')} onClick={() => setTab('chat')}>
            💬 Anweisungen
          </button>
        </div>
      </div>

      {/* ─── Main Layout ─── */}
      <div style={{ display: 'flex', gap: 16 }}>

        {/* ── Agent List (left) ── */}
        <div style={{ width: 240, minWidth: 240, flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
            Agenten
          </p>
          {AGENTS_CONFIG.map(agent => (
            <AgentStatusCard
              key={agent.id}
              agent={agent}
              runStatus={agentRunStatus[agent.id]}
              onClick={() => setSelectedAgent(agent.id)}
              selected={selectedAgent === agent.id}
            />
          ))}
        </div>

        {/* ── Main Panel (right) ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── LIVE FEED TAB ── */}
          {tab === 'live' && (
            <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20, height: '70vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
                    📡 Live Feed
                  </h2>
                  <p style={{ fontSize: 11, color: '#444', margin: '3px 0 0' }}>
                    Echtzeit-Log aller Agenten · Aktualisiert alle 5s
                  </p>
                </div>
                <span style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>
                  {liveLogs.length} Einträge heute
                </span>
              </div>

              <div ref={liveRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                {liveLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ color: '#333', fontSize: 24, margin: '0 0 12px' }}>📭</p>
                    <p style={{ color: '#444', fontSize: 14, margin: '0 0 8px' }}>Noch keine Aktivität heute</p>
                    <p style={{ color: '#333', fontSize: 12 }}>
                      Sobald ein Agent läuft, erscheint hier jeder Schritt live —<br />
                      welcher Lead gerade recherchiert wird, welchen Score er bekommt,<br />
                      wann die Email verschickt wird, etc.
                    </p>
                  </div>
                ) : (
                  liveLogs.map(entry => <LogRow key={entry.id} entry={entry} />)
                )}
              </div>
            </div>
          )}

          {/* ── THINKING TRAIL TAB ── */}
          {tab === 'trail' && (
            <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20, height: '70vh', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F5', margin: '0 0 6px' }}>
                🧠 Thinking Trail
                {selectedAgentObj && <span style={{ fontWeight: 400, color: '#555', marginLeft: 8 }}>— {selectedAgentObj.emoji} {selectedAgentObj.name}</span>}
              </h2>
              <p style={{ fontSize: 11, color: '#444', margin: '0 0 16px' }}>
                Jede Entscheidung mit Score & Begründung · Klicke auf einen Agenten links
              </p>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {trail.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ color: '#444', fontSize: 14 }}>
                      {selectedAgentObj ? `${selectedAgentObj.name} hat noch keine Entscheidungen getroffen.` : 'Wähle einen Agenten aus der Liste.'}
                    </p>
                  </div>
                ) : (
                  trail.map(d => <TrailEntry key={d.id} decision={d} />)
                )}
              </div>
            </div>
          )}

          {/* ── CHAT / INSTRUCTIONS TAB ── */}
          {tab === 'chat' && (
            <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20, height: '70vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
                  💬 Anweisungen an Agenten
                </h2>
                <p style={{ fontSize: 11, color: '#444', margin: '3px 0 0' }}>
                  Der Agent liest diese beim nächsten Run · Wähle einen Agenten links für spezifische Anweisungen
                </p>
              </div>

              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder={selectedAgentObj ? `Anweisung an ${selectedAgentObj.emoji} ${selectedAgentObj.name}...` : 'Anweisung an alle Agenten...'}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInstruction(); } }}
                style={{
                  width: '100%', minHeight: 100, background: '#111', border: '1px solid #1E1E1E',
                  borderRadius: 8, color: '#F0F0F5', fontSize: 13, padding: 12, resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={sendInstruction}
                disabled={sending || !msgText.trim()}
                style={{
                  padding: '9px 0', background: sending || !msgText.trim() ? '#333' : '#E8472A',
                  color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700,
                  cursor: sending || !msgText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Wird gesendet…' : '→ Senden'}
              </button>

              {/* History */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>
                  Gesendete Anweisungen
                </p>
                {instructions.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#444' }}>Noch keine Anweisungen gesendet.</p>
                ) : (
                  instructions.map(instr => (
                    <div key={instr.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>{ts(instr.created_at)}</span>
                        <Badge
                          label={instr.status === 'actioned' ? '✓ Bearbeitet' : 'Ungelesen'}
                          bg={instr.status === 'actioned' ? '#22C55E' : '#1E1E1E'}
                          color={instr.status === 'actioned' ? '#000' : '#555'}
                        />
                      </div>
                      <p style={{ fontSize: 13, color: '#F0F0F5', margin: 0 }}>{instr.message}</p>
                      {instr.response && (
                        <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0', borderTop: '1px solid #1E1E1E', paddingTop: 8 }}>
                          Agent: {instr.response}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
