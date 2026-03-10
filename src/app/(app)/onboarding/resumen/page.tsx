import { requireUser } from '@/features/auth/server/require-user';
import { saveResumenStepAction } from '@/features/wizard/actions/save-resumen-step-action';
import { getOnboardingStep } from '@/features/wizard/server/get-onboarding-step';

export default async function ResumenStepPage() {
  const user = await requireUser();
  const stepState = await getOnboardingStep(user.id, 'resumen');

  const payload = (stepState?.payload_jsonb ?? {}) as {
    confirmed?: boolean;
  };

  return (
    <form action={saveResumenStepAction} className="space-y-4">
      <div>
        <h1>Resumen final</h1>
        <p>Confirma que los datos del onboarding están listos para continuar.</p>
      </div>

      <div>
        <label htmlFor="confirmed" className="flex items-center gap-2">
          <input
            id="confirmed"
            name="confirmed"
            type="checkbox"
            defaultChecked={payload.confirmed ?? false}
          />
          Confirmo que quiero finalizar esta fase del onboarding
        </label>
      </div>

      <button type="submit">Finalizar onboarding</button>
    </form>
  );
}
