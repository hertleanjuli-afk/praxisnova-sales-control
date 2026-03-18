'use client';

interface InboundLeadCardProps {
  lead: any;
}

type InboundStatus = 'pending_optin' | 'active' | 'unsubscribed';

const STATUS_CONFIG: Record<InboundStatus, { label: string; className: string }> = {
  pending_optin: {
    label: 'Warte auf Bestätigung',
    className: 'bg-yellow-100 text-yellow-800',
  },
  active: {
    label: 'Aktiv',
    className: 'bg-green-100 text-green-800',
  },
  unsubscribed: {
    label: 'Abgemeldet',
    className: 'bg-red-100 text-red-800',
  },
};

export default function InboundLeadCard({ lead }: InboundLeadCardProps) {
  const status: InboundStatus = lead.status ?? 'pending_optin';
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_optin;
  const totalSteps: number = lead.total_steps ?? 4;
  const currentStep: number = lead.current_step ?? 0;
  const progressPercent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {lead.first_name} {lead.last_name}
          </h3>
          {lead.email && (
            <p className="text-xs text-gray-500">{lead.email}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${config.className}`}
        >
          {config.label}
        </span>
      </div>

      {/* Meta */}
      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="font-medium text-[#1E3A5F]">Quelle:</span>{' '}
          {lead.source ?? 'Website Pop-up'}
        </p>
        {lead.date_received && (
          <p>
            <span className="font-medium text-[#1E3A5F]">Eingegangen:</span>{' '}
            {lead.date_received}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {status === 'active' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Schritt {currentStep} von {totalSteps}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {lead.current_step_label && (
            <p className="text-xs text-gray-500">{lead.current_step_label}</p>
          )}
        </div>
      )}
    </div>
  );
}
