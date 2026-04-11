'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type SearchResult = {
  type: 'lead' | 'update' | 'log' | 'email' | 'news';
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  icon: string;
};

const ICONS: Record<string, string> = {
  person: '👤',
  update: '📊',
  log: '⚙️',
  email: '✉️',
  news: '📰',
};

const TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  update: 'Markt',
  log: 'Agent',
  email: 'E-Mail',
  news: 'News',
};

const TYPE_COLORS: Record<string, string> = {
  lead: '#E8472A',
  update: '#3b82f6',
  log: '#f59e0b',
  email: '#8b5cf6',
  news: '#22c55e',
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function navigate(result: SearchResult) {
    router.push(result.href);
    setQuery('');
    setOpen(false);
    setResults([]);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        navigate(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function handleGlobal(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener('keydown', handleGlobal);
    return () => document.removeEventListener('keydown', handleGlobal);
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#1a1a1a',
          border: `1px solid ${open ? '#E8472A55' : '#2a2a2a'}`,
          borderRadius: 10,
          padding: '0 12px',
          gap: 8,
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ color: '#555', fontSize: 14, flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
          placeholder="Suche nach Leads, E-Mails, Agenten... (Cmd+K)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#F0F0F5',
            fontSize: 14,
            padding: '10px 0',
          }}
        />
        {loading && <span style={{ color: '#555', fontSize: 12, flexShrink: 0 }}>...</span>}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery('');
              setOpen(false);
              setResults([]);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: 16,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 6,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 1000,
            overflow: 'hidden',
            maxHeight: 480,
            overflowY: 'auto',
          }}
        >
          {results.map((result, i) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => navigate(result)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                cursor: 'pointer',
                background: i === selectedIndex ? '#2a2a2a' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid #222' : 'none',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{ICONS[result.icon] || '•'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: '#F0F0F5',
                    fontSize: 14,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {result.title}
                </div>
                {result.subtitle && (
                  <div
                    style={{
                      color: '#888',
                      fontSize: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {result.subtitle}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    background: `${TYPE_COLORS[result.type]}22`,
                    color: TYPE_COLORS[result.type],
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {TYPE_LABELS[result.type]}
                </span>
                {result.meta && <span style={{ color: '#555', fontSize: 11 }}>{result.meta}</span>}
              </div>
            </div>
          ))}

          {/* Footer hint */}
          <div style={{ padding: '8px 14px', background: '#111', display: 'flex', gap: 12 }}>
            <span style={{ color: '#444', fontSize: 11 }}>↑↓ Navigieren</span>
            <span style={{ color: '#444', fontSize: 11 }}>Enter Öffnen</span>
            <span style={{ color: '#444', fontSize: 11 }}>Esc Schließen</span>
          </div>
        </div>
      )}

      {/* No results */}
      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 6,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '20px 14px',
            textAlign: 'center',
            color: '#555',
            fontSize: 13,
            zIndex: 1000,
          }}
        >
          Keine Ergebnisse für &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
