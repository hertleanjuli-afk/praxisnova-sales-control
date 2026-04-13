'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CORAL = '#E8472A';

const PIPELINE_STAGES = [
  'Neu', 'In Outreach', 'Nurture', 'Antwort erhalten',
  'Booked', 'Customer', 'Nicht qualifiziert', 'Blocked',
];

const SOURCES = [
  { value: 'manual', label: 'Manuell' },
  { value: 'empfehlung', label: 'Empfehlung' },
  { value: 'event', label: 'Event' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'partner', label: 'Partner' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export default function CreateLeadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    phone: '',
    title: '',
    website_url: '',
    source: 'manual',
    pipeline_stage: 'Neu',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email.includes('@')) {
      setError('Bitte eine gueltige Email-Adresse eingeben.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        router.push(`/lead/${data.leadId}`);
      } else {
        setError(data.error || 'Fehler beim Erstellen des Leads');
      }
    } catch {
      setError('Netzwerkfehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Lead manuell anlegen</h1>
          <Link
            href="/leads"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Zurueck
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Vorname *</label>
              <input
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                placeholder="Max"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nachname *</label>
              <input
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                placeholder="Mustermann"
              />
            </div>
          </div>

          {/* Email + Company */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              placeholder="max@firma.de"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Firma *</label>
            <input
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              placeholder="Mustermann GmbH"
            />
          </div>

          {/* Phone + Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                placeholder="+49 ..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Position</label>
              <input
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                placeholder="Geschaeftsfuehrer"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Website</label>
            <input
              value={form.website_url}
              onChange={(e) => updateField('website_url', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              placeholder="https://firma.de"
            />
          </div>

          {/* Source + Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Quelle</label>
              <select
                value={form.source}
                onChange={(e) => updateField('source', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {SOURCES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pipeline-Stage</label>
              <select
                value={form.pipeline_stage}
                onChange={(e) => updateField('pipeline_stage', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {PIPELINE_STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notizen</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              placeholder="Kontext, Empfehlung, Termindetails..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            style={{ backgroundColor: saving ? '#666' : CORAL }}
            className="w-full text-white font-semibold py-3 px-4 rounded transition-colors hover:opacity-90 disabled:cursor-not-allowed"
          >
            {saving ? 'Wird erstellt...' : 'Lead anlegen'}
          </button>
        </form>
      </div>
    </div>
  );
}
