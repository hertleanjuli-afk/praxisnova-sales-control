'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, Edit2, Loader, AlertCircle } from 'lucide-react';

// Types
interface Post {
  id: number;
  post_date: string;
  post_number: 1 | 2;
  posted: boolean;
  posted_at: string | null;
  posted_by: string | null;
  post_url: string | null;
  post_topic: string | null;
  post_type: string | null;
  notes: string | null;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

interface TodayStatus {
  post1: Post | null;
  post2: Post | null;
  complete: boolean;
}

interface WeekStats {
  posted_count: number;
  total_slots: number;
  current_week: number;
}

interface MonthStats {
  posted_count: number;
  days_posted: number;
  total_days: number;
}

interface ApiResponse {
  posts: Post[];
  today: TodayStatus;
  week_stats: WeekStats;
  month_stats: MonthStats;
}

// German locale utilities
const germanMonths = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const germanDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const formatDateGerman = (date: Date): string => {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(date);
};

const parseYearMonth = (dateString: string): [number, number] => {
  const [year, month] = dateString.split('-').map(Number);
  return [year, month];
};

const formatYearMonth = (year: number, month: number): string => {
  return `${year}-${String(month).padStart(2, '0')}`;
};

// Component
export default function LinkedInPostingTracker() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [today, setToday] = useState<TodayStatus>({ post1: null, post2: null, complete: false });
  const [weekStats, setWeekStats] = useState<WeekStats>({ posted_count: 0, total_slots: 0, current_week: 0 });
  const [monthStats, setMonthStats] = useState<MonthStats>({ posted_count: 0, days_posted: 0, total_days: 0 });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return formatYearMonth(now.getFullYear(), now.getMonth() + 1);
  });

  const [showFormPost1, setShowFormPost1] = useState(false);
  const [showFormPost2, setShowFormPost2] = useState(false);
  const [formData1, setFormData1] = useState({ post_type: 'Text', post_topic: '', posted_by: 'Anjuli', post_url: '', notes: '' });
  const [formData2, setFormData2] = useState({ post_type: 'Text', post_topic: '', posted_by: 'Anjuli', post_url: '', notes: '' });

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [engagementForm, setEngagementForm] = useState({ likes: 0, comments: 0, shares: 0, impressions: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postTypes = ['Text', 'Carousel', 'Video', 'Bild', 'Artikel', 'Poll'];

  // Fetch data
  const fetchData = useCallback(async (monthStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/linkedin-posting?month=${monthStr}`);
      if (!response.ok) throw new Error('Fehler beim Abrufen der Daten');
      const data: ApiResponse = await response.json();
      setPosts(data.posts);
      setToday(data.today);
      setWeekStats(data.week_stats);
      setMonthStats(data.month_stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler aufgetreten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth, fetchData]);

  // Submit post
  const submitPost = async (postNumber: 1 | 2) => {
    const formData = postNumber === 1 ? formData1 : formData2;
    const today_date = new Date().toISOString().split('T')[0];

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/linkedin-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_date: today_date,
          post_number: postNumber,
          posted: true,
          post_type: formData.post_type,
          post_topic: formData.post_topic,
          posted_by: formData.posted_by,
          post_url: formData.post_url || undefined,
          notes: formData.notes || undefined
        })
      });

      if (!response.ok) throw new Error('Fehler beim Speichern');

      if (postNumber === 1) {
        setShowFormPost1(false);
        setFormData1({ post_type: 'Text', post_topic: '', posted_by: 'Anjuli', post_url: '', notes: '' });
      } else {
        setShowFormPost2(false);
        setFormData2({ post_type: 'Text', post_topic: '', posted_by: 'Anjuli', post_url: '', notes: '' });
      }

      await fetchData(selectedMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Update engagement
  const updateEngagement = async () => {
    if (!editingPost) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/linkedin-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: editingPost.id,
          likes: engagementForm.likes,
          comments: engagementForm.comments,
          shares: engagementForm.shares,
          impressions: engagementForm.impressions
        })
      });

      if (!response.ok) throw new Error('Fehler beim Speichern');

      setEditingPost(null);
      await fetchData(selectedMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Calculate streak
  const calculateStreak = (): number => {
    if (posts.length === 0) return 0;
    const sortedPosts = [...posts].sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayPosts = sortedPosts.filter(p => p.post_date === dateStr);

      if (dayPosts.length === 2 && dayPosts.every(p => p.posted)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Calendar generation
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

    const days = [];
    const current = new Date(startDate);

    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getDayStatus = (dateStr: string) => {
    const dayPosts = posts.filter(p => p.post_date === dateStr);
    const post1 = dayPosts.find(p => p.post_number === 1);
    const post2 = dayPosts.find(p => p.post_number === 2);

    return {
      post1Posted: post1?.posted || false,
      post2Posted: post2?.posted || false,
      bothPosted: (post1?.posted || false) && (post2?.posted || false)
    };
  };

  const [calendarYear, calendarMonth] = parseYearMonth(selectedMonth);
  const calendarDays = generateCalendarDays(calendarYear, calendarMonth);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#111] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">LinkedIn Posting Tracker</h1>
          <p className="text-gray-400">2 Posts pro Tag - täglich abhaken</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className={`bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4 text-center ${today.complete ? 'border-green-600' : today.post1?.posted ? 'border-yellow-600' : 'border-red-600'}`}>
            <p className="text-gray-400 text-sm mb-2">Heute</p>
            <p className={`text-3xl font-bold ${today.complete ? 'text-green-400' : today.post1?.posted ? 'text-yellow-400' : 'text-red-400'}`}>
              {(today.post1?.posted ? 1 : 0) + (today.post2?.posted ? 1 : 0)}/2
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-2">Diese Woche</p>
            <p className="text-3xl font-bold text-white">{weekStats.posted_count}/{weekStats.total_slots}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-2">Dieser Monat</p>
            <p className="text-3xl font-bold text-white">{monthStats.days_posted}/{monthStats.total_days}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-2">Streak</p>
            <p className="text-3xl font-bold text-[#E8472A]">{calculateStreak()}</p>
          </div>
        </div>

        {/* Today Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            Heute - {formatDateGerman(new Date())}
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Post 1 Card */}
            <div className={`rounded-lg p-6 border ${today.post1?.posted ? 'bg-green-900/10 border-green-600' : 'bg-[#1a1a1a] border-[#1E1E1E]'}`}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold">Post 1</h3>
                {today.post1?.posted && <Check className="w-6 h-6 text-green-400" />}
              </div>

              {today.post1?.posted ? (
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <span className="text-gray-500">Gepostet um:</span> {today.post1.posted_at?.split('T')[1].slice(0, 5) || '-'}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Von:</span> {today.post1.posted_by || '-'}
                  </p>
                  {today.post1.post_topic && (
                    <p className="text-gray-300">
                      <span className="text-gray-500">Thema:</span> {today.post1.post_topic}
                    </p>
                  )}
                  {today.post1.post_type && (
                    <p className="text-gray-300">
                      <span className="text-gray-500">Typ:</span> {today.post1.post_type}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-4">Noch nicht gepostet</p>

                  {!showFormPost1 ? (
                    <button
                      onClick={() => setShowFormPost1(true)}
                      className="w-full bg-[#E8472A] hover:bg-[#d93919] text-white font-semibold py-2 px-4 rounded-lg transition"
                      disabled={loading}
                    >
                      {loading ? 'Lädt...' : 'Abhaken'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={formData1.post_type}
                        onChange={(e) => setFormData1({ ...formData1, post_type: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      >
                        {postTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Worum geht es?"
                        value={formData1.post_topic}
                        onChange={(e) => setFormData1({ ...formData1, post_topic: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <input
                        type="text"
                        placeholder="Gepostet von"
                        value={formData1.posted_by}
                        onChange={(e) => setFormData1({ ...formData1, posted_by: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <input
                        type="url"
                        placeholder="Post URL (optional)"
                        value={formData1.post_url}
                        onChange={(e) => setFormData1({ ...formData1, post_url: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <input
                        type="text"
                        placeholder="Notizen (optional)"
                        value={formData1.notes}
                        onChange={(e) => setFormData1({ ...formData1, notes: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => submitPost(1)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
                          disabled={loading || !formData1.post_topic}
                        >
                          {loading ? 'Speichert...' : 'Als gepostet markieren'}
                        </button>
                        <button
                          onClick={() => setShowFormPost1(false)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition"
                          disabled={loading}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post 2 Card - Same structure */}
            <div className={`rounded-lg p-6 border ${today.post2?.posted ? 'bg-green-900/10 border-green-600' : 'bg-[#1a1a1a] border-[#1E1E1E]'}`}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold">Post 2</h3>
                {today.post2?.posted && <Check className="w-6 h-6 text-green-400" />}
              </div>

              {today.post2?.posted ? (
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <span className="text-gray-500">Gepostet um:</span> {today.post2.posted_at?.split('T')[1].slice(0, 5) || '-'}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Von:</span> {today.post2.posted_by || '-'}
                  </p>
                  {today.post2.post_topic && (
                    <p className="text-gray-300">
                      <span className="text-gray-500">Thema:</span> {today.post2.post_topic}
                    </p>
                  )}
                  {today.post2.post_type && (
                    <p className="text-gray-300">
                      <span className="text-gray-500">Typ:</span> {today.post2.post_type}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-4">Noch nicht gepostet</p>

                  {!showFormPost2 ? (
                    <button
                      onClick={() => setShowFormPost2(true)}
                      className="w-full bg-[#E8472A] hover:bg-[#d93919] text-white font-semibold py-2 px-4 rounded-lg transition"
                      disabled={loading}
                    >
                      {loading ? 'Lädt...' : 'Abhaken'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={formData2.post_type}
                        onChange={(e) => setFormData2({ ...formData2, post_type: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      >
                        {postTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Worum geht es?"
                        value={formData2.post_topic}
                        onChange={(e) => setFormData2({ ...formData2, post_topic: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <input
                        type="text"
                        placeholder="Gepostet von"
                        value={formData2.posted_by}
                        onChange={(e) => setFormData2({ ...formData2, posted_by: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <input
                        type="url"
                        placeholder="Post URL (optional)"
                        value={formData2.post_url}
                        onChange={(e) => setFormData2({ ...formData2, post_url: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <input
                        type="text"
                        placeholder="Notizen (optional)"
                        value={formData2.notes}
                        onChange={(e) => setFormData2({ ...formData2, notes: e.target.value })}
                        className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white text-sm"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => submitPost(2)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
                          disabled={loading || !formData2.post_topic}
                        >
                          {loading ? 'Speichert...' : 'Als gepostet markieren'}
                        </button>
                        <button
                          onClick={() => setShowFormPost2(false)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition"
                          disabled={loading}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="mb-8 bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {germanMonths[calendarMonth - 1]} {calendarYear}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  let m = calendarMonth - 1;
                  let y = calendarYear;
                  if (m < 1) { m = 12; y -= 1; }
                  setSelectedMonth(formatYearMonth(y, m));
                }}
                className="p-2 hover:bg-[#0f0f0f] rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  let m = calendarMonth + 1;
                  let y = calendarYear;
                  if (m > 12) { m = 1; y += 1; }
                  setSelectedMonth(formatYearMonth(y, m));
                }}
                className="p-2 hover:bg-[#0f0f0f] rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="text-center text-gray-500 text-sm font-semibold py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const isCurrentMonth = date.getMonth() === calendarMonth - 1;
              const isToday = dateStr === todayStr;
              const status = getDayStatus(dateStr);

              let bgColor = 'bg-[#0f0f0f]';
              let borderColor = 'border-[#1E1E1E]';

              if (!isCurrentMonth) {
                bgColor = 'bg-[#0a0a0a]';
              } else if (isToday) {
                borderColor = 'border-[#E8472A]';
              } else if (status.bothPosted) {
                bgColor = 'bg-green-900/20';
              } else if (date < new Date() && !status.bothPosted) {
                bgColor = 'bg-red-900/10';
              }

              return (
                <div
                  key={idx}
                  className={`${bgColor} border ${borderColor} rounded-lg p-2 min-h-20 flex flex-col items-center justify-center cursor-pointer hover:border-[#E8472A] transition`}
                >
                  <p className={`text-sm font-semibold mb-1 ${!isCurrentMonth ? 'text-gray-600' : 'text-white'}`}>
                    {date.getDate()}
                  </p>
                  <div className="flex gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${status.post1Posted ? 'bg-green-400' : date < new Date() ? 'bg-red-400' : 'bg-gray-600'}`}
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${status.post2Posted ? 'bg-green-400' : date < new Date() ? 'bg-red-400' : 'bg-gray-600'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Letzte Posts</h2>

          {loading && posts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-[#E8472A]" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Keine Posts vorhanden</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...posts].reverse().map(post => (
                <div key={post.id} className="flex items-center gap-4 p-3 bg-[#0f0f0f] rounded-lg border border-[#1E1E1E] hover:border-[#E8472A] transition text-sm">
                  <span className="text-gray-500 min-w-16">{formatDateShort(post.post_date)}</span>
                  <span className="text-gray-400 min-w-12">Post {post.post_number}</span>
                  <span className="text-white flex-1 truncate">{post.post_topic || '-'}</span>

                  {post.post_type && (
                    <span className="bg-[#E8472A]/20 text-[#E8472A] text-xs px-2 py-1 rounded">
                      {post.post_type}
                    </span>
                  )}

                  <span className="text-gray-500">{post.posted_by || '-'}</span>

                  <div className="flex gap-3 text-gray-500 text-xs min-w-max">
                    <span>👍 {post.likes}</span>
                    <span>💬 {post.comments}</span>
                    <span>🔁 {post.shares}</span>
                    <span>👁 {post.impressions}</span>
                  </div>

                  {post.posted && (
                    <button
                      onClick={() => {
                        setEditingPost(post);
                        setEngagementForm({
                          likes: post.likes,
                          comments: post.comments,
                          shares: post.shares,
                          impressions: post.impressions
                        });
                      }}
                      className="p-1 hover:bg-[#1E1E1E] rounded transition"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Engagement Modal */}
        {editingPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1a1a1a] border border-[#1E1E1E] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">
                Engagement bearbeiten - {formatDateShort(editingPost.post_date)} Post {editingPost.post_number}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Likes</label>
                  <input
                    type="number"
                    value={engagementForm.likes}
                    onChange={(e) => setEngagementForm({ ...engagementForm, likes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Kommentare</label>
                  <input
                    type="number"
                    value={engagementForm.comments}
                    onChange={(e) => setEngagementForm({ ...engagementForm, comments: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Shares</label>
                  <input
                    type="number"
                    value={engagementForm.shares}
                    onChange={(e) => setEngagementForm({ ...engagementForm, shares: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Impressionen</label>
                  <input
                    type="number"
                    value={engagementForm.impressions}
                    onChange={(e) => setEngagementForm({ ...engagementForm, impressions: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0f0f0f] border border-[#1E1E1E] rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={updateEngagement}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
                  disabled={loading}
                >
                  {loading ? 'Speichert...' : 'Speichern'}
                </button>
                <button
                  onClick={() => setEditingPost(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition"
                  disabled={loading}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
