export interface PlanBlock {
  start: string;
  end: string;
  title: string;
  category: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface DailyPlan {
  id: number;
  planDate: string;
  status: 'draft' | 'active' | 'completed' | 'reviewed';
  blocks: PlanBlock[];
  review?: {
    doneBlocks: string[];
    openBlocks: string[];
    questions: string[];
  };
}

export interface WeeklyReport {
  id: number;
  weekStart: string;
  weekEnd: string;
  metrics: Record<string, number>;
  forecast?: Record<string, number>;
  htmlBody?: string;
  sentAt?: string;
}

export interface NewsItem {
  id: number;
  url: string;
  title: string;
  source: string;
  publishedAt?: string;
  summary?: string;
  industries: string[];
  relevanceScore: number;
  usedInContent: boolean;
  sharedWithSales: boolean;
}

export interface ContentDraft {
  id: number;
  platform: 'linkedin' | 'facebook' | 'newsletter' | 'twitter' | 'blog';
  contentType?: string;
  headline?: string;
  body: string;
  hashtags?: string[];
  suggestedPostTime?: string;
  sourceNewsIds?: number[];
  status: 'pending_review' | 'approved' | 'rejected' | 'published';
}

export interface EmailInboxItem {
  id: number;
  gmailId: string;
  threadId?: string;
  from: string;
  fromName?: string;
  subject: string;
  receivedAt: string;
  category:
    | 'customer-inquiry'
    | 'partner'
    | 'admin'
    | 'marketing-tool'
    | 'spam-ish'
    | 'personal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  draftReply?: string;
  requiresAction: boolean;
}

export interface PressContact {
  id: number;
  outletName: string;
  outletType?: string;
  contactName?: string;
  contactEmail?: string;
  industries: string[];
  status: 'cold' | 'warm' | 'contacted' | 'responded' | 'published';
  lastContacted?: string;
}

export interface HealthReport {
  id: number;
  checkTime: string;
  agentStatuses: Record<string, 'ok' | 'warning' | 'error' | 'missing'>;
  apiStatuses: Record<string, 'ok' | 'degraded' | 'down'>;
  overallStatus: 'ok' | 'warning' | 'critical';
  alerts: string[];
}

export interface BlockedTaskRecord {
  id: number;
  taskName: string;
  agentName: string;
  reason: string;
  attempts: number;
  lastAttempt: string;
  resolved: boolean;
}
