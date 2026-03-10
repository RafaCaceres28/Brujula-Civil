import { requireUser } from '@/features/auth/server/require-user';
import { saveExperienciaStepAction } from '@/features/wizard/actions/save-experiencia-step-action';
import { getOnboardingStep } from '@/features/wizard/server/get-onboarding-step';

export default async function ExperienciaStepPage() {
  const user = await requireUser();
  const stepState = await getOnboardingStep(user.id, 'experiencia');

  const payload = (stepState?.payload_jsonb ?? {}) as {
    responsibilities?: string[];
    missions?: string[];
    achievements?: string[];
    tools?: string[];
  };

  return (
    <form action={saveExperienciaStepAction} className="space-y-4">
      <div>
        <label htmlFor="responsibilities">Responsabilidades</label>
        <textarea
          id="responsibilities"
          name="responsibilities"
          defaultValue={(payload.responsibilities ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="missions">Misiones</label>
        <textarea
          id="missions"
          name="missions"
          defaultValue={(payload.missions ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="achievements">Logros</label>
        <textarea
          id="achievements"
          name="achievements"
          defaultValue={(payload.achievements ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="tools">Herramientas</label>
        <textarea id="tools" name="tools" defaultValue={(payload.tools ?? []).join('\n')} />
      </div>

      <button type="submit">Guardar y continuar</button>
    </form>
  );
}
