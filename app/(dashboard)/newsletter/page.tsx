'use client';

import { useEffect, useState } from 'react';

interface Newsletter {
  id: number;
  issue_month: string;
  subject: string;
  html_body: string;
  included_news_ids: number[] | null;
  included_content_ids: number[] | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

const STATUS_FILTERS = ['all', 'draft', 'approved', 'rejected', 'sent'];

export default function NewsletterPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    const qs = status === 'all' ? '' : `?status=${status}`;
    fetch(`/api/newsletters${qs}`)
      .then((r) => r.json())
      .then((j) => setNewsletters(j.newsletters ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const act = async (id: number, newStatus: 'approved' | 'rejected' | 'sent') => {
    await fetch('/api/newsletters', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    load();
  };

  const preview = newsletters.find((n) => n.id === selected);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Newsletter</h1>
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
      ) : newsletters.length === 0 ? (
        <p className="text-gray-500">Keine Newsletter in diesem Status.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ul className="space-y-2">
            {newsletters.map((n) => (
              <li
                key={n.id}
                onClick={() => setSelected(n.id)}
                className={`border rounded p-3 cursor-pointer ${selected === n.id ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-500">{n.issue_month}</div>
                    <div className="font-semibold">{n.subject}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      status: {n.status} {n.sent_at && `- sent ${new Date(n.sent_at).toLocaleDateString('de-DE')}`}
                    </div>
                  </div>
                </div>
                {n.status === 'draft' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        act(n.id, 'approved');
                      }}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        act(n.id, 'rejected');
                      }}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {n.status === 'approved' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Als gesendet markieren? (kein Auto-Send)')) act(n.id, 'sent');
                    }}
                    className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded"
                  >
                    Als gesendet markieren
                  </button>
                )}
              </li>
            ))}
          </ul>
          {preview && (
            <div className="border rounded bg-white p-3 overflow-auto max-h-[80vh]">
              <h3 className="font-semibold mb-2">Preview</h3>
              <iframe
                title="newsletter preview"
                srcDoc={preview.html_body}
                className="w-full h-[70vh] border"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
