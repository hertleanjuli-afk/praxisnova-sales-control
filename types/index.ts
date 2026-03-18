export interface Lead {
  id: number;
  apollo_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  industry: string | null;
  employee_count: number | null;
  hubspot_id: string | null;
  linkedin_url: string | null;
  sequence_status: 'none' | 'active' | 'completed' | 'unsubscribed' | 'replied' | 'cooldown' | 'bounced';
  sequence_type: string | null;
  sequence_step: number;
  enrolled_at: string | null;
  exited_at: string | null;
  cooldown_until: string | null;
  created_at: string;
}

export interface EmailEvent {
  id: number;
  lead_id: number;
  sequence_type: string;
  step_number: number;
  event_type: 'sent' | 'failed' | 'opened' | 'clicked' | 'unsubscribed' | 'replied' | 'bounced';
  brevo_message_id: string | null;
  sender_used: string | null;
  created_at: string;
}

export interface ApolloLead {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  organization_name: string;
  linkedin_url: string;
  organization: {
    estimated_num_employees: number;
    industry: string;
  };
}

export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

export interface AnalyticsData {
  leads_contacted: number;
  emails_sent: number;
  emails_failed: number;
  unsubscribes: number;
  replies: number;
  by_sector: {
    immobilien: SectorStats;
    handwerk: SectorStats;
    bauunternehmen: SectorStats;
  };
}

export interface SectorStats {
  leads: number;
  sent: number;
  failed: number;
  unsubscribes: number;
  replies: number;
}

export interface LinkedInTask {
  id: number;
  lead_name: string;
  company: string;
  title: string;
  linkedin_url: string;
  sector: string;
  added_date: string;
  completed: boolean;
}
