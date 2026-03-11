import type { WizardStepKeyDb } from '@/types/database.types';
import { WIZARD_STEPS } from '../config/wizard-steps';

type WizardProgressProps = {
  currentStepDbKey: WizardStepKeyDb | null;
  completionPercent: number;
  completedStepKeys?: WizardStepKeyDb[];
};

export function WizardProgress({
  currentStepDbKey,
  completionPercent,
  completedStepKeys = [],
}: WizardProgressProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-slate-900">Progreso del onboarding</h2>
        <p className="text-sm text-slate-600">
          Completa tu perfil base para generar después CV, LinkedIn y traducción.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Completado</span>
          <span className="font-medium text-slate-900">{completionPercent}%</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <ol className="space-y-2">
        {WIZARD_STEPS.map((step) => {
          const isCurrent = step.dbKey === currentStepDbKey;
          const isCompleted = completedStepKeys.includes(step.dbKey);

          return (
            <li
              key={step.slug}
              className={[
                'rounded-xl px-3 py-2 text-sm',
                isCurrent
                  ? 'bg-slate-900 text-white'
                  : isCompleted
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-700',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{step.label}</span>
                <span className="text-xs">
                  {isCurrent ? 'Actual' : isCompleted ? 'Hecho' : 'Pendiente'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
