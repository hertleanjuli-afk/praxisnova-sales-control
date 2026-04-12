'use client';

import React, { useState, useEffect, useCallback } from 'react';
import NextLink from 'next/link';
import { ChevronRight, Link as LinkIcon, Phone, Mail, AlertCircle, CheckCircle, MessageSquare, Clock, AlertTriangle } from 'lucide-react';

interface LinkedInEntry {
  id: number;
  lead_id: number;
  connection_status: 'none' | 'pending_request' | 'request_sent' | 'connected' | 'rejected' | 'no_linkedin' | 'ignored';
  request_due_date: string | null;
  request_sent_at: string | null;
  connected_at: string | null;
  message_sent: boolean;
  message_sent_at: string | null;
  message_content: string | null;
  reply_received: boolean;
  reply_received_at: string | null;
  reply_content: string | null;
  linkedin_url: string | null;
  notes: string | null;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  agent_score: number;
  lead_category: string | null;
  pipeline_stage: string;
  outreach_step: string;
  industry: string | null;
  action_required?: 'anfrage_senden' | 'timeout_keine_akzeptierung' | 'nachricht_senden' | 'timeout_keine_antwort' | 'keine_aktion';
}

const industryColors: Record<string, { bg: string; text: string }> = {
  immobilien: { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  bau: { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  bauunternehmen: { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  handwerk: { bg: 'bg-green-500/20', text: 'text-green-300' },
  makler: { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
};
const getIndustryStyle = (ind: string | null) => {
  if (!ind) return null;
  const key = ind.toLowerCase();
  for (const [k, v] of Object.entries(industryColors)) {
    if (key.includes(k)) return { ...v, label: ind };
  }
  return { bg: 'bg-gray-700/30', text: 'text-gray-500', label: ind };
};

interface Stats {
  pending: number;
  request_sent: number;
  connected_no_msg: number;
  message_sent: number;
  replied: number;
  no_linkedin: number;
  ignored: number;
  total: number;
}

type FilterTab = 'actions_due' | 'all' | 'request_sent' | 'connected' | 'replied';

export default function LinkedInTrackingPage() {
  const [items, setItems] = useState<LinkedInEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    request_sent: 0,
    connected_no_msg: 0,
    message_sent: 0,
    replied: 0,
    no_linkedin: 0,
    ignored: 0,
    total: 0,
  });
  const [selectedItem, setSelectedItem] = useState<LinkedInEntry | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    none: { bg: 'bg-gray-700/30', text: 'text-gray-400', label: 'Kein Tracking' },
    pending_request: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Anfrage fällig' },
    request_sent: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Angefragt' },
    connected: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Verbunden' },
    replied: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Geantwortet' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Abgelehnt' },
    no_linkedin: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Kein LinkedIn' },
    ignored: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Ignoriert' },
  };
  const getStatusStyle = (status: string | null) =>
    statusColors[status || 'none'] || statusColors.none;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeFilter === 'actions_due') {
        params.set('actions_due', 'true');
      } else if (activeFilter === 'request_sent') {
        params.set('status', 'request_sent');
      } else if (activeFilter === 'connected') {
        params.set('status', 'connected');
      } else if (activeFilter === 'replied') {
        params.set('status', 'replied');
      }
      if (industryFilter) params.set('industry', industryFilter);

      const url = `/api/linkedin-tracking${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch LinkedIn entries');
      const data = await response.json();
      setItems(data.items || []);
      setStats(data.stats || {});
      setSelectedItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, industryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateStatus = useCallback(
    async (action: string, extra?: { message_content?: string; reply_content?: string }) => {
      if (!selectedItem) return;
      setUpdating(true);
      try {
        const response = await fetch('/api/linkedin-tracking', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: selectedItem.lead_id,
            action,
            ...extra,
          }),
        });
        if (!response.ok) throw new Error('Failed to update status');
        await fetchItems();
        const freshItem = items.find((i) => i.lead_id === selectedItem.lead_id);
        if (freshItem) setSelectedItem(freshItem);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setUpdating(false);
      }
    },
    [selectedItem, fetchItems, items]
  );

  const saveNotes = useCallback(async () => {
    if (!selectedItem) return;
    setUpdating(true);
    try {
      const response = await fetch('/api/linkedin-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedItem.lead_id,
          action: 'save_notes',
          notes: notesText,
        }),
      });
      if (!response.ok) throw new Error('Failed to save notes');
      await fetchItems();
      const freshItem = items.find((i) => i.lead_id === selectedItem.lead_id);
      if (freshItem) setSelectedItem(freshItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdating(false);
    }
  }, [selectedItem, fetchItems, items, notesText]);

  const handleSelectItem = (item: LinkedInEntry) => {
    setSelectedItem(item);
    setMessageText('');
    setReplyText('');
    setNotesText(item.notes || '');
  };

  const getActionBadge = (item: LinkedInEntry) => {
    if (!item.action_required || item.action_required === 'keine_aktion') return null;
    const isTimeout = item.action_required.includes('timeout');
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          isTimeout ? 'bg-red-500/30 text-red-300' : 'bg-orange-500/30 text-orange-300 animate-pulse'
        }`}
      >
        {isTimeout ? <AlertTriangle size={12} /> : <Clock size={12} />}
        {item.action_required === 'anfrage_senden' && 'Anfrage senden!'}
        {item.action_required === 'nachricht_senden' && 'Nachricht senden!'}
        {item.action_required === 'timeout_keine_akzeptierung' && 'Timeout'}
        {item.action_required === 'timeout_keine_antwort' && 'Timeout'}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' });
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111' }}>
      {/* Header */}
      <div className="border-b px-6 py-6" style={{ borderColor: '#1E1E1E' }}>
        <h1 className="text-3xl font-bold text-white mb-1">LinkedIn Tracking</h1>
        <p className="text-gray-400">Verbindungen und Nachrichten manuell tracken</p>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <StatCard label="Anfrage Fallig" value={stats.pending} />
          <StatCard label="Angefragt" value={stats.request_sent} />
          <StatCard label="Verbunden" value={stats.connected_no_msg} />
          <StatCard label="Nachricht" value={stats.message_sent} />
          <StatCard label="Geantwortet" value={stats.replied} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - List */}
        <div className="w-full md:w-96 flex flex-col border-r" style={{ borderColor: '#1E1E1E', backgroundColor: '#111' }}>
          {/* Filter Tabs */}
          <div className="flex border-b overflow-x-auto" style={{ borderColor: '#1E1E1E' }}>
            <FilterTab
              label="Aktionen Fallig"
              value="actions_due"
              active={activeFilter === 'actions_due'}
              onClick={() => setActiveFilter('actions_due')}
            />
            <FilterTab label="Alle" value="all" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
            <FilterTab
              label="Anfragen"
              value="request_sent"
              active={activeFilter === 'request_sent'}
              onClick={() => setActiveFilter('request_sent')}
            />
            <FilterTab
              label="Verbunden"
              value="connected"
              active={activeFilter === 'connected'}
              onClick={() => setActiveFilter('connected')}
            />
            <FilterTab
              label="Geantwortet"
              value="replied"
              active={activeFilter === 'replied'}
              onClick={() => setActiveFilter('replied')}
            />
          </div>

          {/* Industry Filter */}
          <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
            {['', 'immobilien', 'bau', 'handwerk', 'makler'].map((ind) => (
              <button
                key={ind}
                onClick={() => setIndustryFilter(ind)}
                className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                  industryFilter === ind
                    ? 'bg-orange-500/30 text-orange-300'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {ind === '' ? 'Alle Branchen' : ind.charAt(0).toUpperCase() + ind.slice(1)}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-gray-400">Wird geladen...</div>
            ) : error ? (
              <div className="p-4 text-red-400 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : items.length === 0 ? (
              <div className="p-4 text-gray-400">Keine Einträge gefunden</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    selectedItem?.id === item.id ? 'bg-orange-500/10' : 'hover:bg-white/5'
                  }`}
                  style={{
                    borderColor: selectedItem?.id === item.id ? '#E8472A' : '#1E1E1E',
                    backgroundColor: selectedItem?.id === item.id ? 'rgba(232, 71, 42, 0.1)' : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        <NextLink
                          href={`/lead/${item.lead_id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-white hover:text-orange-500 transition-colors"
                          style={{ textDecoration: 'none' }}
                        >
                          {item.first_name} {item.last_name}
                        </NextLink>
                      </h3>
                      <p className="text-sm text-gray-400 truncate">{item.title}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${getStatusStyle(item.connection_status).bg} ${getStatusStyle(item.connection_status).text}`}>
                      {getStatusStyle(item.connection_status).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs text-gray-500 truncate">{item.company}</p>
                    {(() => {
                      const indStyle = getIndustryStyle(item.industry);
                      return indStyle ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${indStyle.bg} ${indStyle.text}`}>
                          {indStyle.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.linkedin_url && (
                        <a
                          href={item.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded hover:bg-blue-500/30"
                        >
                          <LinkIcon size={10} /> LinkedIn
                        </a>
                      )}
                      <span className="inline-block px-2 py-0.5 bg-gray-700/50 text-gray-300 text-xs rounded">
                        {item.agent_score}pts
                      </span>
                    </div>
                    {getActionBadge(item)}
                  </div>
                  {(item.request_due_date || item.request_sent_at) && (
                    <p className="text-xs text-gray-500 mt-2">
                      {item.request_due_date && 'Fallig: ' + formatDate(item.request_due_date)}
                      {item.request_sent_at && 'Gesendet: ' + formatDate(item.request_sent_at)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="hidden md:flex md:w-96 flex-col overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
          {selectedItem ? (
            <>
              {/* Contact Header */}
              <div className="border-b p-6" style={{ borderColor: '#1E1E1E' }}>
                <h2 className="text-xl font-bold text-white mb-1">
                  {selectedItem.first_name} {selectedItem.last_name}
                </h2>
                <p className="text-sm text-gray-400">{selectedItem.title}</p>
                <p className="text-sm text-gray-500 mb-4">{selectedItem.company}</p>

                <div className="space-y-2 mb-4">
                  {selectedItem.linkedin_url && (
                    <a
                      href={selectedItem.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      <LinkIcon size={16} />
                      LinkedIn Profil
                    </a>
                  )}
                  {selectedItem.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone size={16} />
                      {selectedItem.phone}
                    </div>
                  )}
                  {selectedItem.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Mail size={16} />
                      {selectedItem.email}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="px-3 py-2 rounded" style={{ backgroundColor: '#111' }}>
                    <p className="text-xs text-gray-500 mb-1">Pipeline</p>
                    <p className="text-sm font-medium text-white">{selectedItem.pipeline_stage}</p>
                  </div>
                  <div className="px-3 py-2 rounded" style={{ backgroundColor: '#111' }}>
                    <p className="text-xs text-gray-500 mb-1">Score</p>
                    <p className="text-sm font-medium text-white">{selectedItem.agent_score}</p>
                  </div>
                </div>
              </div>

              {/* Step Flow */}
              <div className="border-b p-6" style={{ borderColor: '#1E1E1E' }}>
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                  <StepIndicator label="Email" completed={true} current={false} />
                  <ChevronRight size={14} className="text-gray-600" />
                  <StepIndicator
                    label="Anfrage"
                    completed={['request_sent', 'connected', 'replied'].includes(selectedItem.connection_status)}
                    current={selectedItem.connection_status === 'pending_request' || selectedItem.connection_status === 'none'}
                  />
                  <ChevronRight size={14} className="text-gray-600" />
                  <StepIndicator
                    label="Verbunden"
                    completed={['connected', 'replied'].includes(selectedItem.connection_status)}
                    current={selectedItem.connection_status === 'request_sent'}
                  />
                  <ChevronRight size={14} className="text-gray-600" />
                  <StepIndicator
                    label="Nachricht"
                    completed={selectedItem.message_sent || selectedItem.reply_received}
                    current={selectedItem.connection_status === 'connected' && !selectedItem.message_sent}
                  />
                  <ChevronRight size={14} className="text-gray-600" />
                  <StepIndicator label="Antwort" completed={selectedItem.reply_received} current={false} />
                </div>
              </div>

              {/* Status Update Section */}
              <div className="border-b p-6 space-y-4" style={{ borderColor: '#1E1E1E' }}>
                <h3 className="font-semibold text-white">Status aktualisieren</h3>

                {/* Pending Request or None */}
                {(selectedItem.connection_status === 'pending_request' || selectedItem.connection_status === 'none') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus('request_sent')}
                      disabled={updating}
                      className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      Anfrage gesendet
                    </button>
                    <button
                      onClick={() => updateStatus('no_linkedin')}
                      disabled={updating}
                      className="flex-1 px-3 py-2 bg-gray-500/20 text-gray-400 rounded text-sm font-medium hover:bg-gray-500/30 disabled:opacity-50"
                    >
                      Kein LinkedIn
                    </button>
                  </div>
                )}

                {/* Request Sent */}
                {selectedItem.connection_status === 'request_sent' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus('connected')}
                      disabled={updating}
                      className="flex-1 px-3 py-2 bg-green-500/20 text-green-300 rounded text-sm font-medium hover:bg-green-500/30 disabled:opacity-50"
                    >
                      Verbunden
                    </button>
                    <button
                      onClick={() => updateStatus('rejected')}
                      disabled={updating}
                      className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 rounded text-sm font-medium hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Abgelehnt
                    </button>
                    <button
                      onClick={() => updateStatus('ignored')}
                      disabled={updating}
                      className="flex-1 px-3 py-2 bg-gray-500/20 text-gray-400 rounded text-sm font-medium hover:bg-gray-500/30 disabled:opacity-50"
                    >
                      Ignoriert
                    </button>
                  </div>
                )}

                {/* Connected - No Message */}
                {selectedItem.connection_status === 'connected' && !selectedItem.message_sent && (
                  <div className="space-y-2">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Nachricht schreiben..."
                      className="w-full p-3 rounded bg-gray-900 border text-white text-sm resize-none"
                      style={{ borderColor: '#1E1E1E' }}
                      rows={3}
                    />
                    <button
                      onClick={() => updateStatus('message_sent', { message_content: messageText })}
                      disabled={updating || !messageText.trim()}
                      className="w-full px-3 py-2 bg-green-500/20 text-green-300 rounded text-sm font-medium hover:bg-green-500/30 disabled:opacity-50"
                    >
                      Nachricht gesendet
                    </button>
                  </div>
                )}

                {/* Message Sent - No Reply */}
                {selectedItem.connection_status === 'connected' && selectedItem.message_sent && !selectedItem.reply_received && (
                  <div className="space-y-3">
                    {selectedItem.message_content && (
                      <div className="p-3 rounded bg-gray-800/50 border" style={{ borderColor: '#1E1E1E' }}>
                        <p className="text-xs text-gray-500 mb-2">Ihre Nachricht:</p>
                        <p className="text-sm text-gray-300">{selectedItem.message_content}</p>
                      </div>
                    )}
                    <div className="flex gap-2 p-3 rounded bg-red-500/10 border border-red-500/20">
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">Stoppt automatisch die Email-Sequenz!</p>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Antwort schreiben..."
                      className="w-full p-3 rounded bg-gray-900 border text-white text-sm resize-none"
                      style={{ borderColor: '#1E1E1E' }}
                      rows={3}
                    />
                    <button
                      onClick={() => updateStatus('reply_received', { reply_content: replyText })}
                      disabled={updating || !replyText.trim()}
                      className="w-full px-3 py-2 bg-green-500/20 text-green-300 rounded text-sm font-medium hover:bg-green-500/30 disabled:opacity-50"
                    >
                      Antwort erhalten
                    </button>
                  </div>
                )}

                {/* Replied */}
                {selectedItem.reply_received && (
                  <div className="space-y-3">
                    {selectedItem.reply_content && (
                      <div className="p-3 rounded bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-green-400 mb-2">Antwort erhalten:</p>
                        <p className="text-sm text-green-300">{selectedItem.reply_content}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded bg-green-500/10 border border-green-500/20">
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                      <p className="text-xs text-green-300">Email-Sequenz gestoppt</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border-b p-6 space-y-3" style={{ borderColor: '#1E1E1E' }}>
                <h3 className="font-semibold text-white">Notizen</h3>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Notizen hier eingeben..."
                  className="w-full p-3 rounded bg-gray-900 border text-white text-sm resize-none"
                  style={{ borderColor: '#1E1E1E' }}
                  rows={3}
                />
                <button
                  onClick={saveNotes}
                  disabled={updating}
                  className="w-full px-3 py-2 bg-gray-700/50 text-gray-300 rounded text-sm font-medium hover:bg-gray-700/70 disabled:opacity-50"
                >
                  Notizen speichern
                </button>
              </div>

              {/* Message History */}
              {(selectedItem.message_sent || selectedItem.reply_received) && (
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  <h3 className="font-semibold text-white mb-3">Nachrichten-Verlauf</h3>
                  {selectedItem.message_sent && (
                    <div className="flex justify-end">
                      <div className="max-w-xs px-3 py-2 rounded bg-orange-500/20 border border-orange-500/30">
                        <p className="text-xs text-gray-500 mb-1">
                          {selectedItem.message_sent_at && formatDate(selectedItem.message_sent_at)}
                        </p>
                        <p className="text-sm text-white">{selectedItem.message_content}</p>
                      </div>
                    </div>
                  )}
                  {selectedItem.reply_received && selectedItem.reply_content && (
                    <div className="flex justify-start">
                      <div className="max-w-xs px-3 py-2 rounded bg-green-500/20 border border-green-500/30">
                        <p className="text-xs text-gray-500 mb-1">
                          {selectedItem.reply_received_at && formatDate(selectedItem.reply_received_at)}
                        </p>
                        <p className="text-sm text-white">{selectedItem.reply_content}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p className="text-center">Wahlen Sie einen Kontakt aus, um Details zu sehen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded border" style={{ backgroundColor: '#1a1a1a', borderColor: '#1E1E1E' }}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function FilterTab({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        active ? 'text-white border-b-2' : 'text-gray-500 border-b-2 border-transparent hover:text-gray-400'
      }`}
      style={{
        borderBottomColor: active ? '#E8472A' : 'transparent',
      }}
    >
      {label}
    </button>
  );
}

function StepIndicator({
  label,
  completed,
  current,
}: {
  label: string;
  completed: boolean;
  current: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          completed ? 'bg-green-500/30 text-green-300' : current ? 'bg-orange-500/30 text-orange-300' : 'bg-gray-500/20 text-gray-500'
        }`}
      >
        {completed ? '✓' : current ? '●' : '-'}
      </div>
      <span className={`text-xs whitespace-nowrap ${completed || current ? 'text-white' : 'text-gray-500'}`}>{label}</span>
    </div>
  );
}
