import { Input } from '@/components/ui/input';
import { requireUser } from '@/features/auth/server/require-user';
import { saveMilitarStepAction } from '@/features/wizard/actions/save-militar-step-action';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { getMilitarStepDefaults } from '@/features/wizard/services/wizard-form.mapper';

export default async function MilitarStepPage() {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);
  const values = getMilitarStepDefaults(overview.draft.militar);

  return (
    <StepGuard requestedStepSlug="militar" wizardState={overview.state}>
      <WizardShell
        title="Perfil militar"
        description="Recoge la base de tu trayectoria militar para poder traducirla después al contexto civil."
      >
        <form action={saveMilitarStepAction} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="army" className="text-sm font-medium text-slate-900">
                Ejército
              </label>
              <Input id="army" name="army" defaultValue={values.army ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="cuerpo" className="text-sm font-medium text-slate-900">
                Cuerpo / rama
              </label>
              <Input id="cuerpo" name="cuerpo" defaultValue={values.cuerpo ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="rank" className="text-sm font-medium text-slate-900">
                Empleo / rango
              </label>
              <Input id="rank" name="rank" defaultValue={values.rank ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="specialty" className="text-sm font-medium text-slate-900">
                Especialidad
              </label>
              <Input id="specialty" name="specialty" defaultValue={values.specialty ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="yearsOfService" className="text-sm font-medium text-slate-900">
                Años de servicio
              </label>
              <Input
                id="yearsOfService"
                name="yearsOfService"
                type="number"
                min={0}
                defaultValue={values.yearsOfService ?? ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="destinationType" className="text-sm font-medium text-slate-900">
                Tipo de destino
              </label>
              <Input
                id="destinationType"
                name="destinationType"
                defaultValue={values.destinationType ?? ''}
              />
            </div>
          </div>

          <WizardStepActions stepSlug="militar" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
