'use client';

import { useState, useEffect } from 'react';

type UpdateCategory = 'pain_points' | 'new_customers' | 'market_updates' | 'agent_instructions' | 'general';
type UpdatePriority = 'high' | 'medium' | 'low';

interface StrategicUpdate {
  id: number;
  category: UpdateCategory;
  title: string;
  content: string;
  priority: UpdatePriority;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationState {
  type: 'success' | 'error' | null;
  message: string;
}

const categoryLabels: Record<UpdateCategory, string> = {
  pain_points: 'Kundenschmerzen',
  new_customers: 'Neue Kunden',
  market_updates: 'Markt-Updates',
  agent_instructions: 'Agenten-Anweisungen',
  general: 'Allgemein'
};

const priorityLabels: Record<UpdatePriority, string> = {
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig'
};

const priorityColors: Record<UpdatePriority, string> = {
  high: '#FF4757',
  medium: '#E8472A',
  low: '#FFA502'
};

export default function StrategicUpdatesPage() {
  const [updates, setUpdates] = useState<StrategicUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({ type: null, message: '' });

  const [formData, setFormData] = useState({
    category: 'general' as UpdateCategory,
    title: '',
    content: '',
    priority: 'medium' as UpdatePriority,
    expires_at: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchUpdates(); }, []);

  useEffect(() => {
    if (notification.type) {
      const timer = setTimeout(() => setNotification({ type: null, message: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/strategic-updates');
      if (!response.ok) throw new Error('Failed');
      const { data } = await response.json();
      setUpdates(data || []);
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Fehler beim Abrufen der Updates');
    } finally { setLoading(false); }
  };

  const showNotification = (type: 'success' | 'error', message: string) => setNotification({ type, message });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showNotification('error', 'Titel und Inhalt sind erforderlich');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { ...formData, active: true };
      if (!payload.expires_at) delete (payload as any).expires_at;
      const response = await fetch('/api/strategic-updates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed');
      const { data } = await response.json();
      setUpdates([data, ...updates]);
      setFormData({ category: 'general', title: '', content: '', priority: 'medium', expires_at: '' });
      showNotification('success', 'Update erfolgreich erstellt');
    } catch (error) {
      showNotification('error', 'Fehler beim Erstellen des Updates');
    } finally { setIsSubmitting(false); }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const response = await fetch('/api/strategic-updates', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive })
      });
      if (!response.ok) throw new Error('Failed');
      const { data } = await response.json();
      setUpdates(updates.map(u => u.id === id ? data : u));
      showNotification('success', 'Status aktualisiert');
    } catch (error) {
      showNotification('error', 'Fehler beim Aktualisieren');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Update wirklich loeschen?')) return;
    try {
      const response = await fetch('/api/strategic-updates?id=' + id, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      setUpdates(updates.filter(u => u.id !== id));
      showNotification('success', 'Update geloescht');
    } catch (error) {
      showNotification('error', 'Fehler beim Loeschen');
    }
  };

  const groupedUpdates = updates.reduce((acc, update) => {
    if (!acc[update.category]) acc[update.category] = [];
    acc[update.category].push(update);
    return acc;
  }, {} as Record<UpdateCategory, StrategicUpdate[]>);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getContentPreview = (content: string, maxLength: number = 120) => content.length > maxLength ? content.substring(0, maxLength) + '...' : content;

  const s = { input: { width: '100%', padding: '8px 12px', backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' as const }, label: { display: 'block' as const, fontSize: '12px', fontWeight: '600', color: '#aaa', marginBottom: '6px' } };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0', color: '#fff' }}>Strategische Updates</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>Verwalten Sie woechentliche Updates fuer KI-Agenten</p>
        </div>

        {notification.type && (
          <div style={{ marginBottom: '24px', padding: '12px 16px', borderRadius: '8px', backgroundColor: notification.type === 'success' ? '#1a4d2e' : '#4d1a1a', borderLeft: '4px solid ' + (notification.type === 'success' ? '#2ecc71' : '#e74c3c'), color: notification.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
            {notification.message}
          </div>
        )}

        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0', color: '#fff' }}>Neues Update hinzufuegen</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={s.label}>Kategorie</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as UpdateCategory })} style={{ ...s.input, cursor: 'pointer' }}>
                  {Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Prioritaet</label>
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as UpdatePriority })} style={{ ...s.input, cursor: 'pointer' }}>
                  {Object.entries(priorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>Titel</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="z.B. Neue Vertriebsstrategie" style={s.input} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>Inhalt</label>
              <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Geben Sie das Update ein..." rows={6} style={{ ...s.input, resize: 'vertical' as const }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={s.label}>Ablaufdatum (optional)</label>
              <input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} style={s.input} />
            </div>
            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '10px 16px', backgroundColor: '#E8472A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
              {isSubmitting ? 'Wird erstellt...' : 'Update erstellen'}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0', color: '#fff' }}>Alle Updates</h2>
          {loading ? <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>Lädt Updates...</div> : updates.length === 0 ? <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #1E1E1E' }}>Keine Updates vorhanden. Erstellen Sie Ihr erstes Update oben.</div> : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {Object.entries(groupedUpdates).map(([category, categoryUpdates]) => (
                <div key={category}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E' }}>{categoryLabels[category as UpdateCategory]}</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {categoryUpdates.map((update) => (
                      <div key={update.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid ' + (update.active ? '#2a2a2a' : '#1E1E1E'), borderRadius: '8px', padding: '16px', opacity: update.active ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#fff' }}>{update.title}</h4>
                              <span style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: priorityColors[update.priority], color: '#fff', fontSize: '11px', fontWeight: '600', borderRadius: '4px' }}>{priorityLabels[update.priority]}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 8px 0' }}>{getContentPreview(update.content)}</p>
                            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>erstellt: {formatDate(update.created_at)}{update.expires_at && <> | verfaellt: {formatDate(update.expires_at)}</>}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                            <button onClick={() => handleToggleActive(update.id, update.active)} style={{ padding: '6px 12px', backgroundColor: update.active ? '#1a5f3f' : '#4d3a1a', color: update.active ? '#2ecc71' : '#FFA502', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{update.active ? 'Aktiv' : 'Inaktiv'}</button>
                            <button onClick={() => handleDelete(update.id)} style={{ padding: '6px 12px', backgroundColor: '#4d1a1a', color: '#e74c3c', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Loeschen</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
