'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const tiktokEnabled = process.env.NEXT_PUBLIC_TIKTOK_MODULE_ENABLED === 'true';

interface NavGroup { title: string; items: { label: string; href: string; emoji: string; tiktokOnly?: boolean; badgeKey?: string }[] }

const navGroups: NavGroup[] = [
  {
    title: 'Übersicht',
    items: [
      { label: 'Dashboard', href: '/', emoji: '📊' },
      { label: 'Agenten', href: '/agents', emoji: '🤖' },
    ],
  },
  {
    title: 'Leads & Kontakte',
    items: [
      { label: 'Lead-Suche', href: '/leads', emoji: '🔍' },
      { label: 'Eingehende Leads', href: '/inbound', emoji: '📥' },
      { label: 'Sequenzen', href: '/sequences', emoji: '👥' },
      { label: 'Anrufliste', href: '/anrufliste', emoji: '📞' },
      { label: 'Kunden-Insights', href: '/customer-insights', emoji: '💡' },
      { label: 'Strategische Updates', href: '/agent-updates', emoji: '🎯' },
      { label: 'LinkedIn', href: '/linkedin', emoji: '🔗' },
      { label: 'LinkedIn Warteschlange', href: '/linkedin-queue', emoji: '💬', badgeKey: 'linkedinQueue' },
    ],
  },
  {
    title: 'Tracking',
    items: [
      { label: 'Website-Klicks', href: '/website-clicks', emoji: '🌐' },
      { label: 'Email-Tracking', href: '/email-tracking', emoji: '📧' },
      { label: 'Analytics', href: '/analytics', emoji: '📈' },
    ],
  },
  {
    title: 'Verwaltung',
    items: [
      { label: 'Agent-Metriken', href: '/agent-metrics', emoji: '🤖' },
      { label: 'Berichte', href: '/reports', emoji: '📋' },
      { label: 'Change Log', href: '/changelog', emoji: '📝' },
      { label: 'Abmeldungen', href: '/unsubscribes', emoji: '🚫' },
      { label: 'Fehler-Log', href: '/errors', emoji: '⚠️' },
      { label: 'Einstellungen', href: '/settings', emoji: '⚙️' },
      { label: 'TikTok / Ads', href: '/ads', emoji: '📣', tiktokOnly: true },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/agents': 'Agenten',
  '/leads': 'Lead-Suche',
  '/sequences': 'Sequenzen',
  '/anrufliste': 'Anrufliste',
  '/customer-insights': 'Kunden-Insights',
  '/agent-updates': 'Strategische Updates',
  '/inbound': 'Eingehende Leads',
  '/linkedin': 'LinkedIn',
  '/website-clicks': 'Website-Klicks',
  '/email-tracking': 'Email-Tracking',
  '/unsubscribes': 'Abmeldungen',
  '/analytics': 'Analytics',
  '/changelog': 'Change Log',
  '/linkedin-queue': 'LinkedIn Warteschlange',
  '/agent-metrics': 'Agent-Metriken',
  '/reports': 'Berichte',
  '/errors': 'Fehler-Log',
  '/settings': 'Einstellungen',
  '/ads': 'TikTok / Ads',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/linkedin/queue?status=ready')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setBadges(prev => ({ ...prev, linkedinQueue: d.count ?? 0 })))
      .catch(() => {});
  }, [status]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1E1E1E', borderTopColor: '#E8472A', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: '#888' }}>Laden...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  const pageTitle = PAGE_TITLES[pathname] ?? 'PraxisNova';
  const userName = session?.user?.name ?? session?.user?.email ?? 'Benutzer';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0A0A0A' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: '#0A0A0A', borderRight: '1px solid #1E1E1E', display: 'flex', flexDirection: 'column', zIndex: 30, overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1E1E1E' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#E8472A' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F5', letterSpacing: '-0.3px' }}>PraxisNova AI</span>
          </div>
          <p style={{ fontSize: 12, color: '#888', marginTop: 4, marginLeft: 20 }}>Sales Control Center</p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => !item.tiktokOnly || tiktokEnabled);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                  {group.title}
                </p>
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 2,
                        transition: 'background 0.15s',
                        background: isActive ? 'rgba(232,71,42,0.15)' : 'transparent',
                        color: isActive ? '#F0F0F5' : '#888',
                        borderLeft: isActive ? '3px solid #E8472A' : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#1A1A1A'; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.emoji}</span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badgeKey && badges[item.badgeKey] > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#E8472A', color: 'white', borderRadius: 10, padding: '2px 6px', minWidth: 18, textAlign: 'center' }}>
                          {badges[item.badgeKey]}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1E1E1E' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#888' }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#E8472A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top Header */}
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#0A0A0A', borderBottom: '1px solid #1E1E1E', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#F0F0F5', margin: 0 }}>{pageTitle}</h2>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: 24, color: '#F0F0F5' }}>{children}</main>
      </div>
    </div>
  );
}
