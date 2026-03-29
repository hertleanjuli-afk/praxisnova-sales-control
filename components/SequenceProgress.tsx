'use client';

interface SequenceProgressProps {
  lead: any;
  onStop: (leadId: number) => void;
  onBooked?: (leadId: number) => void;
}

const TOTAL_STEPS = 6;

export default function SequenceProgress({ lead, onStop, onBooked }: SequenceProgressProps) {
  const currentStep: number = lead.current_step ?? 1;
  const daysSinceEnrollment: number = lead.days_since_enrollment ?? 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {lead.first_name} {lead.last_name}
          </h3>
          {lead.company && (
            <p className="text-xs text-gray-500">{lead.company}</p>
          )}
        </div>
        {lead.sector && (
          <span className="inline-flex items-center rounded-full bg-[#1E3A5F] px-2.5 py-0.5 text-xs font-medium text-white">
            {lead.sector}
          </span>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={stepNum} className="flex items-center gap-2">
              <div
                className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-blue-600'
                    : isCurrent
                    ? 'bg-blue-600 ring-4 ring-blue-200 animate-pulse'
                    : 'bg-gray-200'
                }`}
              >
                {isCompleted && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {stepNum < TOTAL_STEPS && (
                <div
                  className={`h-0.5 w-6 ${
                    isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step label */}
      <p className="text-center text-sm font-medium text-[#1E3A5F]">
        Schritt {currentStep} von {TOTAL_STEPS}
        {lead.current_step_label && ` – ${lead.current_step_label}`}
      </p>

      {/* Meta info */}
      <div className="space-y-1 text-xs text-gray-500">
        <p>
          Eingeschrieben vor <span className="font-medium text-gray-700">{daysSinceEnrollment}</span> Tagen
        </p>
        {lead.last_event && (
          <p>
            Letztes Ereignis: <span className="font-medium text-gray-700">{lead.last_event}</span>
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {onBooked && (
          <button
            onClick={() => onBooked(lead.id)}
            className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Termin gebucht
          </button>
        )}
        <button
          onClick={() => onStop(lead.id)}
          className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Sequenz stoppen
        </button>
      </div>
    </div>
  );
}
