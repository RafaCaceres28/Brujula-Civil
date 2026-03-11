import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/features/auth/server/require-user';
import { saveCompetenciasStepAction } from '@/features/wizard/actions/save-competencias-step-action';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { getCompetenciasStepDefaults } from '@/features/wizard/services/wizard-form.mapper';

export default async function CompetenciasStepPage() {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);
  const values = getCompetenciasStepDefaults(overview.draft.competencias);

  return (
    <StepGuard requestedStepSlug="competencias" wizardState={overview.state}>
      <WizardShell
        title="Competencias"
        description="Agrupa capacidades técnicas, transversales, certificaciones e idiomas como base de tu perfil profesional."
      >
        <form action={saveCompetenciasStepAction} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="technicalSkills" className="text-sm font-medium text-slate-900">
                Competencias técnicas
              </label>
              <Textarea
                id="technicalSkills"
                name="technicalSkills"
                defaultValue={values.technicalSkills.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="softSkills" className="text-sm font-medium text-slate-900">
                Competencias transversales
              </label>
              <Textarea
                id="softSkills"
                name="softSkills"
                defaultValue={values.softSkills.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="certifications" className="text-sm font-medium text-slate-900">
                Certificaciones
              </label>
              <Textarea
                id="certifications"
                name="certifications"
                defaultValue={values.certifications.join('\n')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="languages" className="text-sm font-medium text-slate-900">
                Idiomas
              </label>
              <Textarea
                id="languages"
                name="languages"
                defaultValue={values.languages.join('\n')}
              />
            </div>
          </div>

          <WizardStepActions stepSlug="competencias" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
