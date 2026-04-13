'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Smartphone,
  Copy,
  Mail,
  Linkedin,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  Ban,
  Plus,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

// Types
interface LeadDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  mobile_phone: string | null;
  company: string;
  title: string;
  industry: string;
  lead_category: string | null;
  agent_score: number;
  pipeline_stage: string;
  outreach_step: string;
  linkedin_url: string | null;
  website_url: string | null;
  blocked_until: string | null;
  block_reason: string | null;
  permanently_blocked: boolean;
  signal_email_reply: boolean;
  signal_linkedin_interest: boolean;
  total_call_attempts: number;
  source: string;
  manual_entry: boolean;
  exclude_from_sequences: boolean;
  referred_by_lead_id: number | null;
  referral_reason: string | null;
  hubspot_contact_id: string | null;
  pipeline_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  id: string;
  type:
    | 'email_sent'
    | 'email_opened'
    | 'email_clicked'
    | 'email_replied'
    | 'email_bounced'
    | 'call_made'
    | 'call_result'
    | 'linkedin_request'
    | 'linkedin_connected'
    | 'linkedin_message'
    | 'linkedin_reply'
    | 'sequence_started'
    | 'sequence_stopped'
    | 'sequence_paused'
    | 'lead_created'
    | 'stage_changed'
    | 'note_added'
    | 'blocked'
    | 'booked';
  timestamp: string;
  title: string;
  description: string | null;
  metadata?: Record<string, unknown>;
}

interface LinkedInInfo {
  connection_status: string;
  request_sent_at: string | null;
  connected_at: string | null;
  message_sent: boolean;
  message_content: string | null;
  reply_received: boolean;
  reply_content: string | null;
}

interface ApiResponse {
  ok: boolean;
  lead: LeadDetail;
  timeline: TimelineEvent[];
  linkedin: LinkedInInfo | null;
}

// Timeline icon colors
const getTimelineColor = (
  type: TimelineEvent['type']
): string => {
  if (
    type === 'email_sent' ||
    type === 'email_opened' ||
    type === 'email_clicked' ||
    type === 'email_replied' ||
    type === 'email_bounced'
  ) {
    return 'bg-blue-500';
  }
  if (type === 'call_made' || type === 'call_result') {
    return 'bg-orange-500';
  }
  if (
    type === 'linkedin_request' ||
    type === 'linkedin_connected' ||
    type === 'linkedin_message' ||
    type === 'linkedin_reply'
  ) {
    return 'bg-purple-500';
  }
  if (
    type === 'sequence_started' ||
    type === 'sequence_stopped' ||
    type === 'sequence_paused'
  ) {
    return 'bg-gray-500';
  }
  if (type === 'stage_changed') {
    return 'bg-red-500';
  }
  if (type === 'booked') {
    return 'bg-green-500';
  }
  return 'bg-gray-400';
};

// Format date helper
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Format datetime helper
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins}m`;
  if (diffHours < 24) return `vor ${diffHours}h`;
  if (diffDays < 7) return `vor ${diffDays}d`;
  return formatDate(dateString);
};

// Badge component
const Badge = ({
  children,
  color = 'gray',
}: {
  children: React.ReactNode;
  color?: 'gray' | 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'accent';
}) => {
  const colors = {
    gray: 'bg-gray-900 text-gray-300 border border-gray-700',
    green: 'bg-green-900/30 text-green-400 border border-green-700/50',
    red: 'bg-red-900/30 text-red-400 border border-red-700/50',
    orange: 'bg-orange-900/30 text-orange-400 border border-orange-700/50',
    blue: 'bg-blue-900/30 text-blue-400 border border-blue-700/50',
    purple: 'bg-purple-900/30 text-purple-400 border border-purple-700/50',
    accent: 'bg-red-900/20 text-orange-400 border border-orange-600/50',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

// Main Page Component
export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // State
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [linkedin, setLinkedIn] = useState<LinkedInInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Note state
  const [noteText, setNoteText] = useState('');

  // Block form state
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    reason: 'other',
    duration: 3,
    notes: '',
  });

  // Edit form state
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    lead_category: '',
    mobile_phone: '',
    pipeline_stage: '',
  });

  // Copy phone to clipboard
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPhone(id);
      setTimeout(() => setCopiedPhone(null), 2000);
    });
  }, []);

  // Fetch lead detail
  const fetchLeadDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads/${id}/detail`);

      if (response.status === 401) {
        setMessage({ type: 'error', text: 'Sitzung abgelaufen - bitte neu einloggen' });
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.ok) {
        setLead(data.lead);
        setTimeline(data.timeline.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
        setLinkedIn(data.linkedin || null);
        setEditForm({
          lead_category: data.lead.lead_category || '',
          mobile_phone: data.lead.mobile_phone || '',
          pipeline_stage: data.lead.pipeline_stage || '',
        });
      } else {
        setMessage({ type: 'error', text: 'Lead konnte nicht geladen werden' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Laden des Leads' });
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save note
  const saveNote = async () => {
    if (!noteText.trim()) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/leads/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      });

      if (response.ok) {
        setNoteText('');
        setMessage({ type: 'success', text: 'Notiz gespeichert' });
        fetchLeadDetail();
      } else {
        setMessage({ type: 'error', text: 'Notiz konnte nicht gespeichert werden' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern der Notiz' });
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  };

  // Save edit
  const saveEdit = async () => {
    if (!lead) return;

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};
      if (editForm.lead_category) payload.lead_category = editForm.lead_category;
      if (editForm.mobile_phone) payload.mobile_phone = editForm.mobile_phone;
      if (editForm.pipeline_stage && editForm.pipeline_stage !== lead.pipeline_stage) {
        payload.pipeline_stage = editForm.pipeline_stage;
      }

      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Lead aktualisiert' });
        setEditFormOpen(false);
        fetchLeadDetail();
      } else {
        setMessage({ type: 'error', text: 'Lead konnte nicht aktualisiert werden' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Aktualisieren' });
      console.error('Error saving edit:', error);
    } finally {
      setSaving(false);
    }
  };

  // Stop sequence (single lead)
  const stopSequence = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/leads/stop-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: Number(id) }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Sequenz gestoppt (${data.affectedLeads} Lead(s))` });
        fetchLeadDetail();
      } else {
        setMessage({ type: 'error', text: 'Sequenz konnte nicht gestoppt werden' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Stoppen der Sequenz' });
      console.error('Error stopping sequence:', error);
    } finally {
      setSaving(false);
    }
  };

  // Stop all sequences for the same company
  const stopCompanySequences = async () => {
    if (!lead?.company) return;
    try {
      setSaving(true);
      const response = await fetch('/api/leads/stop-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: lead.company }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Alle Sequenzen fuer ${lead.company} gestoppt (${data.affectedLeads} Leads)` });
        fetchLeadDetail();
      } else {
        setMessage({ type: 'error', text: 'Firmen-Sequenzen konnten nicht gestoppt werden' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Firmen-Stopp' });
      console.error('Error stopping company sequences:', error);
    } finally {
      setSaving(false);
    }
  };

  // Book lead
  const bookLead = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/leads/${id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Termin gebucht' });
        fetchLeadDetail();
      } else {
        setMessage({ type: 'error', text: 'Termin konnte nicht gebucht werden' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Buchen des Termins' });
      console.error('Error booking lead:', error);
    } finally {
      setSaving(false);
    }
  };

  // Block lead
  const blockLead = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/leads/${id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: blockForm.reason,
          duration: blockForm.duration,
          notes: blockForm.notes,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Lead blockiert' });
        setBlockFormOpen(false);
        setBlockForm({ reason: 'other', duration: 3, notes: '' });
        fetchLeadDetail();
      } else {
        setMessage({ type: 'error', text: 'Lead konnte nicht blockiert werden' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Blockieren' });
      console.error('Error blocking lead:', error);
    } finally {
      setSaving(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLeadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Lead wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-gray-300 mb-4">Lead nicht gefunden</p>
          <Link
            href="/anrufliste"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            Zurück zur Anrufliste
          </Link>
        </div>
      </div>
    );
  }

  const isBlocked = lead.blocked_until && new Date(lead.blocked_until) > new Date();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-medium py-2 px-4 rounded transition-colors mb-6"
        >
          <span>←</span>
          Zurück
        </button>

        {/* Message notification */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-900/20 border-green-700/50 text-green-400'
                : 'bg-red-900/20 border-red-700/50 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Header Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side: Name and badges */}
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {lead.first_name} {lead.last_name}
              </h1>
              <p className="text-gray-400 mb-4">{lead.title}</p>
              <p className="text-gray-500 mb-4">{lead.company}</p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {lead.lead_category && (
                  <Badge color="blue">{lead.lead_category}</Badge>
                )}
                <Badge color="gray">{lead.pipeline_stage}</Badge>
                <Badge color="accent">Score: {lead.agent_score}</Badge>
                {lead.exclude_from_sequences && (
                  <Badge color="orange">Nur Anrufliste</Badge>
                )}
              </div>

              {/* Outreach step with dot */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-300">{lead.outreach_step}</span>
              </div>

              {/* Blocked warning */}
              {isBlocked && (
                <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">
                      Gesperrt bis {formatDate(lead.blocked_until)}
                    </p>
                    {lead.block_reason && (
                      <p className="text-red-300 text-xs mt-1">
                        Grund: {lead.block_reason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Contact info */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                {lead.email && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      Email
                    </p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-orange-400 hover:text-orange-300 text-sm break-all flex items-start gap-2"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {lead.email}
                    </a>
                  </div>
                )}

                {/* Phone */}
                {lead.phone && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      Telefon
                    </p>
                    <div className="text-white text-sm flex items-center gap-2 tracking-wide">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{lead.phone}</span>
                      <button
                        onClick={() => copyToClipboard(lead.phone!, 'phone')}
                        title="Nummer kopieren"
                        className={`p-1 rounded hover:bg-gray-700 transition-colors ${
                          copiedPhone === 'phone' ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {copiedPhone === 'phone' ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile */}
                {lead.mobile_phone && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      Mobil
                    </p>
                    <div className="text-white text-sm flex items-center gap-2 tracking-wide">
                      <Smartphone className="h-4 w-4 text-gray-400" />
                      <span>{lead.mobile_phone}</span>
                      <button
                        onClick={() => copyToClipboard(lead.mobile_phone!, 'mobile')}
                        title="Nummer kopieren"
                        className={`p-1 rounded hover:bg-gray-700 transition-colors ${
                          copiedPhone === 'mobile' ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {copiedPhone === 'mobile' ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* LinkedIn */}
                {lead.linkedin_url && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      LinkedIn
                    </p>
                    <a
                      href={lead.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-2"
                    >
                      <Linkedin className="h-4 w-4" />
                      Profil
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Website */}
                {lead.website_url && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      Website
                    </p>
                    <a
                      href={lead.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* HubSpot */}
                {lead.hubspot_contact_id && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      Integration
                    </p>
                    <Badge color="gray">In HubSpot</Badge>
                  </div>
                )}

                {/* Call attempts */}
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                    Anrufversuche
                  </p>
                  <p className="text-white font-semibold">
                    {lead.total_call_attempts}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signal badges */}
        {(lead.signal_email_reply || lead.signal_linkedin_interest) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {lead.signal_email_reply && (
              <Badge color="green">
                <CheckCircle className="h-3 w-3 mr-1" />
                Email beantwortet
              </Badge>
            )}
            {lead.signal_linkedin_interest && (
              <Badge color="green">
                <CheckCircle className="h-3 w-3 mr-1" />
                LinkedIn Interesse
              </Badge>
            )}
          </div>
        )}

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Lead Info (30%) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Lead data card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Lead-Daten</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Quelle</p>
                  <p className="text-white">{lead.source}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Erstellt</p>
                  <p className="text-white">{formatDate(lead.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Aktualisiert</p>
                  <p className="text-white">{formatDate(lead.updated_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Eingabe</p>
                  <Badge color={lead.manual_entry ? 'orange' : 'gray'}>
                    {lead.manual_entry ? 'Manuell' : 'Automatisch'}
                  </Badge>
                </div>

                {lead.referred_by_lead_id && (
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-gray-400 text-xs mb-2">
                      Verweis von Lead #{lead.referred_by_lead_id}
                    </p>
                    {lead.referral_reason && (
                      <p className="text-gray-500 text-xs">{lead.referral_reason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* LinkedIn card */}
            {linkedin && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">LinkedIn Status</h3>
                <div className="space-y-4">
                  {/* Mini flow */}
                  <div className="space-y-2">
                    {/* Request */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          linkedin.request_sent_at
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                      >
                        {linkedin.request_sent_at ? '✓' : '•'}
                      </div>
                      <span className="text-xs text-gray-400">Anfrage</span>
                      {linkedin.request_sent_at && (
                        <span className="text-xs text-gray-600 ml-auto">
                          {formatDate(linkedin.request_sent_at)}
                        </span>
                      )}
                    </div>

                    {/* Connected */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          linkedin.connected_at
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                      >
                        {linkedin.connected_at ? '✓' : '•'}
                      </div>
                      <span className="text-xs text-gray-400">Verbunden</span>
                      {linkedin.connected_at && (
                        <span className="text-xs text-gray-600 ml-auto">
                          {formatDate(linkedin.connected_at)}
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          linkedin.message_sent
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                      >
                        {linkedin.message_sent ? '✓' : '•'}
                      </div>
                      <span className="text-xs text-gray-400">Nachricht</span>
                    </div>

                    {/* Reply */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          linkedin.reply_received
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                      >
                        {linkedin.reply_received ? '✓' : '•'}
                      </div>
                      <span className="text-xs text-gray-400">Antwort</span>
                    </div>
                  </div>

                  {/* Messages */}
                  {linkedin.message_content && (
                    <div className="p-3 bg-gray-700/30 rounded text-xs text-gray-300 border border-gray-600">
                      <p className="font-medium text-gray-400 mb-1">Deine Nachricht:</p>
                      <p className="text-gray-300 line-clamp-3">
                        {linkedin.message_content}
                      </p>
                    </div>
                  )}

                  {linkedin.reply_content && (
                    <div className="p-3 bg-purple-900/20 rounded text-xs text-purple-300 border border-purple-600/30">
                      <p className="font-medium text-purple-400 mb-1">Antwort:</p>
                      <p className="text-purple-200 line-clamp-3">
                        {linkedin.reply_content}
                      </p>
                    </div>
                  )}

                  {/* Open link */}
                  {lead.linkedin_url && (
                    <a
                      href={lead.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-orange-400 hover:text-orange-300 text-xs font-medium"
                    >
                      LinkedIn oeffnen
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Notes card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Notizen</h3>
              {lead.pipeline_notes && (
                <div className="mb-4 p-3 bg-gray-700/30 rounded text-sm text-gray-300 whitespace-pre-wrap border border-gray-600">
                  {lead.pipeline_notes}
                </div>
              )}
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Neue Notiz hinzufuegen..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 mb-2 focus:outline-none focus:border-orange-500"
                rows={3}
              />
              <button
                onClick={saveNote}
                disabled={saving || !noteText.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-3 rounded transition-colors"
              >
                {saving ? 'Wird gespeichert...' : 'Notiz speichern'}
              </button>
            </div>
          </div>

          {/* Column 2: Activity Timeline (40%) */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-6">Aktivitaets-Timeline</h3>

              {timeline.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Noch keine Aktivitaeten</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, index) => {
                    const bgColor = getTimelineColor(event.type);
                    return (
                      <div key={event.id} className="relative">
                        {/* Timeline line */}
                        {index < timeline.length - 1 && (
                          <div className="absolute left-2.5 top-8 bottom-0 w-0.5 bg-gray-700" />
                        )}

                        {/* Event */}
                        <div className="flex gap-3">
                          {/* Icon circle */}
                          <div className={`w-6 h-6 rounded-full ${bgColor} flex-shrink-0 relative z-10`} />

                          {/* Content */}
                          <div className="flex-1 pb-4">
                            <p className="text-xs text-gray-500 mb-1">
                              {formatRelativeTime(event.timestamp)}
                            </p>
                            <p className="text-sm font-medium text-white mb-1">
                              {event.title}
                            </p>
                            {event.description && (
                              <p className="text-xs text-gray-400">
                                {event.description}
                              </p>
                            )}

                            {/* Special renderings */}
                            {event.type === 'email_sent' &&
                              event.metadata?.subject && (
                                <p className="text-xs text-gray-500 mt-2 p-2 bg-blue-900/20 rounded border border-blue-700/20">
                                  Betreff: {event.metadata.subject}
                                </p>
                              )}

                            {event.type === 'call_result' &&
                              event.metadata?.outcome && (
                                <div className="mt-2">
                                  <Badge
                                    color={
                                      event.metadata.outcome === 'success'
                                        ? 'green'
                                        : 'orange'
                                    }
                                  >
                                    {event.metadata.outcome}
                                  </Badge>
                                  {event.metadata?.notes && (
                                    <p className="text-xs text-gray-400 mt-2">
                                      {event.metadata.notes}
                                    </p>
                                  )}
                                </div>
                              )}

                            {(event.type === 'linkedin_message' ||
                              event.type === 'linkedin_reply') && (
                              <div className="mt-2 p-2 bg-purple-900/20 rounded border border-purple-700/20 text-xs text-purple-300">
                                {event.metadata?.content}
                              </div>
                            )}

                            {event.type === 'stage_changed' &&
                              event.metadata?.old_stage &&
                              event.metadata?.new_stage && (
                                <p className="text-xs text-gray-400 mt-2">
                                  {event.metadata.old_stage} → {event.metadata.new_stage}
                                </p>
                              )}

                            {event.type === 'blocked' &&
                              event.metadata?.reason && (
                                <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-700/20 text-xs text-red-300">
                                  <p className="font-medium">
                                    {event.metadata.reason}
                                  </p>
                                  {event.metadata?.duration && (
                                    <p className="text-red-400/70">
                                      Dauer: {event.metadata.duration}
                                    </p>
                                  )}
                                </div>
                              )}

                            {event.type === 'booked' && (
                              <div className="mt-2">
                                <Badge color="green">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Termin gebucht
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Actions (30%) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick actions */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Schnellaktionen</h3>
              <div className="space-y-2">
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4" />
                  Zur Anrufliste hinzufuegen
                </button>
                <button
                  onClick={bookLead}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Termin buchen
                </button>
                <button
                  onClick={stopSequence}
                  disabled={saving}
                  className="w-full bg-transparent border border-red-600 hover:bg-red-900/20 disabled:opacity-50 text-red-400 text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Sequenz stoppen
                </button>
                {lead.company && (
                  <button
                    onClick={stopCompanySequences}
                    disabled={saving}
                    className="w-full bg-transparent border border-yellow-600 hover:bg-yellow-900/20 disabled:opacity-50 text-yellow-400 text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    Alle Sequenzen ({lead.company}) stoppen
                  </button>
                )}
                <button
                  onClick={() => setBlockFormOpen(!blockFormOpen)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Blockieren
                </button>
              </div>

              {/* Block form */}
              {blockFormOpen && (
                <div className="mt-4 p-4 bg-gray-700/30 border border-gray-600 rounded space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Grund
                    </label>
                    <select
                      value={blockForm.reason}
                      onChange={(e) =>
                        setBlockForm({ ...blockForm, reason: e.target.value })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="other">Sonstiges</option>
                      <option value="manual_stop">Manuell gestoppt</option>
                      <option value="not_interested">Kein Interesse</option>
                      <option value="wrong_number">Falsche Nummer</option>
                      <option value="do_not_call">Do Not Call</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Dauer (Monate)
                    </label>
                    <select
                      value={blockForm.duration}
                      onChange={(e) =>
                        setBlockForm({
                          ...blockForm,
                          duration: parseInt(e.target.value),
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value={3}>3 Monate</option>
                      <option value={6}>6 Monate</option>
                      <option value={9}>9 Monate</option>
                      <option value={12}>12 Monate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Notizen
                    </label>
                    <textarea
                      value={blockForm.notes}
                      onChange={(e) =>
                        setBlockForm({ ...blockForm, notes: e.target.value })
                      }
                      placeholder="Optional..."
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setBlockFormOpen(false)}
                      disabled={saving}
                      className="flex-1 bg-transparent border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium py-2 px-3 rounded transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={blockLead}
                      disabled={saving}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                    >
                      {saving ? 'Wird blockiert...' : 'Blockieren bestaetigen'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Edit form card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Lead bearbeiten</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    Pipeline-Stage
                  </label>
                  <select
                    value={editForm.pipeline_stage}
                    onChange={(e) =>
                      setEditForm({ ...editForm, pipeline_stage: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Nicht aendern --</option>
                    <option value="Neu">Neu</option>
                    <option value="In Outreach">In Outreach</option>
                    <option value="Nurture">Nurture</option>
                    <option value="Antwort erhalten">Antwort erhalten</option>
                    <option value="Booked">Booked</option>
                    <option value="Customer">Customer</option>
                    <option value="Nicht qualifiziert">Nicht qualifiziert</option>
                    <option value="Wieder aufnehmen">Wieder aufnehmen</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    Kategorie
                  </label>
                  <select
                    value={editForm.lead_category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lead_category: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Waehle Kategorie --</option>
                    <option value="Immobilienmakler">Immobilienmakler</option>
                    <option value="Bautraeger">Bautraeger</option>
                    <option value="Handwerker">Handwerker</option>
                    <option value="Mietverwaltung">Mietverwaltung</option>
                    <option value="Hausverwaltung">Hausverwaltung</option>
                    <option value="Unbekannt">Unbekannt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    Mobil
                  </label>
                  <input
                    type="tel"
                    value={editForm.mobile_phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, mobile_phone: e.target.value })
                    }
                    placeholder="+49..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setEditForm({
                        lead_category: lead?.lead_category || '',
                        mobile_phone: lead?.mobile_phone || '',
                        pipeline_stage: lead?.pipeline_stage || '',
                      })
                    }
                    disabled={saving}
                    className="flex-1 bg-transparent border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium py-2 px-3 rounded transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                  >
                    {saving ? 'Wird gespeichert...' : 'Speichern'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
