'use client';

import { useEffect, useState } from 'react';

interface Item {
  id: number;
  gmail_id: string;
  from_email: string;
  subject: string;
  received_at: string;
  category: string;
  priority: string;
  summary: string;
  draft_reply: string | null;
  requires_action: boolean;
}

const CATEGORIES = ['all', 'customer-inquiry', 'partner', 'admin', 'marketing-tool', 'spam-ish', 'personal'];

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState('all');
  const [onlyAction, setOnlyAction] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (onlyAction) params.set('requiresAction', 'true');
    fetch(`/api/email-inbox?${params}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [category, onlyAction]);

  const markDone = async (id: number) => {
    await fetch('/api/email-inbox', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, requiresAction: false }),
    });
    load();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Email Inbox</h1>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded text-sm ${category === c ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {c}
          </button>
        ))}
        <label className="ml-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyAction} onChange={(e) => setOnlyAction(e.target.checked)} />
          Nur mit Action
        </label>
      </div>

      {loading ? (
        <p>Lade...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Keine Emails.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="border rounded p-3 bg-white">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs bg-gray-100 px-2 rounded">{i.category}</span>
                    <span className={`text-xs px-2 rounded ${i.priority === 'urgent' ? 'bg-red-100 text-red-700' : i.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`}>
                      {i.priority}
                    </span>
                    <span className="text-gray-500 text-xs">{new Date(i.received_at).toLocaleString('de-DE')}</span>
                  </div>
                  <h3 className="font-semibold mt-1">{i.subject}</h3>
                  <p className="text-xs text-gray-600">{i.from_email}</p>
                  <p className="text-sm mt-2">{i.summary}</p>
                  {i.draft_reply && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-700 cursor-pointer">Draft-Reply ansehen</summary>
                      <pre className="mt-2 whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">{i.draft_reply}</pre>
                    </details>
                  )}
                </div>
                {i.requires_action && (
                  <button onClick={() => markDone(i.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                    Done
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
