import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/features/auth/server/require-user';
import { saveExperienciaStepAction } from '@/features/wizard/actions/save-experiencia-step-action';
import { CatalogMultiSelect } from '@/features/wizard/components/catalog-multi-select';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import {
  FUNCTION_TYPE_OPTIONS,
  LEADERSHIP_SCOPE_OPTIONS,
  MISSION_TYPE_OPTIONS,
  RESPONSIBILITY_AREA_OPTIONS,
  TOOL_OPTIONS,
} from '@/features/wizard/config/wizard-catalogs';
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
            <CatalogMultiSelect
              name="responsibilityAreas"
              label="Areas de responsabilidad"
              options={RESPONSIBILITY_AREA_OPTIONS}
              selectedValues={values.responsibilityAreas}
            />

            <CatalogMultiSelect
              name="missionTypes"
              label="Tipos de mision"
              options={MISSION_TYPE_OPTIONS}
              selectedValues={values.missionTypes}
            />

            <CatalogMultiSelect
              name="functionTypes"
              label="Tipos de funcion"
              options={FUNCTION_TYPE_OPTIONS}
              selectedValues={values.functionTypes}
            />

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

            <CatalogMultiSelect
              name="tools"
              label="Herramientas"
              options={TOOL_OPTIONS}
              selectedValues={values.tools}
            />

            <CatalogMultiSelect
              name="leadershipScopes"
              label="Alcance de liderazgo"
              options={LEADERSHIP_SCOPE_OPTIONS}
              selectedValues={values.leadershipScopes}
            />

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
