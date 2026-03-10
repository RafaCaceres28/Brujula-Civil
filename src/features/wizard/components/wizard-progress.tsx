import type { WizardStepKeyDb } from '@/types/database.types';
import { WIZARD_STEPS } from '../config/wizard-steps';

type WizardProgressProps = {
  currentStepDbKey: WizardStepKeyDb | null;
  completionPercent: number;
};

export function WizardProgress({ currentStepDbKey, completionPercent }: WizardProgressProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Progreso del onboarding</h2>
        <span className="text-sm text-slate-600">{completionPercent}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      <ol className="space-y-2">
        {WIZARD_STEPS.map((step) => {
          const isCurrent = step.dbKey === currentStepDbKey;

          return (
            <li
              key={step.slug}
              className={`rounded-lg px-3 py-2 text-sm ${
                isCurrent ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
