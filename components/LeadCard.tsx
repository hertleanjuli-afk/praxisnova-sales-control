'use client';

interface LeadCardProps {
  lead: any;
  selected: boolean;
  onSelect: (id: string) => void;
  onEnroll: (lead: any) => void;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain}`;
}

type StatusKey = 'available' | 'in_sequence' | 'cooldown' | 'unsubscribed';

const STATUS_CONFIG: Record<StatusKey, { label: string; className: string }> = {
  available: {
    label: 'Verfügbar',
    className: 'bg-green-100 text-green-800',
  },
  in_sequence: {
    label: 'In Sequenz',
    className: 'bg-blue-100 text-blue-800',
  },
  cooldown: {
    label: 'Cooldown',
    className: 'bg-yellow-100 text-yellow-800',
  },
  unsubscribed: {
    label: 'Abgemeldet',
    className: 'bg-red-100 text-red-800',
  },
};

export default function LeadCard({ lead, selected, onSelect, onEnroll }: LeadCardProps) {
  const status: StatusKey = lead.status ?? 'available';
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.available;
  const isAvailable = status === 'available';

  const statusLabel =
    status === 'cooldown' && lead.cooldown_days
      ? `Cooldown (${lead.cooldown_days} Tage)`
      : config.label;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {isAvailable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(lead.id)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
            />
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {lead.first_name} {lead.last_name}
            </h3>
            {lead.title && (
              <p className="text-xs text-gray-500">{lead.title}</p>
            )}
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${config.className}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm text-gray-700">
        {lead.company && (
          <p>
            <span className="font-medium text-[#1E3A5F]">Firma:</span> {lead.company}
          </p>
        )}
        {lead.employee_count != null && (
          <p>
            <span className="font-medium text-[#1E3A5F]">Mitarbeiter:</span> {lead.employee_count}
          </p>
        )}
        {lead.email && (
          <p>
            <span className="font-medium text-[#1E3A5F]">E-Mail:</span> {maskEmail(lead.email)}
          </p>
        )}
        {lead.linkedin_url && (
          <p className="flex items-center gap-1">
            <span className="font-medium text-[#1E3A5F]">LinkedIn:</span>
            <a
              href={lead.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 inline"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              Profil
            </a>
          </p>
        )}
      </div>

      {/* Action */}
      {isAvailable && (
        <button
          onClick={() => onEnroll(lead)}
          className="mt-auto w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
        >
          Zur Sequenz hinzufügen
        </button>
      )}
    </div>
  );
}
