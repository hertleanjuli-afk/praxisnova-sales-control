'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Phone, Mail, Linkedin, Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, MessageSquare, Share2, PhoneOff } from 'lucide-react'

// Types
interface CallEntry {
  id: number
  lead_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  mobile_phone: string | null
  company: string
  title: string
  industry: string
  lead_category: string | null
  agent_score: number
  pipeline_stage: string
  outreach_step: string
  linkedin_url: string | null
  total_call_attempts: number
  signal_email_reply: boolean
  signal_linkedin_interest: boolean
  queue_date: string
  rank: number
  priority_score: number
  reason_to_call: string
  talking_points: string
  conversation_guide: string
  best_time_to_call: string
  follow_up_action: string
  status: 'ready' | 'called' | 'skipped'
  called_at: string | null
  call_result: string | null
  call_notes: string | null
  source: string
  linkedin_trigger: boolean
  call_attempt_number: number
  week_number: number
  week_year: number
  email_opens: number
  email_clicks: number
  linkedin_status: string | null
  linkedin_message_sent: boolean
  linkedin_reply_received: boolean
}

interface CallbackEntry {
  id: number
  lead_id: number
  call_queue_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  mobile_phone: string | null
  company: string
  title: string
  lead_category: string | null
  agent_score: number
  total_call_attempts: number
  callback_date: string
  callback_time: string | null
  callback_notes: string | null
  outcome: string
  call_notes: string | null
}

interface DispositionForm {
  answered: boolean
  answered_by: string
  call_quality: 'positiv' | 'neutral' | 'negativ' | ''
  outcome: string
  close_contact: boolean
  close_reason: string
  close_duration_months: 3 | 6 | 9 | null
  callback_requested: boolean
  callback_date: string
  callback_time: string
  callback_notes: string
  referred_to_name: string
  referred_to_phone: string
  referred_to_mobile: string
  referred_to_email: string
  referred_to_position: string
  referred_to_company: string
  call_notes: string
  sequence_action: 'keep_running' | 'stop' | 'pause'
}

interface HistoryEntry extends CallEntry {
  disposition?: Partial<DispositionForm>
}

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Immobilienmakler: { bg: '#6B21A8', text: '#E9D5FF' },
  Bauträger: { bg: '#1E40AF', text: '#DBEAFE' },
  Handwerker: { bg: '#92400E', text: '#FEF3C7' },
  Mietverwaltung: { bg: '#0F766E', text: '#CCFBF1' },
  Hausverwaltung: { bg: '#15803D', text: '#DCFCE7' },
}

const getCategoryColor = (category: string | null) => {
  if (!category) return { bg: '#333', text: '#999' }
  return CATEGORY_COLORS[category] || { bg: '#333', text: '#999' }
}

const getScoreBadgeColor = (score: number) => {
  if (score >= 8) return '#DC2626'
  if (score >= 5) return '#EAB308'
  return '#6B7280'
}

const getOutcomeColor = (outcome: string) => {
  const outcomes: Record<string, string> = {
    'Termin gebucht': '#10B981',
    'Interesse': '#F59E0B',
    'Kein Interesse': '#EF4444',
    'Falscher Ansprechpartner': '#F97316',
    'Nicht erreicht': '#6B7280',
    'Mailbox': '#8B5CF6',
    'Rückruf': '#3B82F6',
    'Weiterleitung': '#A855F7',
    'Besetzt': '#64748B',
  }
  return outcomes[outcome] || '#6B7280'
}

// Component
export default function Anrufliste() {
  const [activeView, setActiveView] = useState<'prospects' | 'partners'>('prospects')
  const [activeTab, setActiveTab] = useState<'week' | 'callbacks' | 'history'>('week')
  const [items, setItems] = useState<CallEntry[]>([])
  const [callbacks, setCallbacks] = useState<CallbackEntry[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedItem, setSelectedItem] = useState<CallEntry | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<{ week: number; year: number }>({ week: 0, year: 0 })
  const [dispositionOpen, setDispositionOpen] = useState(false)
  const [dispositionForm, setDispositionForm] = useState<DispositionForm>({
    answered: false,
    answered_by: '',
    call_quality: '',
    outcome: '',
    close_contact: false,
    close_reason: '',
    close_duration_months: null,
    callback_requested: false,
    callback_date: '',
    callback_time: '',
    callback_notes: '',
    referred_to_name: '',
    referred_to_phone: '',
    referred_to_mobile: '',
    referred_to_email: '',
    referred_to_position: '',
    referred_to_company: '',
    call_notes: '',
    sequence_action: 'keep_running',
  })
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({})
  const [historyFilter, setHistoryFilter] = useState<'all' | 'termin' | 'absage' | 'rückruf' | 'nicht_erreicht'>('all')
  const [partners, setPartners] = useState<any[]>([])
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null)
  const [partnerNotes, setPartnerNotes] = useState<Record<number, string>>({})

  // Initialize - get current week
  useEffect(() => {
    const now = new Date()
    const weekNum = getWeekNumber(now)
    const year = now.getFullYear()
    setSelectedWeek({ week: weekNum, year })
    fetchWeekData(weekNum, year)
    fetchCallbacks()
    fetchHistory()
    fetchPartners()
  }, [])

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7)
  }

  const fetchWeekData = async (week: number, year: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/anrufliste?week=${week}&year=${year}`)
      if (!res.ok) throw new Error('Failed to fetch week data')
      const data = await res.json()
      setItems(data.items || [])
      setSelectedItem(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading week data')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCallbacks = async () => {
    try {
      const res = await fetch('/api/anrufliste/callbacks')
      if (!res.ok) throw new Error('Failed to fetch callbacks')
      const data = await res.json()
      setCallbacks(data.items || [])
    } catch (err) {
      console.error('Error fetching callbacks:', err)
      setCallbacks([])
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/anrufliste?status=called')
      if (!res.ok) throw new Error('Failed to fetch history')
      const data = await res.json()
      setHistory(data.items || [])
    } catch (err) {
      console.error('Error fetching history:', err)
      setHistory([])
    }
  }

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/partners?tier=1&tier=2')
      if (!res.ok) throw new Error('Failed to fetch partners')
      const data = await res.json()
      setPartners(data.items || [])
      setSelectedPartner(null)
    } catch (err) {
      console.error('Error fetching partners:', err)
      setPartners([])
    }
  }

  const handlePreviousWeek = () => {
    const newWeek = selectedWeek.week === 1 ? 52 : selectedWeek.week - 1
    const newYear = selectedWeek.week === 1 ? selectedWeek.year - 1 : selectedWeek.year
    setSelectedWeek({ week: newWeek, year: newYear })
    fetchWeekData(newWeek, newYear)
  }

  const handleNextWeek = () => {
    const newWeek = selectedWeek.week === 52 ? 1 : selectedWeek.week + 1
    const newYear = selectedWeek.week === 52 ? selectedWeek.year + 1 : selectedWeek.year
    setSelectedWeek({ week: newWeek, year: newYear })
    fetchWeekData(newWeek, newYear)
  }

  const handleCurrentWeek = () => {
    const now = new Date()
    const weekNum = getWeekNumber(now)
    const year = now.getFullYear()
    setSelectedWeek({ week: weekNum, year })
    fetchWeekData(weekNum, year)
  }

  const stats = useMemo(() => {
    const total = items.length
    const ready = items.filter(i => i.status === 'ready').length
    const called = items.filter(i => i.status === 'called').length
    const skipped = items.filter(i => i.status === 'skipped').length
    return { total, ready, called, skipped }
  }, [items])

  const callbackStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const dueToday = callbacks.filter(c => c.callback_date === today).length
    const dueThisWeek = callbacks.filter(c => c.callback_date >= weekStartStr && c.callback_date <= weekEndStr).length
    const dueNextWeek = callbacks.filter(c => {
      const d = new Date(c.callback_date)
      d.setDate(d.getDate() - 7)
      return d >= weekStart && d <= weekEnd
    }).length

    return { dueToday, dueThisWeek, dueNextWeek }
  }, [callbacks])

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (historyFilter === 'all') return true
      if (historyFilter === 'termin') return item.call_result === 'Termin gebucht'
      if (historyFilter === 'absage') return item.call_result === 'Kein Interesse'
      if (historyFilter === 'rückruf') return item.call_result === 'Rückruf'
      if (historyFilter === 'nicht_erreicht') return item.call_result === 'Nicht erreicht'
      return true
    })
  }, [history, historyFilter])

  const groupedHistory = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {}
    filteredHistory.forEach(item => {
      const key = `KW ${item.week_number}`
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [filteredHistory])

  const handleDispositionOpen = (item: CallEntry) => {
    setSelectedItem(item)
    setDispositionForm({
      answered: false,
      answered_by: '',
      call_quality: '',
      outcome: '',
      close_contact: false,
      close_reason: '',
      close_duration_months: null,
      callback_requested: false,
      callback_date: '',
      callback_time: '',
      callback_notes: '',
      referred_to_name: '',
      referred_to_phone: '',
      referred_to_mobile: '',
      referred_to_email: '',
      referred_to_position: '',
      referred_to_company: '',
      call_notes: '',
      sequence_action: 'keep_running',
    })
    setDispositionOpen(true)
  }

  const handleDispositionSubmit = async () => {
    if (!selectedItem) return
    if (!dispositionForm.outcome) {
      setError('Bitte waehlen Sie ein Ergebnis')
      return
    }

    setUpdating(true)
    setError(null)
    try {
      const payload: any = {
        call_queue_id: selectedItem.id,
        lead_id: selectedItem.lead_id,
        answered: dispositionForm.answered,
        call_quality: dispositionForm.call_quality || undefined,
        outcome: dispositionForm.outcome,
        call_notes: dispositionForm.call_notes,
        sequence_action: dispositionForm.sequence_action,
      }

      if (dispositionForm.answered) {
        payload.answered_by = dispositionForm.answered_by
      }

      if (dispositionForm.outcome === 'Kein Interesse' && dispositionForm.close_contact) {
        payload.close_contact = true
        payload.close_reason = dispositionForm.close_reason
        payload.close_duration_months = dispositionForm.close_duration_months
      }

      if (dispositionForm.outcome === 'Falscher Ansprechpartner' && dispositionForm.referred_to_name) {
        payload.referred_to_name = dispositionForm.referred_to_name
        payload.referred_to_phone = dispositionForm.referred_to_phone
        payload.referred_to_mobile = dispositionForm.referred_to_mobile
        payload.referred_to_email = dispositionForm.referred_to_email
        payload.referred_to_position = dispositionForm.referred_to_position
        payload.referred_to_company = dispositionForm.referred_to_company
      }

      if (dispositionForm.outcome === 'Rückruf') {
        payload.callback_requested = true
        payload.callback_date = dispositionForm.callback_date
        payload.callback_time = dispositionForm.callback_time || undefined
        payload.callback_notes = dispositionForm.callback_notes
      }

      if (dispositionForm.outcome === 'Weiterleitung') {
        payload.referred_to_name = dispositionForm.referred_to_name
        payload.referred_to_phone = dispositionForm.referred_to_phone
        payload.referred_to_mobile = dispositionForm.referred_to_mobile
        payload.referred_to_email = dispositionForm.referred_to_email
        payload.referred_to_position = dispositionForm.referred_to_position
        payload.referred_to_company = dispositionForm.referred_to_company
      }

      const res = await fetch('/api/anrufliste/disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to save disposition')

      setSuccessMessage('Anruf erfolgreich gespeichert')
      setDispositionOpen(false)
      setSelectedItem(null)
      setTimeout(() => setSuccessMessage(null), 3000)
      await fetchWeekData(selectedWeek.week, selectedWeek.year)
      await fetchCallbacks()
      await fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving disposition')
    } finally {
      setUpdating(false)
    }
  }

  // TAB 1: AKTUELLE WOCHE
  const TabAktuelleWoche = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            KW {selectedWeek.week} {selectedWeek.year}
          </h2>
          <div className="flex gap-2">
            <button onClick={handlePreviousWeek} className="p-2 hover:bg-[#222] rounded text-white">
              <ChevronLeft size={20} />
            </button>
            <button onClick={handleCurrentWeek} className="px-3 py-2 bg-[#E8472A] hover:bg-[#d63b1f] text-white rounded text-sm font-medium">
              Heute
            </button>
            <button onClick={handleNextWeek} className="p-2 hover:bg-[#222] rounded text-white">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-2">
          <div className="text-center">
            <div className="text-[#888]">Gesamt</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="text-center">
            <div className="text-[#888]">Offen</div>
            <div className="text-2xl font-bold text-white">{stats.ready}</div>
          </div>
          <div className="text-center">
            <div className="text-[#888]">Angerufen</div>
            <div className="text-2xl font-bold text-white">{stats.called}</div>
          </div>
          <div className="text-center">
            <div className="text-[#888]">Uebersprungen</div>
            <div className="text-2xl font-bold text-white">{stats.skipped}</div>
          </div>
          <div className="text-center">
            <div className="text-[#888]">Termine</div>
            <div className="text-2xl font-bold text-white">0</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Left: List */}
        <div className="w-2/5 overflow-y-auto">
          {loading ? (
            <div className="text-center text-[#888] py-8">Laden...</div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded text-sm">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center text-[#888] py-8">Keine Anrufe fuer diese Woche</div>
          ) : (
            <div className="space-y-2 pr-2">
              {items.map(item => {
                const isSelected = selectedItem?.id === item.id
                const catColor = getCategoryColor(item.lead_category)
                const scoreColor = getScoreBadgeColor(item.agent_score)
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8472A]/20 border-[#E8472A]'
                        : 'bg-[#1a1a1a] border-[#1E1E1E] hover:border-[#E8472A]/50'
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#E8472A] text-white text-xs font-bold flex items-center justify-center">
                          #{item.rank}
                        </div>
                      </div>
                      <div className="text-xs font-semibold uppercase" style={{ color: scoreColor }}>
                        {item.agent_score.toFixed(1)}
                      </div>
                    </div>

                    {/* Name & Title */}
                    <div className="mb-2" onClick={e => e.stopPropagation()}>
                      <Link
                        href={`/lead/${item.lead_id}`}
                        className="font-bold text-white hover:text-orange-500 transition-colors block"
                        style={{ textDecoration: 'none' }}
                      >
                        {item.first_name} {item.last_name}
                      </Link>
                      <div className="text-sm text-[#888]">{item.title}</div>
                      <div className="text-xs text-[#888]">{item.company}</div>
                    </div>

                    {/* Category Badge */}
                    {item.lead_category && (
                      <div className="flex gap-1 mb-2">
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: catColor.bg, color: catColor.text }}>
                          {item.lead_category}
                        </span>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="text-sm text-white mb-2 break-all">
                      <a href={`tel:${item.phone}`} className="text-[#E8472A] hover:underline">
                        {item.phone}
                      </a>
                    </div>

                    {/* Email Opens */}
                    {item.email_opens > 0 && (
                      <div className="text-xs text-[#888] mb-2">
                        Mail: {item.email_opens}x geoendet {item.email_clicks > 0 && `+ ${item.email_clicks}x geklickt`}
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-1 rounded bg-[#222] text-[#888]">
                        {item.status === 'ready' ? 'Offen' : item.status === 'called' ? 'Angerufen' : 'Uebersprungen'}
                      </span>
                      <span className="text-xs text-[#888]">Versuch {item.call_attempt_number}/3</span>
                    </div>

                    {/* LinkedIn */}
                    {item.source === 'linkedin_no_response' && (
                      <div className="text-xs text-[#888] mt-2 flex items-center gap-1">
                        <Linkedin size={12} />
                        via LinkedIn
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="w-3/5 overflow-y-auto pr-2">
          {!selectedItem ? (
            <div className="flex items-center justify-center h-full text-[#888]">
              Waehlen Sie einen Kontakt aus
            </div>
          ) : (
            <div className="space-y-4">
              {/* Contact Header */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedItem.first_name} {selectedItem.last_name}
                </h3>
                <div className="text-[#888] mb-4">{selectedItem.title}</div>
                <div className="text-lg text-white mb-4 font-semibold">{selectedItem.company}</div>

                {/* Badges */}
                <div className="flex gap-2 mb-4">
                  {selectedItem.lead_category && (
                    <span
                      className="text-xs px-3 py-1 rounded"
                      style={{
                        backgroundColor: getCategoryColor(selectedItem.lead_category).bg,
                        color: getCategoryColor(selectedItem.lead_category).text,
                      }}
                    >
                      {selectedItem.lead_category}
                    </span>
                  )}
                  <span className="text-xs px-3 py-1 rounded bg-[#222] text-[#888]">
                    Score: {selectedItem.agent_score.toFixed(1)}
                  </span>
                  <span className="text-xs px-3 py-1 rounded bg-[#222] text-[#888]">
                    {selectedItem.pipeline_stage}
                  </span>
                </div>

                {/* Contact Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[#888] text-sm mb-1">Telefon</div>
                    <a href={`tel:${selectedItem.phone}`} className="text-[#E8472A] hover:underline break-all">
                      {selectedItem.phone}
                    </a>
                    {selectedItem.mobile_phone && (
                      <>
                        <div className="text-[#888] text-sm mb-1 mt-2">Mobil</div>
                        <a href={`tel:${selectedItem.mobile_phone}`} className="text-[#E8472A] hover:underline break-all">
                          {selectedItem.mobile_phone}
                        </a>
                      </>
                    )}
                  </div>
                  <div>
                    <div className="text-[#888] text-sm mb-1">Email</div>
                    <a href={`mailto:${selectedItem.email}`} className="text-[#E8472A] hover:underline break-all text-sm">
                      {selectedItem.email}
                    </a>
                  </div>
                  <div>
                    <div className="text-[#888] text-sm mb-1">LinkedIn</div>
                    {selectedItem.linkedin_url ? (
                      <a href={selectedItem.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#E8472A] hover:underline flex items-center gap-1">
                        <Linkedin size={16} /> Profil
                      </a>
                    ) : (
                      <span className="text-[#888] text-sm">-</span>
                    )}
                  </div>
                  <div>
                    <div className="text-[#888] text-sm mb-1">Oeffnungen</div>
                    <div className="text-white text-sm">
                      {selectedItem.email_opens} offen {selectedItem.email_clicks > 0 && `+ ${selectedItem.email_clicks} geklickt`}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1E1E1E]">
                  <div className="text-[#888] text-sm mb-1">Bester Anrufzeitpunkt</div>
                  <div className="text-white font-semibold">{selectedItem.best_time_to_call}</div>
                </div>
              </div>

              {/* Warum Anrufen */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Warum Anrufen</h4>
                <p className="text-[#888] text-sm leading-relaxed">{selectedItem.reason_to_call}</p>
              </div>

              {/* Gesprächspunkte */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <button
                  onClick={() => setExpandedHistory({ ...expandedHistory, [selectedItem.id]: !expandedHistory[selectedItem.id] })}
                  className="font-semibold text-white mb-2 w-full text-left hover:text-[#E8472A]"
                >
                  Gesprächspunkte
                </button>
                {expandedHistory[selectedItem.id] && (
                  <div className="text-[#888] text-sm whitespace-pre-wrap">{selectedItem.talking_points}</div>
                )}
              </div>

              {/* Gesprächsleitfaden */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <button
                  onClick={() => setExpandedHistory({ ...expandedHistory, [`guide_${selectedItem.id}`]: !expandedHistory[`guide_${selectedItem.id}`] })}
                  className="font-semibold text-white mb-2 w-full text-left hover:text-[#E8472A]"
                >
                  Gesprächsleitfaden
                </button>
                {expandedHistory[`guide_${selectedItem.id}`] && (
                  <div className="text-[#888] text-sm whitespace-pre-wrap">{selectedItem.conversation_guide}</div>
                )}
              </div>

              {/* LinkedIn Status */}
              {selectedItem.linkedin_status && (
                <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">LinkedIn Status</h4>
                  <div className="text-sm text-[#888]">
                    <div>Status: {selectedItem.linkedin_status}</div>
                    {selectedItem.linkedin_message_sent && <div>Nachricht gesendet: Ja</div>}
                    {selectedItem.linkedin_reply_received && <div>Antwort erhalten: Ja</div>}
                  </div>
                </div>
              )}

              {/* Call Result Button */}
              <button
                onClick={() => handleDispositionOpen(selectedItem)}
                className="w-full bg-[#E8472A] hover:bg-[#d63b1f] text-white font-bold py-3 rounded-lg transition-colors"
              >
                Anruf erfassen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // TAB 2: RÜCKRUFE
  const TabRückrufe = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
        <h2 className="text-xl font-bold text-white mb-4">Rückrufe</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[#888] text-sm">Faellig Heute</div>
            <div className="text-2xl font-bold text-white">{callbackStats.dueToday}</div>
          </div>
          <div>
            <div className="text-[#888] text-sm">Diese Woche</div>
            <div className="text-2xl font-bold text-white">{callbackStats.dueThisWeek}</div>
          </div>
          <div>
            <div className="text-[#888] text-sm">Naechste Woche</div>
            <div className="text-2xl font-bold text-white">{callbackStats.dueNextWeek}</div>
          </div>
        </div>
      </div>

      {/* Callbacks Grid */}
      <div className="flex-1 overflow-y-auto">
        {callbacks.length === 0 ? (
          <div className="text-center text-[#888] py-8">Keine Rückrufe fällig</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
            {[...callbacks].sort((a, b) => new Date(a.callback_date).getTime() - new Date(b.callback_date).getTime()).map(cb => {
              const callDate = new Date(cb.callback_date)
              const dateStr = callDate.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              const catColor = getCategoryColor(cb.lead_category)

              return (
                <div key={cb.id} className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4 hover:border-[#E8472A]/50 transition-all">
                  <div className="text-[#E8472A] font-bold text-lg mb-2">{dateStr}</div>
                  {cb.callback_time && <div className="text-[#888] text-sm mb-3">{cb.callback_time}</div>}

                  <div className="mb-3">
                    <div className="font-bold text-white">{cb.first_name} {cb.last_name}</div>
                    <div className="text-sm text-[#888]">{cb.title}</div>
                    <div className="text-xs text-[#888]">{cb.company}</div>
                  </div>

                  {cb.lead_category && (
                    <div className="mb-2">
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: catColor.bg, color: catColor.text }}>
                        {cb.lead_category}
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-[#888] mb-3">Versuch {cb.total_call_attempts}/3</div>

                  {cb.callback_notes && <div className="text-xs text-[#888] mb-3 line-clamp-2">{cb.callback_notes}</div>}

                  {cb.call_notes && <div className="text-xs text-[#888] mb-3">Vom letzten Anruf: {cb.call_notes}</div>}

                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 bg-[#E8472A] hover:bg-[#d63b1f] text-white text-sm font-semibold py-2 rounded transition-colors">
                      Jetzt anrufen
                    </button>
                    <button className="flex-1 bg-[#222] hover:bg-[#333] text-white text-sm font-semibold py-2 rounded transition-colors">
                      Verschieben
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // TAB 3: ABGESCHLOSSEN
  const TabAbgeschlossen = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Header with Filters */}
      <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
        <h2 className="text-xl font-bold text-white mb-4">Abgeschlossen</h2>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'termin', 'absage', 'rückruf', 'nicht_erreicht'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setHistoryFilter(filter)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                historyFilter === filter
                  ? 'bg-[#E8472A] text-white'
                  : 'bg-[#222] text-[#888] hover:text-white'
              }`}
            >
              {filter === 'all' ? 'Alle' : filter === 'termin' ? 'Termin' : filter === 'absage' ? 'Absage' : filter === 'rückruf' ? 'Rueckruf' : 'Nicht erreicht'}
            </button>
          ))}
        </div>
      </div>

      {/* History by Week */}
      <div className="flex-1 overflow-y-auto pr-2">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center text-[#888] py-8">Keine abgeschlossenen Anrufe</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedHistory).map(([week, entries]) => (
              <div key={week} className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedHistory({ ...expandedHistory, [week]: !expandedHistory[week] })}
                  className="w-full p-4 font-semibold text-white hover:bg-[#222] flex justify-between items-center"
                >
                  {week} ({entries.length} Anrufe)
                  <span className="text-[#888]">{expandedHistory[week] ? '-' : '+'}</span>
                </button>

                {expandedHistory[week] && (
                  <div className="border-t border-[#1E1E1E] p-4 space-y-3">
                    {entries.map(entry => (
                      <div key={entry.id} className="bg-[#0a0a0a] p-3 rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-white">
                              {entry.first_name} {entry.last_name}
                            </div>
                            <div className="text-sm text-[#888]">{entry.company}</div>
                          </div>
                          <span
                            className="text-xs px-2 py-1 rounded font-semibold text-white"
                            style={{ backgroundColor: getOutcomeColor(entry.call_result || '') }}
                          >
                            {entry.call_result}
                          </span>
                        </div>

                        {entry.called_at && (
                          <div className="text-xs text-[#888] mb-2">
                            {new Date(entry.called_at).toLocaleDateString('de-DE')}
                          </div>
                        )}

                        {entry.call_notes && (
                          <div className="text-xs text-[#888] mb-2 line-clamp-2">{entry.call_notes}</div>
                        )}

                        <div className="text-xs text-[#888]">Status: {entry.pipeline_stage}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const TabPartnerAnrufe = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
        <h2 className="text-xl font-bold text-white">Partner-Anrufkandidaten</h2>
        <p className="text-[#888] text-sm mt-1">Tier 1-2 Partner mit Kontaktinformation</p>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Left: Partner List */}
        <div className="w-2/5 overflow-y-auto">
          {partners.length === 0 ? (
            <div className="text-center text-[#888] py-8">Keine Partner verfuegbar</div>
          ) : (
            <div className="space-y-2 pr-2">
              {partners.map(partner => (
                <div
                  key={partner.id}
                  onClick={() => setSelectedPartner(partner)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPartner?.id === partner.id
                      ? 'bg-[#E8472A]/20 border-[#E8472A]'
                      : 'bg-[#1a1a1a] border-[#1E1E1E] hover:border-[#E8472A]/50'
                  }`}
                >
                  {/* Tier Badge */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-white">{partner.company}</div>
                    <span className="text-xs px-2 py-1 rounded bg-[#E8472A] text-white font-semibold">
                      Tier {partner.tier}
                    </span>
                  </div>

                  {/* Contact Name */}
                  {partner.contact_name && (
                    <div className="text-sm text-[#888] mb-1">{partner.contact_name}</div>
                  )}

                  {/* Category */}
                  {partner.category && (
                    <div className="text-xs text-[#888] mb-2 line-clamp-1">{partner.category}</div>
                  )}

                  {/* Contact */}
                  {partner.email && (
                    <div className="text-xs text-[#E8472A] mb-1 break-all">
                      <a href={`mailto:${partner.email}`} className="hover:underline">
                        {partner.email}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="w-3/5 overflow-y-auto pr-2">
          {!selectedPartner ? (
            <div className="flex items-center justify-center h-full text-[#888]">
              Waehlen Sie einen Partner aus
            </div>
          ) : (
            <div className="space-y-4">
              {/* Partner Header */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <h3 className="text-2xl font-bold text-white mb-2">{selectedPartner.company}</h3>
                {selectedPartner.contact_name && (
                  <div className="text-[#888] mb-2">{selectedPartner.contact_name}</div>
                )}
                {selectedPartner.contact_title && (
                  <div className="text-[#888] mb-4">{selectedPartner.contact_title}</div>
                )}

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded bg-[#E8472A] text-white font-semibold">
                    Tier {selectedPartner.tier}
                  </span>
                  {selectedPartner.category && (
                    <span className="text-xs px-3 py-1 rounded bg-[#222] text-[#888]">
                      {selectedPartner.category}
                    </span>
                  )}
                  {selectedPartner.agent_score && (
                    <span className="text-xs px-3 py-1 rounded bg-[#222] text-[#888]">
                      Score: {selectedPartner.agent_score.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Kontakt</h4>
                <div className="space-y-3">
                  {selectedPartner.email && (
                    <div>
                      <div className="text-[#888] text-sm mb-1">Email</div>
                      <a href={`mailto:${selectedPartner.email}`} className="text-[#E8472A] hover:underline break-all text-sm">
                        {selectedPartner.email}
                      </a>
                    </div>
                  )}
                  {selectedPartner.website && (
                    <div>
                      <div className="text-[#888] text-sm mb-1">Website</div>
                      <a href={selectedPartner.website} target="_blank" rel="noopener noreferrer" className="text-[#E8472A] hover:underline break-all text-sm">
                        {selectedPartner.website}
                      </a>
                    </div>
                  )}
                  {selectedPartner.linkedin_url && (
                    <div>
                      <div className="text-[#888] text-sm mb-1">LinkedIn</div>
                      <a href={selectedPartner.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#E8472A] hover:underline break-all text-sm flex items-center gap-1">
                        <Linkedin size={14} />
                        {selectedPartner.linkedin_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Notizen */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Notizen</h4>
                <textarea
                  value={partnerNotes[selectedPartner.id] || ''}
                  onChange={e => setPartnerNotes({ ...partnerNotes, [selectedPartner.id]: e.target.value })}
                  placeholder="Anrufergebnis und Notizen eingeben..."
                  className="w-full bg-[#0a0a0a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A] min-h-24"
                />
              </div>

              {/* Status Buttons */}
              <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Status</h4>
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded transition-colors">
                    Erreicht
                  </button>
                  <button className="flex-1 px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white font-semibold rounded transition-colors">
                    Nicht erreicht
                  </button>
                  <button className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded transition-colors">
                    Termin
                  </button>
                </div>
              </div>

              {selectedPartner.agent_reasoning && (
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Agent Reasoning</h4>
                  <p className="text-[#888] text-sm">{selectedPartner.agent_reasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-[#111] text-white p-4 flex flex-col">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-900/20 border border-green-800 text-green-200 px-4 py-3 rounded-lg text-sm z-50">
          {successMessage}
        </div>
      )}

      {/* Top-Level View Navigation */}
      <div className="flex gap-4 mb-4 border-b border-[#1E1E1E]">
        {(['prospects', 'partners'] as const).map(view => (
          <button
            key={view}
            onClick={() => {
              setActiveView(view)
              if (view === 'prospects') {
                setActiveTab('week')
              }
            }}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeView === view
                ? 'text-[#E8472A] border-[#E8472A]'
                : 'text-[#888] border-transparent hover:text-white'
            }`}
          >
            {view === 'prospects' ? 'Prospect-Anrufe' : 'Partner-Anrufe'}
          </button>
        ))}
      </div>

      {/* Sub-Tab Navigation (only for Prospect-Anrufe) */}
      {activeView === 'prospects' && (
        <div className="flex gap-4 mb-4 border-b border-[#1E1E1E]">
          {['week', 'callbacks', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-[#E8472A] border-[#E8472A]'
                  : 'text-[#888] border-transparent hover:text-white'
              }`}
            >
              {tab === 'week' ? 'Aktuelle Woche' : tab === 'callbacks' ? 'Rueckrufe' : 'Abgeschlossen'}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'prospects' && (
          <>
            {activeTab === 'week' && <TabAktuelleWoche />}
            {activeTab === 'callbacks' && <TabRückrufe />}
            {activeTab === 'history' && <TabAbgeschlossen />}
          </>
        )}
        {activeView === 'partners' && <TabPartnerAnrufe />}
      </div>

      {/* Disposition Modal */}
      {dispositionOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#111] border border-[#1E1E1E] rounded-lg max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#1E1E1E] p-6">
              <h3 className="text-2xl font-bold text-white">
                Anruf erfassen - {selectedItem.first_name} {selectedItem.last_name} | {selectedItem.company}
              </h3>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Section 1: Grundinfo */}
              <div>
                <h4 className="font-semibold text-white mb-4">Grundinfo</h4>

                <div className="mb-4">
                  <label className="block text-[#888] text-sm mb-2">Wurde der Anruf entgegengenommen?</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDispositionForm({ ...dispositionForm, answered: true })}
                      className={`flex-1 py-3 font-semibold rounded transition-colors ${
                        dispositionForm.answered
                          ? 'bg-green-900/30 border border-green-800 text-green-200'
                          : 'bg-[#222] border border-[#1E1E1E] text-[#888] hover:text-white'
                      }`}
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setDispositionForm({ ...dispositionForm, answered: false })}
                      className={`flex-1 py-3 font-semibold rounded transition-colors ${
                        !dispositionForm.answered
                          ? 'bg-red-900/30 border border-red-800 text-red-200'
                          : 'bg-[#222] border border-[#1E1E1E] text-[#888] hover:text-white'
                      }`}
                    >
                      Nein
                    </button>
                  </div>
                </div>

                {dispositionForm.answered && (
                  <div className="mb-4">
                    <label className="block text-[#888] text-sm mb-2">Von wem? (Ansprechpartner Name)</label>
                    <input
                      type="text"
                      value={dispositionForm.answered_by}
                      onChange={e => setDispositionForm({ ...dispositionForm, answered_by: e.target.value })}
                      placeholder="Name eingeben"
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[#888] text-sm mb-2">Qualitaet des Gesprächs?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['positiv', 'neutral', 'negativ'].map(q => (
                      <button
                        key={q}
                        onClick={() => setDispositionForm({ ...dispositionForm, call_quality: q as any })}
                        className={`py-2 rounded font-semibold transition-colors ${
                          dispositionForm.call_quality === q
                            ? q === 'positiv'
                              ? 'bg-green-900/30 border border-green-800 text-green-200'
                              : q === 'neutral'
                              ? 'bg-yellow-900/30 border border-yellow-800 text-yellow-200'
                              : 'bg-red-900/30 border border-red-800 text-red-200'
                            : 'bg-[#222] border border-[#1E1E1E] text-[#888] hover:text-white'
                        }`}
                      >
                        {q === 'positiv' ? 'Positiv' : q === 'neutral' ? 'Neutral' : 'Negativ'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Outcome */}
              <div>
                <h4 className="font-semibold text-white mb-4">Ergebnis</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Termin gebucht', label: 'Termin gebucht', icon: Calendar },
                    { id: 'Interesse', label: 'Interesse', icon: CheckCircle },
                    { id: 'Kein Interesse', label: 'Kein Interesse', icon: XCircle },
                    { id: 'Falscher Ansprechpartner', label: 'Falscher Ansprechpartner', icon: Users },
                    { id: 'Nicht erreicht', label: 'Nicht erreicht', icon: PhoneOff },
                    { id: 'Mailbox', label: 'Mailbox', icon: MessageSquare },
                    { id: 'Rückruf', label: 'Rückruf', icon: Clock },
                    { id: 'Weiterleitung', label: 'Weiterleitung', icon: Share2 },
                    { id: 'Besetzt', label: 'Besetzt', icon: AlertCircle },
                  ].map(opt => {
                    const Icon = opt.icon
                    const isSelected = dispositionForm.outcome === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setDispositionForm({ ...dispositionForm, outcome: opt.id })}
                        className={`p-3 rounded flex flex-col items-center gap-1 text-sm font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#E8472A] text-white'
                            : 'bg-[#222] border border-[#1E1E1E] text-[#888] hover:text-white'
                        }`}
                      >
                        <Icon size={20} />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Section 3: Dynamic based on outcome */}
              {dispositionForm.outcome === 'Kein Interesse' && (
                <div>
                  <h4 className="font-semibold text-white mb-4">Absage verarbeiten</h4>

                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dispositionForm.close_contact}
                        onChange={e => setDispositionForm({ ...dispositionForm, close_contact: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-white">Kontakt schliessen</span>
                    </label>
                  </div>

                  {dispositionForm.close_contact && (
                    <>
                      <div className="mb-4">
                        <label className="block text-[#888] text-sm mb-2">Grund</label>
                        <select
                          value={dispositionForm.close_reason}
                          onChange={e => setDispositionForm({ ...dispositionForm, close_reason: e.target.value })}
                          className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                        >
                          <option value="">Grund auswaehlen...</option>
                          <option value="Absage">Absage</option>
                          <option value="Falsche Firma">Falsche Firma</option>
                          <option value="Kein Bedarf">Kein Bedarf</option>
                          <option value="Budget">Budget</option>
                          <option value="Timing">Timing</option>
                          <option value="Konkurrenz">Konkurrenz</option>
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block text-[#888] text-sm mb-2">Sperrzeit</label>
                        <div className="flex gap-2">
                          {[3, 6, 9].map(months => (
                            <button
                              key={months}
                              onClick={() => setDispositionForm({ ...dispositionForm, close_duration_months: months as any })}
                              className={`flex-1 py-2 rounded font-semibold transition-colors ${
                                dispositionForm.close_duration_months === months
                                  ? 'bg-[#E8472A] text-white'
                                  : 'bg-[#222] border border-[#1E1E1E] text-[#888] hover:text-white'
                              }`}
                            >
                              {months} Monate
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#888] text-sm mb-2">Sequenz-Aktion</label>
                        <select
                          value={dispositionForm.sequence_action}
                          onChange={e => setDispositionForm({ ...dispositionForm, sequence_action: e.target.value as any })}
                          className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                        >
                          <option value="keep_running">Weiter laufen</option>
                          <option value="stop">Stoppen</option>
                          <option value="pause">Pausieren</option>
                        </select>
                        <div className="text-xs text-red-400 mt-2">Email-Sequenz wird bei Stoppen gestoppt</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {dispositionForm.outcome === 'Falscher Ansprechpartner' && (
                <div>
                  <h4 className="font-semibold text-white mb-4">Neuen Kontakt anlegen</h4>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={dispositionForm.referred_to_name}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_name: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="tel"
                      placeholder="Telefon"
                      value={dispositionForm.referred_to_phone}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_phone: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="tel"
                      placeholder="Mobil"
                      value={dispositionForm.referred_to_mobile}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_mobile: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={dispositionForm.referred_to_email}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_email: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      value={dispositionForm.referred_to_position}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_position: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="text"
                      placeholder="Firma"
                      value={dispositionForm.referred_to_company}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_company: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                  </div>
                </div>
              )}

              {dispositionForm.outcome === 'Rückruf' && (
                <div>
                  <h4 className="font-semibold text-white mb-4">Rückruf planen</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[#888] text-sm mb-2">Rückruf Datum (erforderlich)</label>
                      <input
                        type="date"
                        value={dispositionForm.callback_date}
                        onChange={e => setDispositionForm({ ...dispositionForm, callback_date: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#888] text-sm mb-2">Uhrzeit (optional)</label>
                      <input
                        type="time"
                        value={dispositionForm.callback_time}
                        onChange={e => setDispositionForm({ ...dispositionForm, callback_time: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#888] text-sm mb-2">Rückruf Notizen</label>
                      <textarea
                        value={dispositionForm.callback_notes}
                        onChange={e => setDispositionForm({ ...dispositionForm, callback_notes: e.target.value })}
                        placeholder="Notizen zum Rückruf..."
                        className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A] min-h-20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {dispositionForm.outcome === 'Weiterleitung' && (
                <div>
                  <h4 className="font-semibold text-white mb-4">Weiterleitung</h4>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={dispositionForm.referred_to_name}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_name: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="tel"
                      placeholder="Telefon"
                      value={dispositionForm.referred_to_phone}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_phone: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="tel"
                      placeholder="Mobil"
                      value={dispositionForm.referred_to_mobile}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_mobile: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={dispositionForm.referred_to_email}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_email: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      value={dispositionForm.referred_to_position}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_position: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                    <input
                      type="text"
                      placeholder="Firma"
                      value={dispositionForm.referred_to_company}
                      onChange={e => setDispositionForm({ ...dispositionForm, referred_to_company: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    />
                  </div>

                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded text-xs text-blue-200">
                    Dieser Kontakt wird NUR auf die Anrufliste gesetzt, NICHT in Email-Sequenz
                  </div>
                </div>
              )}

              {dispositionForm.outcome === 'Termin gebucht' && (
                <div className="p-4 bg-green-900/20 border border-green-800 rounded text-green-200 text-sm">
                  Lead wird auf 'Booked' gesetzt und alle Sequenzen werden gestoppt
                </div>
              )}

              {/* Section 4: Allgemein */}
              <div>
                <h4 className="font-semibold text-white mb-4">Allgemein</h4>

                {dispositionForm.outcome !== 'Kein Interesse' && (
                  <div className="mb-4">
                    <label className="block text-[#888] text-sm mb-2">Sequenz-Aktion</label>
                    <select
                      value={dispositionForm.sequence_action}
                      onChange={e => setDispositionForm({ ...dispositionForm, sequence_action: e.target.value as any })}
                      className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A]"
                    >
                      <option value="keep_running">Weiter laufen</option>
                      <option value="stop">Stoppen</option>
                      <option value="pause">Pausieren</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[#888] text-sm mb-2">Notizen zum Anruf</label>
                  <textarea
                    value={dispositionForm.call_notes}
                    onChange={e => setDispositionForm({ ...dispositionForm, call_notes: e.target.value })}
                    placeholder="Notizen eingeben..."
                    className="w-full bg-[#1a1a1a] border border-[#1E1E1E] text-white rounded px-3 py-2 focus:outline-none focus:border-[#E8472A] min-h-24"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-200 p-3 rounded text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-[#1E1E1E] p-6 flex gap-2">
              <button
                onClick={() => setDispositionOpen(false)}
                disabled={updating}
                className="flex-1 bg-[#222] hover:bg-[#333] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDispositionSubmit}
                disabled={updating}
                className="flex-1 bg-[#E8472A] hover:bg-[#d63b1f] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {updating ? 'Speichern...' : 'Anruf speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
