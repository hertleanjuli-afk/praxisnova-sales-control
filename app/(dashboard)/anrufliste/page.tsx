'use client';

import { useState, useEffect, useCallback } from 'react';

interface CallEntry {
  id: number;
  lead_id: number;
  queue_date: string;
  rank: number;
  priority_score: number;
  reason_to_call: string | null;
  talking_points: string | null;
  conversation_guide: string | null;
  best_time_to_call: string | null;
  follow_up_action: string | null;
  status: string;
  called_at: string | null;
  call_result: string | null;
  call_notes: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  industry: string | null;
  lead_score: number | null;
  agent_score: number | null;
  sequence_step: number | null;
  sequence_type: string | null;
  sequence_status: string | null;
  pipeline_stage: string | null;
  signal_email_reply: boolean | null;
  signal_linkedin_interest: boolean | null;
  linkedin_url: string | null;
  pipeline_notes: string | null;
}

interface Stats {
  total: number;
  ready: number;
  called: number;
  reached: number;
  not_reached: number;
  voicemail: number;
  booked: number;
}

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  ready: { label: 'Bereit', color: '#22C55E', bg: '#22C55E20' },
  called: { label: 'Angerufen', color: '#3B82F6', bg: '#3B82F620' },
  skipped: { label: 'Uebersprungen', color: '#888', bg: '#88888820' },
};

const RESULT_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  reached: { label: 'Erreicht', color: '#22C55E', bg: '#22C55E20' },
  not_reached: { label: 'Nicht erreicht', color: '#F59E0B', bg: '#F59E0B20' },
  voicemail: { label: 'Mailbox', color: '#8B5CF6', bg: '#8B5CF620' },
  appointment: { label: 'Termin!', color: '#E8472A', bg: '#E8472A30' },
  wrong_number: { label: 'Falsche Nr.', color: '#EF4444', bg: '#EF444420' },
};

const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A',
  handwerk: '#3B82F6',
  bauunternehmen: '#22C55E',
  inbound: '#EAB308',
  allgemein: '#8B5CF6',
};

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function AnruflistePage() {
  const [entries, setEntries] = useState<CallEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, ready: 0, called: 0, reached: 0, not_reached: 0, voicemail: 0, booked: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEntry, setSelectedEntry] = useState<CallEntry | null>(null);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callResult, setCallResult] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/anrufliste?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setStats(data.stats || { total: 0, ready: 0, called: 0, reached: 0, not_reached: 0, voicemail: 0, booked: 0 });
      }
    } catch (e) {
      console.error('Fehler beim Laden:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCallResult = async () => {
    if (!selectedEntry || !callResult) return;
    try {
      const res = await fetch(`/api/anrufliste/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'called',
          call_result: callResult,
          call_notes: callNotes,
        }),
      });
      if (res.ok) {
        setShowCallDialog(false);
        setCallResult('');
        setCallNotes('');
        setSelectedEntry(null);
        fetchData();
      }
    } catch (e) {
      console.error('Fehler:', e);
    }
  };

  const handleSkip = async (entry: CallEntry) => {
    try {
      const res = await fetch(`/api/anrufliste/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error('Fehler:', e);
    }
  };

  const readyEntries = entries.filter(e => e.status === 'ready');
  const doneEntries = entries.filter(e => e.status !== 'ready');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header mit Datumswahl */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#F0F0F5' }}>
            Anrufliste
          </h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            Cold Calling - Leads ab Email 3 oder Hot Leads mit Telefonnummer
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ background: '#1A1A1A', border: '1px solid #333', color: '#F0F0F5', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}
        />
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Gesamt', value: stats.total, color: '#F0F0F5' },
          { label: 'Offen', value: stats.ready, color: '#22C55E' },
          { label: 'Angerufen', value: stats.called, color: '#3B82F6' },
          { label: 'Erreicht', value: stats.reached, color: '#22C55E' },
          { label: 'Termine', value: stats.booked, color: '#E8472A' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Laden...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#111', borderRadius: 12, border: '1px solid #1E1E1E' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📞</div>
          <p style={{ fontSize: 16, color: '#888', margin: 0 }}>Keine Anrufe fuer {formatDate(selectedDate)}</p>
          <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>Der Call-List Agent generiert die Liste taeglich um 09:00 Uhr.</p>
        </div>
      ) : (
        <>
          {/* Offene Anrufe */}
          {readyEntries.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#22C55E', marginBottom: 12 }}>
                Noch anrufen ({readyEntries.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {readyEntries.map(entry => (
                  <CallCard
                    key={entry.id}
                    entry={entry}
                    onCall={() => { setSelectedEntry(entry); setShowCallDialog(true); }}
                    onSkip={() => handleSkip(entry)}
                    onSelect={() => setSelectedEntry(entry)}
                    isSelected={selectedEntry?.id === entry.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Erledigte Anrufe */}
          {doneEntries.length > 0 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#888', marginBottom: 12 }}>
                Erledigt ({doneEntries.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {doneEntries.map(entry => (
                  <CallCard
                    key={entry.id}
                    entry={entry}
                    onCall={() => {}}
                    onSkip={() => {}}
                    onSelect={() => setSelectedEntry(entry)}
                    isSelected={selectedEntry?.id === entry.id}
                    done
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      {selectedEntry && !showCallDialog && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
          background: '#111', borderLeft: '1px solid #1E1E1E', padding: 24,
          overflowY: 'auto', zIndex: 50, boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              {selectedEntry.first_name} {selectedEntry.last_name}
            </h3>
            <button onClick={() => setSelectedEntry(null)}
              style={{ background: '#1A1A1A', border: '1px solid #333', color: '#888', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              X
            </button>
          </div>

          {/* Kontakt-Details */}
          <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <DetailRow label="Firma" value={selectedEntry.company} />
            <DetailRow label="Position" value={selectedEntry.title} />
            <DetailRow label="Telefon" value={selectedEntry.phone} isPhone />
            <DetailRow label="Email" value={selectedEntry.email} />
            <DetailRow label="Branche" value={selectedEntry.industry} color={SECTOR_COLORS[selectedEntry.industry || ''] || '#888'} />
            {selectedEntry.linkedin_url && (
              <DetailRow label="LinkedIn" value="Profil" isLink={selectedEntry.linkedin_url} />
            )}
          </div>

          {/* Scoring */}
          <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <DetailRow label="Lead Score" value={`${selectedEntry.lead_score || 0}/10`} />
            <DetailRow label="Agent Score" value={`${selectedEntry.agent_score || 0}/10`} />
            <DetailRow label="Email Step" value={`Step ${selectedEntry.sequence_step || 0}/6`} />
            <DetailRow label="Sequenz" value={selectedEntry.sequence_type} color={SECTOR_COLORS[selectedEntry.sequence_type || ''] || '#888'} />
            <DetailRow label="Pipeline" value={selectedEntry.pipeline_stage} />
            <DetailRow label="Prioritaet" value={`${selectedEntry.priority_score}`} color="#E8472A" />
          </div>

          {/* Warum anrufen */}
          {selectedEntry.reason_to_call && (
            <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#E8472A', marginBottom: 8, marginTop: 0 }}>Warum anrufen</h4>
              <p style={{ fontSize: 13, color: '#CCC', margin: 0, lineHeight: 1.6 }}>{selectedEntry.reason_to_call}</p>
            </div>
          )}

          {/* Talking Points */}
          {selectedEntry.talking_points && (
            <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', marginBottom: 8, marginTop: 0 }}>Talking Points</h4>
              <p style={{ fontSize: 13, color: '#CCC', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedEntry.talking_points}</p>
            </div>
          )}

          {/* Gespraechsleitfaden */}
          {selectedEntry.conversation_guide && (
            <div style={{ background: '#1A0A0A', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #E8472A30' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#E8472A', marginBottom: 8, marginTop: 0 }}>Gespraechsleitfaden</h4>
              <p style={{ fontSize: 13, color: '#CCC', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selectedEntry.conversation_guide}</p>
            </div>
          )}

          {/* Pipeline Notes */}
          {selectedEntry.pipeline_notes && (
            <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 8, marginTop: 0 }}>Notizen</h4>
              <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedEntry.pipeline_notes}</p>
            </div>
          )}

          {/* Beste Anrufzeit */}
          {selectedEntry.best_time_to_call && (
            <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <DetailRow label="Beste Zeit" value={selectedEntry.best_time_to_call} color="#F59E0B" />
            </div>
          )}

          {/* Anrufen Button */}
          {selectedEntry.status === 'ready' && (
            <button
              onClick={() => setShowCallDialog(true)}
              style={{
                width: '100%', padding: '14px 0', background: '#22C55E', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Jetzt anrufen
            </button>
          )}
        </div>
      )}

      {/* Call Result Dialog */}
      {showCallDialog && selectedEntry && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ background: '#111', borderRadius: 16, padding: 28, width: 440, border: '1px solid #1E1E1E' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px 0' }}>
              Anruf: {selectedEntry.first_name} {selectedEntry.last_name}
            </h3>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px 0' }}>
              {selectedEntry.company} - {selectedEntry.phone}
            </p>

            <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', marginBottom: 10 }}>Ergebnis:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
              {Object.entries(RESULT_COLORS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCallResult(key)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, border: '2px solid',
                    borderColor: callResult === key ? cfg.color : '#333',
                    background: callResult === key ? cfg.bg : '#1A1A1A',
                    color: callResult === key ? cfg.color : '#888',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', marginBottom: 8 }}>Notizen:</p>
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="Was wurde besprochen? Naechste Schritte?"
              rows={3}
              style={{
                width: '100%', background: '#0A0A0A', border: '1px solid #333', color: '#F0F0F5',
                padding: 12, borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setShowCallDialog(false); setCallResult(''); setCallNotes(''); }}
                style={{ flex: 1, padding: '12px 0', background: '#1A1A1A', color: '#888', border: '1px solid #333', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCallResult}
                disabled={!callResult}
                style={{
                  flex: 1, padding: '12px 0', background: callResult ? '#22C55E' : '#333',
                  color: callResult ? 'white' : '#666', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 700, cursor: callResult ? 'pointer' : 'default',
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Call Card Component ──────────────────────────────────────────────────

function CallCard({ entry, onCall, onSkip, onSelect, isSelected, done }: {
  entry: CallEntry;
  onCall: () => void;
  onSkip: () => void;
  onSelect: () => void;
  isSelected: boolean;
  done?: boolean;
}) {
  const statusCfg = STATUS_COLORS[entry.status] || STATUS_COLORS.ready;
  const resultCfg = entry.call_result ? RESULT_COLORS[entry.call_result] : null;
  const sectorColor = SECTOR_COLORS[entry.industry || ''] || '#888';

  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? '#1A1A1A' : '#111',
        border: `1px solid ${isSelected ? '#E8472A40' : '#1E1E1E'}`,
        borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
        opacity: done ? 0.6 : 1,
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'background 0.15s',
      }}
    >
      {/* Rang */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#1A1A1A' : '#E8472A20', color: done ? '#555' : '#E8472A',
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>
        {entry.rank}
      </div>

      {/* Lead Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F5' }}>
            {entry.first_name} {entry.last_name}
          </span>
          <span style={{ fontSize: 11, color: sectorColor, background: `${sectorColor}15`, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            {entry.industry || 'Allgemein'}
          </span>
          {(entry.agent_score || 0) >= 9 && (
            <span style={{ fontSize: 10, color: '#E8472A', background: '#E8472A20', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
              HOT
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#888' }}>
          <span>{entry.company}</span>
          <span>Step {entry.sequence_step || 0}/6</span>
          <span>Score {entry.agent_score || entry.lead_score || 0}/10</span>
          {entry.best_time_to_call && <span style={{ color: '#F59E0B' }}>{entry.best_time_to_call}</span>}
        </div>
      </div>

      {/* Telefon */}
      <a
        href={`tel:${entry.phone}`}
        onClick={(e) => e.stopPropagation()}
        style={{ fontSize: 13, color: '#22C55E', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        {entry.phone}
      </a>

      {/* Status / Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {done && resultCfg ? (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            color: resultCfg.color, background: resultCfg.bg,
          }}>
            {resultCfg.label}
          </span>
        ) : !done ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onCall(); }}
              style={{
                padding: '6px 14px', background: '#22C55E', color: 'white', border: 'none',
                borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Anrufen
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
              style={{
                padding: '6px 10px', background: '#1A1A1A', color: '#888', border: '1px solid #333',
                borderRadius: 6, fontSize: 12, cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            color: statusCfg.color, background: statusCfg.bg,
          }}>
            {statusCfg.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Detail Row Component ─────────────────────────────────────────────────

function DetailRow({ label, value, color, isPhone, isLink }: {
  label: string;
  value: string | number | null | undefined;
  color?: string;
  isPhone?: boolean;
  isLink?: string;
}) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1E1E1E' }}>
      <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
      {isPhone ? (
        <a href={`tel:${value}`} style={{ fontSize: 13, color: '#22C55E', textDecoration: 'none', fontWeight: 600 }}>{value}</a>
      ) : isLink ? (
        <a href={isLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#3B82F6', textDecoration: 'none' }}>{value}</a>
      ) : (
        <span style={{ fontSize: 13, color: color || '#F0F0F5', fontWeight: 500 }}>{String(value)}</span>
      )}
    </div>
  );
}
