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
              <label htmlFor="responsibilityAreas" className="text-sm font-medium text-slate-900">
                Areas de responsabilidad
              </label>
              <Textarea
                id="responsibilityAreas"
                name="responsibilityAreas"
                defaultValue={values.responsibilityAreas.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="missionTypes" className="text-sm font-medium text-slate-900">
                Tipos de mision
              </label>
              <Textarea
                id="missionTypes"
                name="missionTypes"
                defaultValue={values.missionTypes.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="functionTypes" className="text-sm font-medium text-slate-900">
                Tipos de funcion
              </label>
              <Textarea
                id="functionTypes"
                name="functionTypes"
                defaultValue={values.functionTypes.join('\n')}
              />
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

            <div className="space-y-2">
              <label htmlFor="leadershipScopes" className="text-sm font-medium text-slate-900">
                Alcance de liderazgo
              </label>
              <Textarea
                id="leadershipScopes"
                name="leadershipScopes"
                defaultValue={values.leadershipScopes.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="additionalContext" className="text-sm font-medium text-slate-900">
                Contexto adicional
              </label>
              <Textarea
                id="additionalContext"
                name="additionalContext"
                defaultValue={values.additionalContext ?? ''}
              />
            </div>
          </div>

          <WizardStepActions stepSlug="experiencia" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
