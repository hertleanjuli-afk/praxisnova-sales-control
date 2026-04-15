'use client';

import { useEffect, useState } from 'react';

interface Contact {
  id: number;
  outlet_name: string;
  outlet_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  industries: string[];
  last_contacted: string | null;
  status: string;
}

const STATUS_FILTERS = ['all', 'cold', 'warm', 'contacted', 'responded', 'published'];

export default function PrPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const qs = status === 'all' ? '' : `?status=${status}`;
    fetch(`/api/press-contacts${qs}`)
      .then((r) => r.json())
      .then((j) => setContacts(j.contacts ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const updateStatus = async (id: number, newStatus: string) => {
    await fetch('/api/press-contacts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    load();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">PR-Kontakte</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded text-sm ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Lade...</p>
      ) : contacts.length === 0 ? (
        <p className="text-gray-500">Keine Kontakte in diesem Status.</p>
      ) : (
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Outlet</th>
              <th className="p-2 text-left">Kontakt</th>
              <th className="p-2 text-left">Branchen</th>
              <th className="p-2 text-left">Letzter Kontakt</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">
                  <div className="font-semibold">{c.outlet_name}</div>
                  {c.outlet_type && <div className="text-xs text-gray-500">{c.outlet_type}</div>}
                </td>
                <td className="p-2">
                  {c.contact_name && <div>{c.contact_name}</div>}
                  {c.contact_email && <div className="text-xs text-gray-500">{c.contact_email}</div>}
                </td>
                <td className="p-2 text-xs">{c.industries.join(', ')}</td>
                <td className="p-2 text-xs">
                  {c.last_contacted ? new Date(c.last_contacted).toLocaleDateString('de-DE') : 'nie'}
                </td>
                <td className="p-2">
                  <select
                    value={c.status}
                    onChange={(e) => updateStatus(c.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {STATUS_FILTERS.filter((s) => s !== 'all').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
