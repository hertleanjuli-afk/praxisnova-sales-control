'use client';

import { useEffect, useState } from 'react';

interface Draft {
  id: number;
  platform: string;
  content_type: string | null;
  headline: string | null;
  body: string;
  hashtags: string[] | null;
  source_news_ids: number[] | null;
  status: string;
  created_at: string;
}

type Filter = 'pending_review' | 'approved' | 'rejected' | 'published';

export default function ContentPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<Filter>('pending_review');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/content-drafts?status=${filter}`)
      .then((r) => r.json())
      .then((j) => setDrafts(j.drafts ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    setBusy(id);
    await fetch('/api/content-drafts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    setBusy(null);
    load();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Content Drafts</h1>
      <div className="flex gap-2 mb-4">
        {(['pending_review', 'approved', 'rejected', 'published'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Lade...</p>
      ) : drafts.length === 0 ? (
        <p className="text-gray-500">Keine Drafts in Status &quot;{filter}&quot;.</p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((d) => (
            <li key={d.id} className="border rounded p-3 bg-white">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="uppercase text-xs font-mono bg-gray-100 px-2 rounded mr-2">
                    {d.platform}
                  </span>
                  {d.content_type && (
                    <span className="text-xs text-gray-500">{d.content_type}</span>
                  )}
                </div>
                {filter === 'pending_review' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(d.id, 'approve')}
                      disabled={busy === d.id}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(d.id, 'reject')}
                      disabled={busy === d.id}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
              {d.headline && <h3 className="font-semibold mb-1">{d.headline}</h3>}
              <p className="whitespace-pre-wrap text-sm">{d.body}</p>
              {d.hashtags && d.hashtags.length > 0 && (
                <div className="mt-2 text-xs text-blue-600">{d.hashtags.join(' ')}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
