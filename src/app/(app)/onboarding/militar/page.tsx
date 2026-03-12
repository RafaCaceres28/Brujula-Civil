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
              <label htmlFor="branch" className="text-sm font-medium text-slate-900">
                Ejército
              </label>
              <Input id="branch" name="branch" defaultValue={values.branch ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="corps" className="text-sm font-medium text-slate-900">
                Cuerpo / rama
              </label>
              <Input id="corps" name="corps" defaultValue={values.corps ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="rankCode" className="text-sm font-medium text-slate-900">
                Empleo / rango
              </label>
              <Input id="rankCode" name="rankCode" defaultValue={values.rank.code ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="specialtyCode" className="text-sm font-medium text-slate-900">
                Especialidad
              </label>
              <Input
                id="specialtyCode"
                name="specialtyCode"
                defaultValue={values.specialty.code ?? ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="serviceYears" className="text-sm font-medium text-slate-900">
                Años de servicio
              </label>
              <Input
                id="serviceYears"
                name="serviceYears"
                type="number"
                min={0}
                defaultValue={values.serviceYears ?? ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="destinationContext" className="text-sm font-medium text-slate-900">
                Contexto de destino
              </label>
              <Input
                id="destinationContext"
                name="destinationContext"
                defaultValue={values.destinationContext ?? ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="leadershipLevel" className="text-sm font-medium text-slate-900">
                Nivel de liderazgo
              </label>
              <Input
                id="leadershipLevel"
                name="leadershipLevel"
                defaultValue={values.leadershipLevel ?? ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="teamSize" className="text-sm font-medium text-slate-900">
                Tamaño de equipo
              </label>
              <Input id="teamSize" name="teamSize" defaultValue={values.teamSize ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="unitName" className="text-sm font-medium text-slate-900">
                Unidad
              </label>
              <Input id="unitName" name="unitName" defaultValue={values.unitName ?? ''} />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium text-slate-900">
                Notas
              </label>
              <Input id="notes" name="notes" defaultValue={values.notes ?? ''} />
            </div>
          </div>

          <WizardStepActions stepSlug="militar" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
