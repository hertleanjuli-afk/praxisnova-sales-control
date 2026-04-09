'use client';

import { useState, useCallback, useEffect } from 'react';

const CORAL = '#E8472A';
const GOLD = '#F59E0B';
const SILVER = '#A1A1A1';
const BRONZE = '#B87333';

const SECTOR_LABELS: Record<string, string> = {
  immobilien: 'Immobilien', handwerk: 'Handwerk', bauunternehmen: 'Bau', allgemein: 'Allgemein',
};
const SECTOR_COLORS: Record<string, string> = {
  immobilien: '#E8472A', handwerk: '#3B82F6', bauunternehmen: '#22C55E', allgemein: '#8B5CF6',
};

const TIER_LABELS: Record<string, string> = {
  '1': 'Top', '2': 'Mittel', '3': 'Langfristig',
};

const TIER_COLORS: Record<string, string> = {
  '1': GOLD, '2': SILVER, '3': BRONZE,
};

interface Lead {
  id: string; first_name: string; last_name: string; email: string; company: string;
  title: string; industry: string; employee_count: number | null; linkedin_url: string;
  status: string; cooldown_days?: number;
}

interface Partner {
  id: string;
  company_name: string;
  website: string;
  contact_name: string;
  contact_title: string;
  category: string;
  tier: '1' | '2' | '3';
  notes: string;
  status: 'identified' | 'contacted' | 'partner' | 'rejected';
  linkedin_url: string;
  date_added: string;
}

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<'prospects' | 'partner'>('prospects');

  // Prospects state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sector, setSector] = useState('immobilien');
  const [state, setState] = useState('');
  const [limit, setLimit] = useState(25);

  // Partners state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerTierFilter, setPartnerTierFilter] = useState<'alle' | '1' | '2' | '3'>('alle');
  const [partnerCategoryFilter, setPartnerCategoryFilter] = useState('');
  const [partnersLoaded, setPartnersLoaded] = useState(false);

  // Load partners when Partner tab is selected
  useEffect(() => {
    if (activeTab === 'partner' && !partnersLoaded) {
      loadPartners();
    }
  }, [activeTab, partnersLoaded]);

  const loadPartners = async () => {
    setPartnersLoading(true);
    try {
      const res = await fetch('/api/partners');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPartners(data.partners || []);
      setPartnersLoaded(true);
    } catch {
      setNotification({ type: 'error', message: 'Partner-Daten konnten nicht geladen werden.' });
    }
    setPartnersLoading(false);
  };

  const handleSearch = useCallback(async () => {
    setLoading(true); setSelectedIds(new Set()); setNotification(null);
    try {
      const params = new URLSearchParams({ sector, limit: String(limit) });
      if (state) params.set('state', state);
      const res = await fetch(`/api/leads/search?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeads(data.leads || []);
      setSearched(true);
    } catch { setNotification({ type: 'error', message: 'Suche fehlgeschlagen.' }); }
    setLoading(false);
  }, [sector, state, limit]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.filter(l => l.status === 'new').length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.filter(l => l.status === 'new').map(l => l.id)));
    }
  };

  const handleEnroll = async () => {
    if (selectedIds.size === 0) return;
    setEnrolling(true); setNotification(null);
    try {
      const res = await fetch('/api/leads/enroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), sector }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotification({ type: 'success', message: `${data.enrolled || selectedIds.size} Leads eingeschrieben.` });
      setSelectedIds(new Set());
      handleSearch();
    } catch { setNotification({ type: 'error', message: 'Einschreibung fehlgeschlagen.' }); }
    setEnrolling(false);
  };

  const newLeads = leads.filter(l => l.status === 'new');

  // Filter partners
  const filteredPartners = partners.filter(p => {
    const tierMatch = partnerTierFilter === 'alle' || p.tier === partnerTierFilter;
    const categoryMatch = !partnerCategoryFilter || p.category === partnerCategoryFilter;
    return tierMatch && categoryMatch;
  });

  const uniqueCategories = Array.from(new Set(partners.map(p => p.category))).filter(Boolean).sort();

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'identified': return '#3B82F6';
      case 'contacted': return '#F59E0B';
      case 'partner': return '#22C55E';
      case 'rejected': return '#EF4444';
      default: return '#555';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'identified': return 'Identifiziert';
      case 'contacted': return 'Kontaktiert';
      case 'partner': return 'Partner';
      case 'rejected': return 'Abgelehnt';
      default: return status;
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #1E1E1E' }}>
        <button
          onClick={() => setActiveTab('prospects')}
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: activeTab === 'prospects' ? CORAL : '#888',
            borderBottom: activeTab === 'prospects' ? `3px solid ${CORAL}` : 'none',
            marginBottom: -2,
            transition: 'color 0.2s',
          }}
        >
          Prospects
        </button>
        <button
          onClick={() => setActiveTab('partner')}
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: activeTab === 'partner' ? CORAL : '#888',
            borderBottom: activeTab === 'partner' ? `3px solid ${CORAL}` : 'none',
            marginBottom: -2,
            transition: 'color 0.2s',
          }}
        >
          Partner
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 13,
          background: notification.type === 'success' ? '#22C55E20' : '#EF444420',
          color: notification.type === 'success' ? '#22C55E' : '#EF4444',
          border: `1px solid ${notification.type === 'success' ? '#22C55E40' : '#EF444440'}` }}>
          {notification.message}
        </div>
      )}

      {/* PROSPECTS TAB */}
      {activeTab === 'prospects' && (
        <>
          {/* Search Form */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>Branche</label>
                <select value={sector} onChange={e => setSector(e.target.value)}
                  style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#ccc', minWidth: 160 }}>
                  {Object.entries(SECTOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>Bundesland</label>
                <select value={state} onChange={e => setState(e.target.value)}
                  style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#ccc', minWidth: 160 }}>
                  <option value="">Alle</option>
                  {['Baden-Württemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen','Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thüringen'].map(s =>
                    <option key={s} value={s}>{s}</option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>Anzahl</label>
                <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                  style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#ccc' }}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button onClick={handleSearch} disabled={loading}
                style={{ padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: CORAL, color: '#fff', opacity: loading ? 0.5 : 1 }}>
                {loading ? 'Suche...' : '🔍 Suchen'}
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, padding: '10px 16px', background: `${CORAL}15`, border: `1px solid ${CORAL}30`, borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: CORAL, fontWeight: 600 }}>{selectedIds.size} ausgewählt</span>
              <button onClick={handleEnroll} disabled={enrolling}
                style={{ padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: CORAL, color: '#fff' }}>
                {enrolling ? 'Schreibe ein...' : `▶️ ${selectedIds.size} einschreiben (${SECTOR_LABELS[sector]})`}
              </button>
            </div>
          )}

          {/* Results Table */}
          {searched && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
              {leads.length === 0 ? (
                <p style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 14 }}>Keine Leads gefunden.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                        <th style={{ padding: '10px 14px', width: 40 }}>
                          <input type="checkbox" checked={selectedIds.size === newLeads.length && newLeads.length > 0}
                            onChange={toggleAll} style={{ accentColor: CORAL }} />
                        </th>
                        {['Name', 'Firma', 'Titel', 'Branche', 'MA', 'LinkedIn', 'Status', 'Aktion'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map(lead => {
                        const isNew = lead.status === 'new';
                        const statusColor = isNew ? '#22C55E' : lead.status === 'cooldown' ? '#EAB308' : '#555';
                        const statusLabel = isNew ? 'Neu' : lead.status === 'cooldown' ? `Cooldown (${lead.cooldown_days}T)` : lead.status === 'active' ? 'Aktiv' : lead.status;
                        return (
                          <tr key={lead.id} style={{ borderBottom: '1px solid #1E1E1E' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#1A1A1A'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '10px 14px' }}>
                              {isNew && <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} style={{ accentColor: CORAL }} />}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#F0F0F5' }}>{lead.first_name} {lead.last_name}</td>
                            <td style={{ padding: '10px 14px', color: '#ccc' }}>{lead.company || '–'}</td>
                            <td style={{ padding: '10px 14px', color: '#888', fontSize: 12 }}>{lead.title || '–'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${SECTOR_COLORS[lead.industry] || '#555'}20`, color: SECTOR_COLORS[lead.industry] || '#888', fontWeight: 600 }}>
                                {SECTOR_LABELS[lead.industry] || lead.industry || '–'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#888', fontSize: 12 }}>{lead.employee_count || '–'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              {lead.linkedin_url ? <a href={lead.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#3B82F6', textDecoration: 'none' }}>🔗 Profil</a> : <span style={{ color: '#555' }}>–</span>}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${statusColor}20`, color: statusColor, fontWeight: 600 }}>
                                {statusLabel}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {isNew && (
                                <button onClick={() => { setSelectedIds(new Set([lead.id])); handleEnroll(); }}
                                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: `${CORAL}20`, color: CORAL, fontWeight: 600 }}>
                                  ▶️ Einschreiben
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!searched && (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#555' }}>Branche und Bundesland auswählen, dann suchen.</p>
            </div>
          )}
        </>
      )}

      {/* PARTNER TAB */}
      {activeTab === 'partner' && (
        <>
          {/* Filters */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 8 }}>Tier</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['alle', '1', '2', '3'].map(tier => (
                    <button
                      key={tier}
                      onClick={() => setPartnerTierFilter(tier as 'alle' | '1' | '2' | '3')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `2px solid ${partnerTierFilter === tier ? CORAL : '#1E1E1E'}`,
                        background: partnerTierFilter === tier ? `${CORAL}15` : '#0A0A0A',
                        color: partnerTierFilter === tier ? CORAL : '#888',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {tier === 'alle' ? 'Alle' : TIER_LABELS[tier]}
                    </button>
                  ))}
                </div>
              </div>
              {uniqueCategories.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>Kategorie</label>
                  <select value={partnerCategoryFilter} onChange={e => setPartnerCategoryFilter(e.target.value)}
                    style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#ccc', minWidth: 180 }}>
                    <option value="">Alle Kategorien</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Partners Grid */}
          {partnersLoading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#555' }}>Lade Partner...</p>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#555' }}>Keine Partner gefunden.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {filteredPartners.map(partner => (
                <div
                  key={partner.id}
                  style={{
                    background: '#111',
                    border: '1px solid #1E1E1E',
                    borderRadius: 12,
                    padding: 20,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = CORAL;
                    e.currentTarget.style.boxShadow = `0 0 20px ${CORAL}20`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#1E1E1E';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Header with Tier Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F0F0F5', marginBottom: 4 }}>
                        {partner.company_name}
                      </h3>
                      {partner.website && (
                        <a href={partner.website} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: '#3B82F6', textDecoration: 'none' }}>
                          🔗 Website
                        </a>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10,
                      padding: '4px 10px',
                      borderRadius: 4,
                      background: `${TIER_COLORS[partner.tier]}20`,
                      color: TIER_COLORS[partner.tier],
                      fontWeight: 700,
                      marginLeft: 8,
                      whiteSpace: 'nowrap',
                    }}>
                      {TIER_LABELS[partner.tier]}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #1E1E1E' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#ccc', marginBottom: 4 }}>
                      <strong>{partner.contact_name}</strong>
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
                      {partner.contact_title}
                    </p>
                  </div>

                  {/* Category */}
                  {partner.category && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: '#3B82F620',
                        color: '#3B82F6',
                        fontWeight: 600,
                      }}>
                        {partner.category}
                      </span>
                    </div>
                  )}

                  {/* Notes/Partnership Info */}
                  {partner.notes && (
                    <p style={{ margin: 0, fontSize: 12, color: '#999', marginBottom: 12, lineHeight: 1.5 }}>
                      {partner.notes}
                    </p>
                  )}

                  {/* Status Badge and LinkedIn */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #1E1E1E' }}>
                    <span style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: `${getStatusBadgeColor(partner.status)}20`,
                      color: getStatusBadgeColor(partner.status),
                      fontWeight: 600,
                    }}>
                      {getStatusLabel(partner.status)}
                    </span>
                    {partner.linkedin_url && (
                      <a href={partner.linkedin_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>
                        LinkedIn
                      </a>
                    )}
                  </div>

                  {/* Date Added */}
                  {partner.date_added && (
                    <p style={{ margin: 0, marginTop: 8, fontSize: 10, color: '#555' }}>
                      Hinzugefügt: {new Date(partner.date_added).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
