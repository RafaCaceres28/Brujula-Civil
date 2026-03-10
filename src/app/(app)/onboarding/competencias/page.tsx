import { requireUser } from '@/features/auth/server/require-user';
import { saveCompetenciasStepAction } from '@/features/wizard/actions/save-competencias-step-action';
import { getOnboardingStep } from '@/features/wizard/server/get-onboarding-step';

export default async function CompetenciasStepPage() {
  const user = await requireUser();
  const stepState = await getOnboardingStep(user.id, 'competencias');

  const payload = (stepState?.payload_jsonb ?? {}) as {
    technicalSkills?: string[];
    softSkills?: string[];
    certifications?: string[];
    languages?: string[];
  };

  return (
    <form action={saveCompetenciasStepAction} className="space-y-4">
      <div>
        <label htmlFor="technicalSkills">Competencias técnicas</label>
        <textarea
          id="technicalSkills"
          name="technicalSkills"
          defaultValue={(payload.technicalSkills ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="softSkills">Competencias transversales</label>
        <textarea
          id="softSkills"
          name="softSkills"
          defaultValue={(payload.softSkills ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="certifications">Certificaciones</label>
        <textarea
          id="certifications"
          name="certifications"
          defaultValue={(payload.certifications ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="languages">Idiomas</label>
        <textarea
          id="languages"
          name="languages"
          defaultValue={(payload.languages ?? []).join('\n')}
        />
      </div>

      <button type="submit">Guardar y continuar</button>
    </form>
  );
}
