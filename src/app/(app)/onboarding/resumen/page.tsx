import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { requireUser } from '@/features/auth/server/require-user';
import { saveResumenStepAction } from '@/features/wizard/actions/save-resumen-step-action';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { WizardStepActions } from '@/features/wizard/components/wizard-step-actions';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { getResumenStepDefaults } from '@/features/wizard/services/wizard-form.mapper';

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        {items.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Sin información todavía.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ResumenStepPage() {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);
  const values = getResumenStepDefaults(overview.draft.resumen);

  const { militar, experiencia, competencias, objetivos } = overview.draft;

  return (
    <StepGuard requestedStepSlug="resumen" wizardState={overview.state}>
      <WizardShell
        title="Resumen final"
        description="Revisa la información consolidada. Al finalizar, se proyectará a tu perfil militar y a tu perfil civil base."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Perfil militar" />
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>Ejército:</strong> {militar.army ?? '—'}
              </p>
              <p>
                <strong>Cuerpo:</strong> {militar.cuerpo ?? '—'}
              </p>
              <p>
                <strong>Rango:</strong> {militar.rank ?? '—'}
              </p>
              <p>
                <strong>Especialidad:</strong> {militar.specialty ?? '—'}
              </p>
              <p>
                <strong>Años de servicio:</strong> {militar.yearsOfService ?? '—'}
              </p>
              <p>
                <strong>Destino:</strong> {militar.destinationType ?? '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Objetivos profesionales" />
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>Roles objetivo:</strong> {objetivos.targetRoles.join(', ') || '—'}
              </p>
              <p>
                <strong>Sectores objetivo:</strong> {objetivos.targetSectors.join(', ') || '—'}
              </p>
              <p>
                <strong>Ubicaciones:</strong> {objetivos.preferredLocations.join(', ') || '—'}
              </p>
              <p>
                <strong>Modelo:</strong> {objetivos.workModel ?? '—'}
              </p>
            </CardContent>
          </Card>

          <SectionList title="Responsabilidades" items={experiencia.responsibilities} />
          <SectionList title="Misiones" items={experiencia.missions} />
          <SectionList title="Logros" items={experiencia.achievements} />
          <SectionList title="Herramientas" items={experiencia.tools} />
          <SectionList title="Skills técnicas" items={competencias.technicalSkills} />
          <SectionList title="Soft skills" items={competencias.softSkills} />
          <SectionList title="Certificaciones" items={competencias.certifications} />
          <SectionList title="Idiomas" items={competencias.languages} />
        </div>

        <form action={saveResumenStepAction} className="space-y-6">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input
              id="confirmed"
              name="confirmed"
              type="checkbox"
              defaultChecked={values.confirmed}
              className="mt-0.5"
            />
            <span>
              Confirmo que esta información es la base correcta para generar mi perfil civil, mi CV
              y mi contenido de LinkedIn.
            </span>
          </label>

          <WizardStepActions stepSlug="resumen" submitLabel="Finalizar onboarding" />
        </form>
      </WizardShell>
    </StepGuard>
  );
}
