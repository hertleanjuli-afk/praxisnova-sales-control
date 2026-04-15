'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  id: number;
  url: string;
  title: string;
  source: string;
  published_at: string | null;
  summary: string;
  industries: string[];
  relevance_score: number;
  used_in_content: boolean;
  created_at: string;
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [minScore, setMinScore] = useState(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/news-items?minScore=${minScore}&limit=100`)
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .finally(() => setLoading(false));
  }, [minScore]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">News Scout</h1>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm">Min Score:</label>
        <input
          type="range"
          min={0}
          max={100}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-64"
        />
        <span className="font-mono text-sm">{minScore}</span>
        <span className="ml-auto text-sm text-gray-500">{items.length} items</span>
      </div>

      {loading ? (
        <p>Lade...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Keine News mit Score &gt;= {minScore}. Nachfassen wenn News Scout laeuft (06:00 UTC).</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border rounded p-3 bg-white">
              <div className="flex justify-between gap-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {item.title}
                </a>
                <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded h-6">
                  {item.relevance_score}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{item.summary}</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-gray-500">{item.source}</span>
                {item.industries.map((i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 px-2 rounded">
                    {i}
                  </span>
                ))}
                {item.used_in_content && (
                  <span className="bg-green-50 text-green-700 px-2 rounded">used</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
