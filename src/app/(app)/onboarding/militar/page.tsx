import { requireUser } from '@/features/auth/server/require-user';
import { saveMilitarStepAction } from '@/features/wizard/actions/save-militar-step-action';
import { getOnboardingStep } from '@/features/wizard/server/get-onboarding-step';

export default async function MilitarStepPage() {
  const user = await requireUser();
  const stepState = await getOnboardingStep(user.id, 'militar');

  const payload = (stepState?.payload_jsonb ?? {}) as {
    army?: string | null;
    cuerpo?: string | null;
    rank?: string | null;
    specialty?: string | null;
    yearsOfService?: number | null;
    destinationType?: string | null;
  };

  return (
    <form action={saveMilitarStepAction} className="space-y-4">
      <div>
        <label htmlFor="army">Ejército</label>
        <input id="army" name="army" defaultValue={payload.army ?? ''} />
      </div>

      <div>
        <label htmlFor="cuerpo">Cuerpo</label>
        <input id="cuerpo" name="cuerpo" defaultValue={payload.cuerpo ?? ''} />
      </div>

      <div>
        <label htmlFor="rank">Empleo / rango</label>
        <input id="rank" name="rank" defaultValue={payload.rank ?? ''} />
      </div>

      <div>
        <label htmlFor="specialty">Especialidad</label>
        <input id="specialty" name="specialty" defaultValue={payload.specialty ?? ''} />
      </div>

      <div>
        <label htmlFor="yearsOfService">Años de servicio</label>
        <input
          id="yearsOfService"
          name="yearsOfService"
          type="number"
          defaultValue={payload.yearsOfService ?? ''}
        />
      </div>

      <div>
        <label htmlFor="destinationType">Tipo de destino</label>
        <input
          id="destinationType"
          name="destinationType"
          defaultValue={payload.destinationType ?? ''}
        />
      </div>

      <button type="submit">Guardar y continuar</button>
    </form>
  );
}
