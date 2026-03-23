'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

function getCurrentKW(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split('T')[0];
}

const QUESTIONS = [
  'Was lief diese Woche gut?',
  'Was lief nicht gut?',
  'Haben wir etwas geändert? (Ja/Nein + Beschreibung)',
  'Welche Reaktionen haben wir von Leads bekommen?',
  'Was wollen wir nächste Woche testen?',
];

export default function FeedbackBanner() {
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState(['', '', '', '', '']);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;

    async function checkFeedback() {
      try {
        const res = await fetch('/api/feedback');
        const data = await res.json();
        setPending(data.pending);
      } catch {
        // silently ignore
      }
    }

    checkFeedback();
  }, [session]);

  async function handleSubmit() {
    if (answers.some((a) => !a.trim())) {
      setError('Bitte alle Fragen beantworten.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: getCurrentMonday(),
          answer_1: answers[0],
          answer_2: answers[1],
          answer_3: answers[2],
          answer_4: answers[3],
          answer_5: answers[4],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Fehler beim Speichern');
        return;
      }

      setSubmitted(true);
      setPending(false);
      setShowForm(false);
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session || (!pending && !submitted)) return null;

  if (submitted) {
    return (
      <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-green-800">
        Wochenfeedback erfolgreich gespeichert.
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Banner */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-amber-800 transition hover:bg-amber-100"
      >
        <span className="font-semibold">Wochenfeedback ausstehend</span>
        {' — '}
        Bitte Feedback für KW {getCurrentKW()} ausfüllen
        <span className="float-right text-amber-600">{showForm ? '▲' : '▼'}</span>
      </button>

      {/* Form */}
      {showForm && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[#1E3A5F]">
            Wochenfeedback KW {getCurrentKW()}
          </h3>

          <div className="space-y-4">
            {QUESTIONS.map((question, idx) => (
              <div key={idx}>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {idx + 1}. {question}
                </label>
                <textarea
                  rows={3}
                  value={answers[idx]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[idx] = e.target.value;
                    setAnswers(next);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Antwort eingeben..."
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-[#2563EB] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#1E3A5F] disabled:opacity-50"
            >
              {submitting ? 'Wird gespeichert...' : 'Feedback absenden'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md px-4 py-2 text-sm text-gray-500 transition hover:text-gray-700"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
