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
    sub_category?: string | null;
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

const REGIONS = ['DACH', 'Deutschland', 'Österreich', 'Schweiz', 'Baden-Württemberg', 'Bayern', 'NRW', 'Sonstige'];

// Sub-category taxonomy: sector -> list of filterable sub-categories.
// `matches` are lowercase substrings used to infer sub-category from `customer_type`
// for older insights that predate the explicit `sub_category` tag.
type SubCategory = { key: string; label: string; matches: string[] };
const SUB_CATEGORIES: Record<string, SubCategory[]> = {
  immobilien: [
    { key: 'immo_makler', label: 'Immo Makler', matches: ['makler', 'real estate', 'immobilienmakler'] },
    { key: 'hausverwaltung', label: 'Hausverwaltung', matches: ['hausverwaltung', 'wohnungsverwaltung', 'mietverwaltung'] },
    { key: 'bautraeger', label: 'Bauträger', matches: ['bauträger', 'bautraeger', 'projektentwickler'] },
  ],
  handwerk: [
    { key: 'elektriker', label: 'Elektriker', matches: ['elektr', 'elektriker', 'e-technik'] },
    { key: 'shk', label: 'SHK / Sanitär', matches: ['shk', 'sanitär', 'sanitaer', 'heizung', 'klima'] },
    { key: 'dachdecker', label: 'Dachdecker', matches: ['dachdecker', 'dach'] },
    { key: 'maler', label: 'Maler', matches: ['maler', 'lackierer'] },
    { key: 'tischler', label: 'Tischler / Schreiner', matches: ['tischler', 'schreiner', 'zimmermann'] },
  ],
  bau: [
    { key: 'gu', label: 'Generalunternehmer', matches: ['gu', 'generalunternehmer'] },
    { key: 'hochbau', label: 'Hochbau', matches: ['hochbau'] },
    { key: 'tiefbau', label: 'Tiefbau', matches: ['tiefbau'] },
    { key: 'sub', label: 'Subunternehmer', matches: ['subunternehmer', 'sub '] },
  ],
};

// Map high-level sector key -> matching patterns for the full `industry` label
// stored in data_payload. The form uses combined labels like "Immobilien / Hausverwaltung",
// so we match on a substring.
const SECTOR_INDUSTRY_MATCHES: Record<string, string[]> = {
  immobilien: ['immobilien', 'hausverwaltung'],
  handwerk: ['handwerk'],
  bau: ['bau'],
};

function matchesSector(industry: string | undefined, sector: string): boolean {
  if (sector === 'alle') return true;
  const patterns = SECTOR_INDUSTRY_MATCHES[sector];
  if (!patterns) return false;
  const lc = (industry || '').toLowerCase();
  return patterns.some(p => lc.includes(p));
}

function matchesSubCategory(
  dp: CustomerInsight['data_payload'],
  sector: string,
  subKey: string,
): boolean {
  if (subKey === 'alle') return true;
  // Prefer the explicit sub_category tag set on new inserts.
  if (dp.sub_category && dp.sub_category === subKey) return true;
  // Fallback: infer from the free-text `customer_type` field for older insights.
  const subList = SUB_CATEGORIES[sector] || [];
  const sub = subList.find(s => s.key === subKey);
  if (!sub) return false;
  const haystack = `${dp.customer_type || ''} ${dp.industry || ''}`.toLowerCase();
  return sub.matches.some(m => haystack.includes(m));
}

function AddInsightForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    industry: '',
    customer_type: '',
    sub_category: '',
    region: 'DACH',
    pain_points_raw: '',
    key_insight: '',
    recommended_email_angle: '',
    source_note: '',
  });

  // Infer which sector the currently-selected industry belongs to, so the sub-category
  // dropdown can show the right options.
  const formSector = (() => {
    const lc = (form.industry || '').toLowerCase();
    if (lc.includes('immobilien') || lc.includes('hausverwaltung')) return 'immobilien';
    if (lc.includes('handwerk')) return 'handwerk';
    if (lc.includes('bau')) return 'bau';
    return null;
  })();
  const formSubCategoryOptions = formSector ? SUB_CATEGORIES[formSector] || [] : [];

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
          sub_category: form.sub_category || null,
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
          sub_category: '',
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
        className="px-4 py-2 bg-[#E8472A] text-white rounded-lg hover:bg-[#d93919] font-medium text-sm"
      >
        + Neuen Insight erfassen
      </button>
    );
  }

  const inputCls =
    'w-full bg-[#0f0f0f] border border-[#2a2a2a] text-[#F0F0F5] placeholder-[#555] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8472A]';
  const labelCls = 'block text-sm font-medium text-[#ccc] mb-1';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#F0F0F5]">Kundengespräch-Insight erfassen</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-[#555] hover:text-[#ccc] text-xl font-bold"
            >
              x
            </button>
          </div>

          <div className="space-y-4">
            {/* Branche */}
            <div>
              <label className={labelCls}>
                Branche <span className="text-[#E8472A]">*</span>
              </label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className={inputCls}
              >
                <option value="">Branche wählen...</option>
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
                <label className={labelCls}>
                  Kundentyp / Firma
                </label>
                <input
                  type="text"
                  value={form.customer_type}
                  onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
                  placeholder="z.B. Hausverwaltung, Bauträger..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className={inputCls}
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-Kategorie: shown only when the selected industry maps to a sector with sub-categories */}
            {formSubCategoryOptions.length > 0 && (
              <div>
                <label className={labelCls}>
                  Unter-Kategorie
                  <span className="text-[#666] font-normal ml-1">(optional)</span>
                </label>
                <select
                  value={form.sub_category}
                  onChange={(e) => setForm({ ...form, sub_category: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Unter-Kategorie wählen...</option>
                  {formSubCategoryOptions.map(sub => (
                    <option key={sub.key} value={sub.key}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Schmerzpunkte */}
            <div>
              <label className={labelCls}>
                Schmerzpunkte <span className="text-[#E8472A]">*</span>
                <span className="text-[#666] font-normal ml-1">(einer pro Zeile)</span>
              </label>
              <textarea
                value={form.pain_points_raw}
                onChange={(e) => setForm({ ...form, pain_points_raw: e.target.value })}
                rows={5}
                placeholder={`Mieteingang-Kontrolle: Manueller Excel-Abgleich jede Woche\nSchadensmeldung: 4 manuelle Schritte bis Handwerker beauftragt\nExposé-Erstellung: Aktuell extern für 200 EUR pro Exposé`}
                className={`${inputCls} font-mono`}
              />
            </div>

            {/* Key Insight */}
            <div>
              <label className={labelCls}>
                Kern-Insight
              </label>
              <textarea
                value={form.key_insight}
                onChange={(e) => setForm({ ...form, key_insight: e.target.value })}
                rows={2}
                placeholder="Was ist die wichtigste Erkenntnis aus diesem Gespräch?"
                className={inputCls}
              />
            </div>

            {/* Email-Winkel */}
            <div>
              <label className={labelCls}>
                Empfohlener Email-Winkel
              </label>
              <textarea
                value={form.recommended_email_angle}
                onChange={(e) => setForm({ ...form, recommended_email_angle: e.target.value })}
                rows={2}
                placeholder="z.B. 'Ist der Mieteingang-Abgleich bei Ihnen noch manuell?'"
                className={inputCls}
              />
            </div>

            {/* Quellennotiz */}
            <div>
              <label className={labelCls}>
                Quellennotiz (anonym)
              </label>
              <input
                type="text"
                value={form.source_note}
                onChange={(e) => setForm({ ...form, source_note: e.target.value })}
                placeholder="z.B. 'Kundengespräch Stuttgart Degerloch, April 2026'"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2a2a2a]">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 bg-transparent border border-[#2a2a2a] text-[#ccc] rounded-lg hover:bg-[#2a2a2a] text-sm"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-[#E8472A] text-white rounded-lg hover:bg-[#d93919] text-sm font-medium disabled:opacity-50"
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

  // Industry badges - darker-themed variants of the light color system
  const industryColors: Record<string, string> = {
    'Immobilien / Hausverwaltung': 'bg-[#1e3a5f] text-[#93c5fd]',
    'Bau': 'bg-[#3a1f0f] text-[#fdba74]',
    'Handwerk': 'bg-[#3a2f0f] text-[#fde047]',
  };
  const industryColor = industryColors[d.industry] || 'bg-[#2a2a2a] text-[#aaa]';

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${industryColor}`}>
              {d.industry}
            </span>
            {d.customer_type && (
              <span className="text-xs bg-[#2a2a2a] text-[#ccc] px-2 py-0.5 rounded-full">
                {d.customer_type}
              </span>
            )}
            <span className="text-xs bg-[#2a2a2a] text-[#888] px-2 py-0.5 rounded-full">
              {d.region}
            </span>
            {d.validated && (
              <span className="text-xs bg-[#0f2a18] text-[#4ade80] px-2 py-0.5 rounded-full">
                validiert
              </span>
            )}
          </div>

          {/* Schmerzpunkte */}
          <div className="space-y-1 mb-3">
            {(expanded ? d.pain_points : d.pain_points.slice(0, 3)).map((pp, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#E8472A] mt-0.5 flex-shrink-0">-</span>
                <p className="text-sm text-[#ccc]">{pp}</p>
              </div>
            ))}
            {!expanded && d.pain_points.length > 3 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-[#E8472A] hover:underline ml-4"
              >
                + {d.pain_points.length - 3} weitere...
              </button>
            )}
          </div>

          {/* Key Insight */}
          {d.key_insight && (
            <div className="bg-[#2a2000] border border-[#3a2f00] rounded-lg px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-[#fde047] mb-0.5">Kern-Insight</p>
              <p className="text-sm text-[#fef3c7]">{d.key_insight}</p>
            </div>
          )}

          {/* Email-Winkel */}
          {d.recommended_email_angle && (
            <div className="bg-[#0f1e3a] border border-[#1e3a5f] rounded-lg px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-[#93c5fd] mb-0.5">Email-Winkel</p>
              <p className="text-sm text-[#dbeafe] italic">&quot;{d.recommended_email_angle}&quot;</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            {d.source_note && (
              <p className="text-xs text-[#666]">{d.source_note}</p>
            )}
            <p className="text-xs text-[#555]">
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
            if (confirm('Insight wirklich löschen?')) onDelete(insight.id);
          }}
          className="text-[#555] hover:text-[#E8472A] transition-colors flex-shrink-0 mt-1"
          title="Löschen"
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
  const [selectedSector, setSelectedSector] = useState<string>('alle');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('alle');
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

  // Parse first (data_payload may come back as string from the JSONB column), then filter.
  // Doing it in this order lets the sector/sub-category matchers see a real object.
  const parsedInsights = insights
    .map((i) => ({
      ...i,
      data_payload:
        typeof i.data_payload === 'string' ? JSON.parse(i.data_payload) : i.data_payload,
    }))
    .filter((i) => {
      const dp = i.data_payload;
      // Legacy stat-card filter (exact industry label match)
      if (filterIndustry && dp?.industry !== filterIndustry) return false;
      // New sector filter
      if (!matchesSector(dp?.industry, selectedSector)) return false;
      // New sub-category filter (only applies when a specific sector is selected)
      if (selectedSector !== 'alle' && !matchesSubCategory(dp, selectedSector, selectedSubCategory)) {
        return false;
      }
      return true;
    });

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
          <h1 className="text-2xl font-bold text-[#F0F0F5]">Kundengespräch-Insights</h1>
          <p className="text-sm text-[#aaa] mt-1">
            Validierte Schmerzpunkte aus echten Kundengesprächen - werden von Sales Agents für personalisierte Emails genutzt.
          </p>
        </div>
        <AddInsightForm onSuccess={loadInsights} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#F0F0F5]">{count}</div>
          <div className="text-xs text-[#888] mt-1">Insights gesamt</div>
        </div>
        {Object.entries(industryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([industry, cnt]) => {
            const isActive = filterIndustry === industry;
            return (
              <div
                key={industry}
                onClick={() => setFilterIndustry(isActive ? '' : industry)}
                className={`rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#2a1a15] border border-[#E8472A55]'
                    : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#1f1f1f]'
                }`}
              >
                <div className={`text-3xl font-bold ${isActive ? 'text-[#E8472A]' : 'text-[#F0F0F5]'}`}>{cnt}</div>
                <div className="text-xs text-[#888] mt-1 leading-tight">{industry.split(' / ')[0]}</div>
              </div>
            );
          })}
      </div>

      {/* Sector + sub-category chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {/* Sector chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'alle', label: 'Alle Branchen' },
            { key: 'immobilien', label: 'Immobilien' },
            { key: 'handwerk', label: 'Handwerk' },
            { key: 'bau', label: 'Bau' },
          ].map(sector => {
            const isActive = selectedSector === sector.key;
            return (
              <button
                key={sector.key}
                onClick={() => {
                  setSelectedSector(sector.key);
                  setSelectedSubCategory('alle');
                }}
                style={{
                  padding: '7px 14px',
                  background: isActive ? '#E8472A' : '#1a1a1a',
                  color: isActive ? '#fff' : '#aaa',
                  border: `1px solid ${isActive ? '#E8472A' : '#2a2a2a'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {sector.label}
              </button>
            );
          })}
        </div>

        {/* Sub-category chips - only shown when a specific sector is selected */}
        {selectedSector !== 'alle' && SUB_CATEGORIES[selectedSector] && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 4 }}>
            <button
              onClick={() => setSelectedSubCategory('alle')}
              style={{
                padding: '5px 10px',
                background: selectedSubCategory === 'alle' ? '#2a2a2a' : 'transparent',
                color: selectedSubCategory === 'alle' ? '#F0F0F5' : '#777',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Alle {selectedSector}
            </button>
            {SUB_CATEGORIES[selectedSector].map(sub => {
              const isActive = selectedSubCategory === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setSelectedSubCategory(sub.key)}
                  style={{
                    padding: '5px 10px',
                    background: isActive ? '#2a1a15' : 'transparent',
                    color: isActive ? '#E8472A' : '#777',
                    border: `1px solid ${isActive ? '#E8472A55' : '#2a2a2a'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legacy stat-card filter (still supported, shown as a badge when active) */}
      {filterIndustry && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-[#ccc]">Filter: {filterIndustry}</span>
          <button
            onClick={() => setFilterIndustry('')}
            className="text-xs text-[#E8472A] hover:underline"
          >
            Filter entfernen
          </button>
        </div>
      )}

      {/* Insights Liste */}
      {loading ? (
        <div className="text-center py-12 text-[#888]">Laden...</div>
      ) : parsedInsights.length === 0 ? (
        // Different empty state depending on whether it's "no insights at all" or "no match for filter"
        insights.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[#444] text-5xl mb-3">-</div>
            <p className="text-[#ccc] font-medium">Noch keine Insights erfasst</p>
            <p className="text-sm text-[#888] mt-1">
              Erfasse Schmerzpunkte aus Kundengesprächen um die Email-Personalisierung zu verbessern.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: '#666',
              background: '#1a1a1a',
              border: '1px dashed #2a2a2a',
              borderRadius: 10,
            }}
          >
            Keine Insights für diese Auswahl gefunden.
            <br />
            <span style={{ fontSize: 12, color: '#555' }}>
              Insights werden automatisch aus Kundengesprächen extrahiert.
            </span>
          </div>
        )
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
