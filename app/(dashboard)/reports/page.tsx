'use client';

import { useState, useEffect, Fragment } from 'react';

interface WeeklyReport {
  id: number;
  week_start: string;
  week_end: string;
  leads_contacted: number;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  meetings_booked: number;
  linkedin_requests: number;
  linkedin_connected: number;
  linkedin_messages: number;
  linkedin_replied: number;
  linkedin_meetings: number;
  sector_immobilien_count: number;
  sector_handwerk_count: number;
  sector_bau_count: number;
  sector_allgemein_count: number;
  best_performing_sector: string | null;
  created_at: string;
}

interface ChangeLogEntry {
  id: number;
  change_date: string;
  change_type: string;
  change_description: string;
  changed_by: string;
  expected_impact: string | null;
  actual_impact: string | null;
}

interface FeedbackEntry {
  id: number;
  week_start: string;
  answer_1: string | null;
  answer_2: string | null;
  answer_3: string | null;
  answer_4: string | null;
  answer_5: string | null;
  submitted_by: string;
}

type PeriodFilter = 'all' | '4w' | '12w' | '26w';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '4w', label: 'Letzte 4 Wochen' },
  { value: '12w', label: 'Letzte 12 Wochen' },
  { value: '26w', label: 'Letzte 26 Wochen' },
  { value: 'all', label: 'Alle' },
];

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getKW(dateStr: string): number {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '0.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('12w');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => {
        if (!res.ok) throw new Error('Fehler beim Laden');
        return res.json();
      })
      .then((data) => {
        setReports(data.weeklyReports || []);
        setChangeLog(data.changeLog || []);
        setFeedback(data.weeklyFeedback || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = reports.filter((r) => {
    if (period === 'all') return true;
    const weeksBack = parseInt(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeksBack * 7);
    return new Date(r.week_start) >= cutoff;
  });

  const SECTOR_COLORS: Record<string, string> = {
    immobilien: 'bg-emerald-100 text-emerald-800',
    handwerk: 'bg-amber-100 text-amber-800',
    bau: 'bg-orange-100 text-orange-800',
    allgemein: 'bg-gray-100 text-gray-800',
  };

  function sectorBadge(sector: string | null): string {
    if (!sector) return 'bg-gray-100 text-gray-800';
    const key = sector.toLowerCase();
    for (const [k, v] of Object.entries(SECTOR_COLORS)) {
      if (key.includes(k)) return v;
    }
    return 'bg-blue-100 text-blue-800';
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Reports</h1>
      <p className="text-sm text-gray-500 mb-6">
        Wochenberichte, Change Log und Feedback im Ueberblick
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Period Filter */}
      <div className="flex gap-2 mb-6">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === opt.value
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Weekly Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">Wochenberichte</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Keine Berichte fuer diesen Zeitraum
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">KW</th>
                  <th className="text-left p-3">Zeitraum</th>
                  <th className="text-right p-3">Leads</th>
                  <th className="text-right p-3">E-Mails</th>
                  <th className="text-right p-3">Oeffnungsrate</th>
                  <th className="text-right p-3">Antwortrate</th>
                  <th className="text-right p-3">Meetings</th>
                  <th className="text-left p-3">Bester Sektor</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const isExpanded = expandedId === report.id;
                  const openRateVal = pct(report.emails_opened, report.emails_sent);
                  const replyRateVal = pct(report.emails_replied, report.emails_sent);

                  return (
                    <Fragment key={report.id}>
                      <tr
                        className="border-t border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : report.id)
                        }
                      >
                        <td className="p-3 font-medium text-[#1E3A5F]">
                          KW {getKW(report.week_start)}
                        </td>
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(report.week_start)} &ndash;{' '}
                          {formatDate(report.week_end)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {report.leads_contacted}
                        </td>
                        <td className="p-3 text-right">{report.emails_sent}</td>
                        <td className="p-3 text-right">{openRateVal}%</td>
                        <td className="p-3 text-right">
                          <span
                            className={`font-medium ${
                              parseFloat(replyRateVal) >= 5
                                ? 'text-green-600'
                                : parseFloat(replyRateVal) >= 2
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {replyRateVal}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {report.meetings_booked}
                        </td>
                        <td className="p-3">
                          {report.best_performing_sector && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sectorBadge(
                                report.best_performing_sector
                              )}`}
                            >
                              {report.best_performing_sector}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="bg-slate-50 p-6 border-t border-b border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Email Details */}
                                <div>
                                  <h4 className="text-sm font-semibold text-[#1E3A5F] mb-3">
                                    E-Mail Details
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Gesendet
                                      </span>
                                      <span className="font-medium">
                                        {report.emails_sent}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Geoeffnet
                                      </span>
                                      <span className="font-medium">
                                        {report.emails_opened}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Antworten
                                      </span>
                                      <span className="font-medium">
                                        {report.emails_replied}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* LinkedIn Details */}
                                <div>
                                  <h4 className="text-sm font-semibold text-[#1E3A5F] mb-3">
                                    LinkedIn
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Anfragen
                                      </span>
                                      <span className="font-medium">
                                        {report.linkedin_requests}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Verbunden
                                      </span>
                                      <span className="font-medium">
                                        {report.linkedin_connected}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Nachrichten
                                      </span>
                                      <span className="font-medium">
                                        {report.linkedin_messages}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Antworten
                                      </span>
                                      <span className="font-medium">
                                        {report.linkedin_replied}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Meetings
                                      </span>
                                      <span className="font-medium">
                                        {report.linkedin_meetings}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Sector Breakdown */}
                                <div>
                                  <h4 className="text-sm font-semibold text-[#1E3A5F] mb-3">
                                    Sektor-Aufschluesselung
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Immobilien
                                      </span>
                                      <span className="font-medium">
                                        {report.sector_immobilien_count}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Handwerk
                                      </span>
                                      <span className="font-medium">
                                        {report.sector_handwerk_count}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Bau
                                      </span>
                                      <span className="font-medium">
                                        {report.sector_bau_count}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Allgemein
                                      </span>
                                      <span className="font-medium">
                                        {report.sector_allgemein_count}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Log Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">Change Log</h2>
        </div>
        {changeLog.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Keine Aenderungen dokumentiert
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Datum</th>
                  <th className="text-left p-3">Typ</th>
                  <th className="text-left p-3">Beschreibung</th>
                  <th className="text-left p-3">Erwartete Auswirkung</th>
                  <th className="text-left p-3">Tatsaechliche Auswirkung</th>
                </tr>
              </thead>
              <tbody>
                {changeLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(entry.change_date)}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                        {entry.change_type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700 max-w-xs">
                      {entry.change_description}
                    </td>
                    <td className="p-3 text-gray-500 text-xs max-w-xs">
                      {entry.expected_impact || (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>
                    <td className="p-3 text-xs max-w-xs">
                      {entry.actual_impact ? (
                        <span className="text-green-700">
                          {entry.actual_impact}
                        </span>
                      ) : (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">
            Woechentliches Feedback
          </h2>
        </div>
        {feedback.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Kein Feedback vorhanden
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {feedback.map((entry) => (
              <div key={entry.id} className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-[#1E3A5F]">
                    KW {getKW(entry.week_start)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(entry.week_start)}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {entry.submitted_by}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {entry.answer_1 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">
                        Was lief gut?
                      </p>
                      <p className="text-gray-700">{entry.answer_1}</p>
                    </div>
                  )}
                  {entry.answer_2 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">
                        Was lief nicht gut?
                      </p>
                      <p className="text-gray-700">{entry.answer_2}</p>
                    </div>
                  )}
                  {entry.answer_3 && (
                    <div>
                      <p className="text-xs font-medium text-blue-700 mb-1">
                        Aenderungen?
                      </p>
                      <p className="text-gray-700">{entry.answer_3}</p>
                    </div>
                  )}
                  {entry.answer_4 && (
                    <div>
                      <p className="text-xs font-medium text-purple-700 mb-1">
                        Lead-Reaktionen?
                      </p>
                      <p className="text-gray-700">{entry.answer_4}</p>
                    </div>
                  )}
                  {entry.answer_5 && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-medium text-[#2563EB] mb-1">
                        Naechste Woche testen
                      </p>
                      <p className="text-gray-700">{entry.answer_5}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

