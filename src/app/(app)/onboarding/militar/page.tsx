import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/features/auth/server/require-user';
import { saveMilitarStepAction } from '@/features/wizard/actions/save-militar-step-action';
import { CatalogSingleSelect } from '@/features/wizard/components/catalog-single-select';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import {
  BRANCH_OPTIONS,
  CORPS_OPTIONS,
  DESTINATION_CONTEXT_OPTIONS,
  LEADERSHIP_LEVEL_OPTIONS,
  RANK_OPTIONS,
  SPECIALTY_OPTIONS,
  TEAM_SIZE_OPTIONS,
} from '@/features/wizard/config/wizard-catalogs';
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
            <CatalogSingleSelect
              id="branch"
              name="branch"
              label="Ejército"
              options={BRANCH_OPTIONS}
              defaultValue={values.branch}
            />

            <CatalogSingleSelect
              id="corps"
              name="corps"
              label="Cuerpo / rama"
              options={CORPS_OPTIONS}
              defaultValue={values.corps}
            />

            <CatalogSingleSelect
              id="rankCode"
              name="rankCode"
              label="Empleo / rango"
              options={RANK_OPTIONS}
              defaultValue={values.rank.code}
            />

            <CatalogSingleSelect
              id="specialtyCode"
              name="specialtyCode"
              label="Especialidad"
              options={SPECIALTY_OPTIONS}
              defaultValue={values.specialty.code}
            />

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

            <CatalogSingleSelect
              id="destinationContext"
              name="destinationContext"
              label="Contexto de destino"
              options={DESTINATION_CONTEXT_OPTIONS}
              defaultValue={values.destinationContext}
            />

            <CatalogSingleSelect
              id="leadershipLevel"
              name="leadershipLevel"
              label="Nivel de liderazgo"
              options={LEADERSHIP_LEVEL_OPTIONS}
              defaultValue={values.leadershipLevel}
            />

            <CatalogSingleSelect
              id="teamSize"
              name="teamSize"
              label="Tamaño de equipo"
              options={TEAM_SIZE_OPTIONS}
              defaultValue={values.teamSize}
            />

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
              <Textarea id="notes" name="notes" defaultValue={values.notes ?? ''} />
            </div>
          </div>

          <WizardStepActions stepSlug="militar" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
