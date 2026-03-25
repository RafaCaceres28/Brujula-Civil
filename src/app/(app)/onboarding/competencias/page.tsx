import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/features/auth/server/require-user';
import { saveCompetenciasStepAction } from '@/features/wizard/actions/save-competencias-step-action';
import { CatalogMultiSelect } from '@/features/wizard/components/catalog-multi-select';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import {
  CERTIFICATION_OPTIONS,
  DRIVING_LICENSE_OPTIONS,
  LANGUAGE_COMPOUND_OPTIONS,
  OFFICE_TOOL_OPTIONS,
  SOFT_SKILL_OPTIONS,
  TECHNICAL_SKILL_OPTIONS,
} from '@/features/wizard/config/wizard-catalogs';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { getCompetenciasStepDefaults } from '@/features/wizard/services/wizard-form.mapper';

export default async function CompetenciasStepPage() {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);
  const values = getCompetenciasStepDefaults(overview.draft.competencias);
  const languageValues = values.languages.map((language) => `${language.name}:${language.level}`);

  return (
    <StepGuard requestedStepSlug="competencias" wizardState={overview.state}>
      <WizardShell
        title="Competencias"
        description="Agrupa capacidades técnicas, transversales, certificaciones e idiomas como base de tu perfil profesional."
      >
        <form action={saveCompetenciasStepAction} className="space-y-6">
          <div className="space-y-4">
            <CatalogMultiSelect
              name="technicalSkills"
              label="Competencias técnicas"
              options={TECHNICAL_SKILL_OPTIONS}
              selectedValues={values.technicalSkills}
            />

            <CatalogMultiSelect
              name="softSkills"
              label="Competencias transversales"
              options={SOFT_SKILL_OPTIONS}
              selectedValues={values.softSkills}
            />

            <CatalogMultiSelect
              name="certifications"
              label="Certificaciones"
              options={CERTIFICATION_OPTIONS}
              selectedValues={values.certifications}
            />

            <CatalogMultiSelect
              name="drivingLicenses"
              label="Permisos de conducir"
              options={DRIVING_LICENSE_OPTIONS}
              selectedValues={values.drivingLicenses}
            />

            <CatalogMultiSelect
              name="languages"
              label="Idiomas y nivel"
              options={LANGUAGE_COMPOUND_OPTIONS}
              selectedValues={languageValues}
            />

            <CatalogMultiSelect
              name="officeTools"
              label="Herramientas ofimáticas"
              options={OFFICE_TOOL_OPTIONS}
              selectedValues={values.officeTools}
            />

            <div className="space-y-2">
              <label htmlFor="extraTraining" className="text-sm font-medium text-slate-900">
                Formacion adicional
              </label>
              <Textarea
                id="extraTraining"
                name="extraTraining"
                defaultValue={values.extraTraining ?? ''}
              />
            </div>
          </div>

          <WizardStepActions stepSlug="competencias" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
