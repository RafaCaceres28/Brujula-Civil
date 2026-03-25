import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/features/auth/server/require-user';
import { saveObjetivosStepAction } from '@/features/wizard/actions/save-objetivos-step-action';
import { CatalogMultiSelect } from '@/features/wizard/components/catalog-multi-select';
import { CatalogSingleSelect } from '@/features/wizard/components/catalog-single-select';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import {
  LOCATION_OPTIONS,
  SENIORITY_OPTIONS,
  TARGET_ROLE_CATALOG_OPTIONS,
  TARGET_SECTOR_OPTIONS,
  WORK_MODEL_OPTIONS,
} from '@/features/wizard/config/wizard-catalogs';
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
            <CatalogMultiSelect
              name="targetRoles"
              label="Roles objetivo"
              options={TARGET_ROLE_CATALOG_OPTIONS}
              selectedValues={values.targetRoles.map((role) => role.slug)}
            />

            <CatalogMultiSelect
              name="targetSectors"
              label="Sectores objetivo"
              options={TARGET_SECTOR_OPTIONS}
              selectedValues={values.targetSectors}
            />

            <CatalogMultiSelect
              name="preferredLocations"
              label="Ubicaciones preferidas"
              options={LOCATION_OPTIONS}
              selectedValues={values.preferredLocations}
            />

            <CatalogSingleSelect
              id="workModel"
              name="workModel"
              label="Modelo de trabajo"
              options={WORK_MODEL_OPTIONS}
              defaultValue={values.workModel}
            />

            <CatalogSingleSelect
              id="seniority"
              name="seniority"
              label="Nivel objetivo"
              options={SENIORITY_OPTIONS}
              defaultValue={values.seniority}
            />

            <div className="space-y-2">
              <label htmlFor="preferencesNotes" className="text-sm font-medium text-slate-900">
                Notas de preferencias
              </label>
              <Textarea
                id="preferencesNotes"
                name="preferencesNotes"
                defaultValue={values.preferencesNotes ?? ''}
              />
            </div>
          </div>

          <WizardStepActions stepSlug="objetivos" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
