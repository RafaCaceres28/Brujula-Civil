import type { UserWizardStateRow } from '@/types/database.types';
import { redirect } from 'next/navigation';
import type { WizardStepSlug } from '../config/wizard-steps';
import { getStepRouteByDbKey } from '../config/wizard-steps';

type StepGuardProps = {
  requestedStepSlug: WizardStepSlug;
  wizardState: UserWizardStateRow | null;
  children: React.ReactNode;
};

const ALLOWED_DB_STEPS_BY_SLUG: Record<WizardStepSlug, string[]> = {
  militar: ['military_background'],
  experiencia: ['military_background', 'missions_achievements'],
  competencias: ['military_background', 'missions_achievements', 'skills_tools'],
  objetivos: ['military_background', 'missions_achievements', 'skills_tools', 'preferences'],
  resumen: [
    'military_background',
    'missions_achievements',
    'skills_tools',
    'preferences',
    'review',
  ],
};

export function StepGuard({ requestedStepSlug, wizardState, children }: StepGuardProps) {
  const currentStep = wizardState?.current_step;

  if (!currentStep) {
    return <>{children}</>;
  }

  const allowedSteps = ALLOWED_DB_STEPS_BY_SLUG[requestedStepSlug];

  if (!allowedSteps.includes(currentStep)) {
    redirect(getStepRouteByDbKey(currentStep));
  }

  return <>{children}</>;
}
