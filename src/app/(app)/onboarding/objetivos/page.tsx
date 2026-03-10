import { requireUser } from '@/features/auth/server/require-user';
import { saveObjetivosStepAction } from '@/features/wizard/actions/save-objetivos-step-action';
import { getOnboardingStep } from '@/features/wizard/server/get-onboarding-step';

export default async function ObjetivosStepPage() {
  const user = await requireUser();
  const stepState = await getOnboardingStep(user.id, 'objetivos');

  const payload = (stepState?.payload_jsonb ?? {}) as {
    targetRoles?: string[];
    targetSectors?: string[];
    preferredLocations?: string[];
    workModel?: 'onsite' | 'hybrid' | 'remote' | null;
  };

  return (
    <form action={saveObjetivosStepAction} className="space-y-4">
      <div>
        <label htmlFor="targetRoles">Roles objetivo</label>
        <textarea
          id="targetRoles"
          name="targetRoles"
          defaultValue={(payload.targetRoles ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="targetSectors">Sectores objetivo</label>
        <textarea
          id="targetSectors"
          name="targetSectors"
          defaultValue={(payload.targetSectors ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="preferredLocations">Ubicaciones preferidas</label>
        <textarea
          id="preferredLocations"
          name="preferredLocations"
          defaultValue={(payload.preferredLocations ?? []).join('\n')}
        />
      </div>

      <div>
        <label htmlFor="workModel">Modelo de trabajo</label>
        <select id="workModel" name="workModel" defaultValue={payload.workModel ?? ''}>
          <option value="">Selecciona una opción</option>
          <option value="onsite">Presencial</option>
          <option value="hybrid">Híbrido</option>
          <option value="remote">Remoto</option>
        </select>
      </div>

      <button type="submit">Guardar y continuar</button>
    </form>
  );
}
