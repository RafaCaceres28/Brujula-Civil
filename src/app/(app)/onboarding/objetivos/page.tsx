import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/features/auth/server/require-user';
import { saveObjetivosStepAction } from '@/features/wizard/actions/save-objetivos-step-action';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { getObjetivosStepDefaults } from '@/features/wizard/services/wizard-form.mapper';

export default async function ObjetivosStepPage() {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);
  const values = getObjetivosStepDefaults(overview.draft.objetivos);

  return (
    <StepGuard requestedStepSlug="objetivos" wizardState={overview.state}>
      <WizardShell
        title="Objetivos"
        description="Define tus roles, sectores y preferencias para que la traducción civil y la generación documental se alineen con tu meta."
      >
        <form action={saveObjetivosStepAction} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="targetRoles" className="text-sm font-medium text-slate-900">
                Roles objetivo
              </label>
              <Textarea
                id="targetRoles"
                name="targetRoles"
                defaultValue={values.targetRoles.map((role) => role.label).join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="targetSectors" className="text-sm font-medium text-slate-900">
                Sectores objetivo
              </label>
              <Textarea
                id="targetSectors"
                name="targetSectors"
                defaultValue={values.targetSectors.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="preferredLocations" className="text-sm font-medium text-slate-900">
                Ubicaciones preferidas
              </label>
              <Textarea
                id="preferredLocations"
                name="preferredLocations"
                defaultValue={values.preferredLocations.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="workModel" className="text-sm font-medium text-slate-900">
                Modelo de trabajo
              </label>
              <select
                id="workModel"
                name="workModel"
                defaultValue={values.workModel ?? ''}
                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Selecciona una opción</option>
                <option value="onsite">Presencial</option>
                <option value="hybrid">Híbrido</option>
                <option value="remote">Remoto</option>
              </select>
            </div>
          </div>

          <WizardStepActions stepSlug="objetivos" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
