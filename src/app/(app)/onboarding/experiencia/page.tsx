import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/features/auth/server/require-user';
import { saveExperienciaStepAction } from '@/features/wizard/actions/save-experiencia-step-action';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { getExperienciaStepDefaults } from '@/features/wizard/services/wizard-form.mapper';

export default async function ExperienciaStepPage() {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);
  const values = getExperienciaStepDefaults(overview.draft.experiencia);

  return (
    <StepGuard requestedStepSlug="experiencia" wizardState={overview.state}>
      <WizardShell
        title="Experiencia"
        description="Describe responsabilidades, misiones, logros y herramientas para convertirlos luego en lenguaje profesional civil."
      >
        <form action={saveExperienciaStepAction} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="responsibilities" className="text-sm font-medium text-slate-900">
                Responsabilidades
              </label>
              <Textarea
                id="responsibilities"
                name="responsibilities"
                defaultValue={values.responsibilities.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="missions" className="text-sm font-medium text-slate-900">
                Misiones
              </label>
              <Textarea id="missions" name="missions" defaultValue={values.missions.join('\n')} />
            </div>

            <div className="space-y-2">
              <label htmlFor="achievements" className="text-sm font-medium text-slate-900">
                Logros
              </label>
              <Textarea
                id="achievements"
                name="achievements"
                defaultValue={values.achievements.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tools" className="text-sm font-medium text-slate-900">
                Herramientas
              </label>
              <Textarea id="tools" name="tools" defaultValue={values.tools.join('\n')} />
            </div>
          </div>

          <WizardStepActions stepSlug="experiencia" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
