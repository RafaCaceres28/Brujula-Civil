import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  getPreviousStepSlug,
  getStepRouteBySlug,
  type WizardStepSlug,
} from '../config/wizard-steps';

type WizardStepActionsProps = {
  stepSlug: WizardStepSlug;
  submitLabel?: string;
};

export function WizardStepActions({
  stepSlug,
  submitLabel = 'Guardar y continuar',
}: WizardStepActionsProps) {
  const previousStep = getPreviousStepSlug(stepSlug);

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {previousStep ? (
          <Link
            href={getStepRouteBySlug(previousStep)}
            className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Volver
          </Link>
        ) : (
          <span className="text-sm text-slate-500">Primer paso del onboarding</span>
        )}
      </div>

      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
