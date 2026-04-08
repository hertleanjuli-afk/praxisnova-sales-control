'use client';

import { useState, useEffect, useCallback } from 'react';

interface CustomerInsight {
  id: number;
  reasoning: string;
  data_payload: {
    source_type: string;
    date: string;
    industry: string;
    customer_type: string;
    region: string;
    pain_points: string[];
    key_insight: string;
    recommended_email_angle: string;
    source_note: string;
    validated: boolean;
  };
  created_at: string;
}

const INDUSTRIES = [
  'Immobilien / Hausverwaltung',
  'Bau',
  'Handwerk',
  'Gesundheit / Medizin',
  'Recht / Kanzlei',
  'Logistik / Transport',
  'Einzelhandel',
  'Gastronomie / Hotel',
  'Dienstleistung',
  'Sonstige',
];

const REGIONS = ['DACH', 'Deutschland', 'Oesterreich', 'Schweiz', 'Baden-Wuerttemberg', 'Bayern', 'NRW', 'Sonstige'];

function AddInsightForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    industry: '',
    customer_type: '',
    region: 'DACH',
    pain_points_raw: '',
    key_insight: '',
    recommended_email_angle: '',
    source_note: '',
  });

  const handleSubmit = async () => {
    const pain_points = form.pain_points_raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!form.industry || pain_points.length === 0) {
      alert('Branche und mindestens ein Schmerzpunkt sind Pflicht.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/customer-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: form.industry,
          customer_type: form.customer_type,
          region: form.region,
          pain_points,
          key_insight: form.key_insight,
          recommended_email_angle: form.recommended_email_angle,
          source_note: form.source_note,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setForm({
          industry: '',
          customer_type: '',
          region: 'DACH',
          pain_points_raw: '',
          key_insight: '',
          recommended_email_angle: '',
          source_note: '',
        });
        setOpen(false);
        onSuccess();
      } else {
        alert('Fehler: ' + data.error);
      }
    } catch (err) {
      alert('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
      >
        + Neuen Insight erfassen
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Kundengespräch-Insight erfassen</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              x
            </button>
          </div>

          <div className="space-y-4">
            {/* Branche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branche <span className="text-red-500">*</span>
              </label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Branche waehlen...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Kundentyp + Region */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kundentyp / Firma
                </label>
                <input
                  type="text"
                  value={form.customer_type}
                  onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
                  placeholder="z.B. Hausverwaltung, Bautraeger..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schmerzpunkte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schmerzpunkte <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(einer pro Zeile)</span>
              </label>
              <textarea
                value={form.pain_points_raw}
                onChange={(e) => setForm({ ...form, pain_points_raw: e.target.value })}
                rows={5}
                placeholder={`Mieteingang-Kontrolle: Manueller Excel-Abgleich jede Woche\nSchadensmeldung: 4 manuelle Schritte bis Handwerker beauftragt\nExpose-Erstellung: Aktuell extern fuer 200 EUR pro Expose`}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>

            {/* Key Insight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kern-Insight
              </label>
              <textarea
                value={form.key_insight}
                onChange={(e) => setForm({ ...form, key_insight: e.target.value })}
                rows={2}
                placeholder="Was ist die wichtigste Erkenntnis aus diesem Gespräch?"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Email-Winkel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empfohlener Email-Winkel
              </label>
              <textarea
                value={form.recommended_email_angle}
                onChange={(e) => setForm({ ...form, recommended_email_angle: e.target.value })}
                rows={2}
                placeholder="z.B. 'Ist der Mieteingang-Abgleich bei Ihnen noch manuell?'"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Quellennotiz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quellennotiz (anonym)
              </label>
              <input
                type="text"
                value={form.source_note}
                onChange={(e) => setForm({ ...form, source_note: e.target.value })}
                placeholder="z.B. 'Kundengespräch Stuttgart Degerloch, April 2026'"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Insight speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  onDelete,
}: {
  insight: CustomerInsight;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const d = insight.data_payload;

  const industryColors: Record<string, string> = {
    'Immobilien / Hausverwaltung': 'bg-blue-100 text-blue-800',
    'Bau': 'bg-orange-100 text-orange-800',
    'Handwerk': 'bg-yellow-100 text-yellow-800',
  };
  const industryColor = industryColors[d.industry] || 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${industryColor}`}>
              {d.industry}
            </span>
            {d.customer_type && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {d.customer_type}
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {d.region}
            </span>
            {d.validated && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                validiert
              </span>
            )}
          </div>

          {/* Schmerzpunkte */}
          <div className="space-y-1 mb-3">
            {(expanded ? d.pain_points : d.pain_points.slice(0, 3)).map((pp, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">-</span>
                <p className="text-sm text-gray-700">{pp}</p>
              </div>
            ))}
            {!expanded && d.pain_points.length > 3 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-blue-600 hover:underline ml-4"
              >
                + {d.pain_points.length - 3} weitere...
              </button>
            )}
          </div>

          {/* Key Insight */}
          {d.key_insight && (
            <div className="bg-yellow-50 rounded-lg px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-yellow-800 mb-0.5">Kern-Insight</p>
              <p className="text-sm text-yellow-900">{d.key_insight}</p>
            </div>
          )}

          {/* Email-Winkel */}
          {d.recommended_email_angle && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-blue-800 mb-0.5">Email-Winkel</p>
              <p className="text-sm text-blue-900 italic">"{d.recommended_email_angle}"</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            {d.source_note && (
              <p className="text-xs text-gray-400">{d.source_note}</p>
            )}
            <p className="text-xs text-gray-300">
              {new Date(insight.created_at).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Delete-Button */}
        <button
          onClick={() => {
            if (confirm('Insight wirklich loeschen?')) onDelete(insight.id);
          }}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
          title="Loeschen"
        >
          x
        </button>
      </div>
    </div>
  );
}

export default function CustomerInsightsPage() {
  const [insights, setInsights] = useState<CustomerInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIndustry, setFilterIndustry] = useState('');
  const [count, setCount] = useState(0);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customer-insight');
      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
        setCount(data.count || data.insights.length);
      }
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleDelete = async (id: number) => {
    try {
      await fetch('/api/admin/customer-insight', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadInsights();
    } catch (err) {
      console.error('Fehler beim Loeschen:', err);
    }
  };

  const filteredInsights = filterIndustry
    ? insights.filter((i) => {
        try {
          return i.data_payload?.industry === filterIndustry;
        } catch {
          return false;
        }
      })
    : insights;

  // Safe parse data_payload if it comes as string
  const parsedInsights = filteredInsights.map((i) => ({
    ...i,
    data_payload:
      typeof i.data_payload === 'string' ? JSON.parse(i.data_payload) : i.data_payload,
  }));

  // Count unique industries
  const industryCounts: Record<string, number> = {};
  insights.forEach((i) => {
    const dp = typeof i.data_payload === 'string' ? JSON.parse(i.data_payload) : i.data_payload;
    const ind = dp?.industry || 'Sonstige';
    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kundengespräch-Insights</h1>
          <p className="text-sm text-gray-500 mt-1">
            Validierte Schmerzpunkte aus echten Kundengespraechen - werden von Sales Agents fuer personalisierte Emails genutzt.
          </p>
        </div>
        <AddInsightForm onSuccess={loadInsights} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{count}</div>
          <div className="text-xs text-gray-500 mt-1">Insights gesamt</div>
        </div>
        {Object.entries(industryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([industry, cnt]) => (
            <div
              key={industry}
              onClick={() => setFilterIndustry(filterIndustry === industry ? '' : industry)}
              className={`bg-white border rounded-xl p-4 text-center cursor-pointer transition-all ${
                filterIndustry === industry ? 'ring-2 ring-blue-400 bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="text-3xl font-bold text-blue-700">{cnt}</div>
              <div className="text-xs text-gray-500 mt-1 leading-tight">{industry.split(' / ')[0]}</div>
            </div>
          ))}
      </div>

      {/* Filter */}
      {filterIndustry && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter: {filterIndustry}</span>
          <button
            onClick={() => setFilterIndustry('')}
            className="text-xs text-blue-600 hover:underline"
          >
            Filter entfernen
          </button>
        </div>
      )}

      {/* Insights Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Laden...</div>
      ) : parsedInsights.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-300 text-5xl mb-3">-</div>
          <p className="text-gray-500 font-medium">Noch keine Insights erfasst</p>
          <p className="text-sm text-gray-400 mt-1">
            Erfasse Schmerzpunkte aus Kundengespraechen um die Email-Personalisierung zu verbessern.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {parsedInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
