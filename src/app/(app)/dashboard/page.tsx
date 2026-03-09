import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  FormField,
  Input,
  Spinner,
  Textarea,
} from '@/components/ui';

export default function DashboardPage() {
  return (
    <PageShell>
      <SectionHeader
        title="Dashboard"
        description="Resumen general del progreso del usuario dentro de Brújula Civil."
        action={<Button>Acción principal</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Estado del perfil"
            description="Base visual de tarjetas y acciones reutilizables."
          />
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Este bloque valida la consistencia de la capa UI inicial.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primario</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Prueba de formulario"
            description="Inputs base para los formularios del onboarding y perfil."
          />
          <CardContent className="space-y-4">
            <FormField
              label="Puesto militar"
              htmlFor="puesto"
              hint="Ejemplo: Cabo primero, operador RF, mantenimiento, logística."
            >
              <Input id="puesto" placeholder="Introduce tu puesto o especialidad" />
            </FormField>

            <FormField
              label="Resumen"
              htmlFor="resumen"
              hint="Texto orientado a traducción futura del perfil."
            >
              <Textarea
                id="resumen"
                placeholder="Describe funciones, responsabilidad, entorno operativo y competencias."
              />
            </FormField>

            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary">Guardar borrador</Button>
              <Spinner label="Componente de carga" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
