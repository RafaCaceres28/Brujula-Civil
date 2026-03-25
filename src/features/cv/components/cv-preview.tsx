import type { CvDomainOutput } from '../types/cv.types';

type CvFlowStage = 'ready' | 'pending' | 'error';

type CvPreviewProps = {
  sections: CvDomainOutput['sections'];
  profileStage: CvFlowStage;
  translationStage: CvFlowStage;
  selectedRouteId: string | null;
  previewStage: CvFlowStage;
  pdfStage: CvFlowStage;
  previewVersionId: string | null;
};

function formatStage(stage: CvFlowStage): string {
  if (stage === 'ready') {
    return 'listo';
  }

  if (stage === 'error') {
    return 'error';
  }

  return 'pendiente';
}

export function CvPreview(props: CvPreviewProps) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">Preview de secciones</h2>
        <p className="text-sm text-slate-600">
          Verifica contenido y trazabilidad antes de exportar tu PDF.
        </p>
      </header>

      <ul
        className="list-disc space-y-1 pl-5 text-sm text-slate-700"
        data-testid="cv-preview-sections"
      >
        {props.sections.map((section) => (
          <li key={section.id}>
            <strong>{section.title}:</strong> {section.content}
          </li>
        ))}
      </ul>

      <ul
        className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
        data-testid="cv-flow-traceability"
      >
        <li>
          perfil {'->'} {formatStage(props.profileStage)}
        </li>
        <li>
          traduccion {'->'} {formatStage(props.translationStage)}
        </li>
        <li>
          ruta elegida {'->'} {props.selectedRouteId ?? 'pendiente'}
        </li>
        <li>
          preview {'->'} {formatStage(props.previewStage)}
        </li>
        <li>
          pdf {'->'} {formatStage(props.pdfStage)}
        </li>
        <li>
          version preview {'->'} {props.previewVersionId ?? 'pendiente'}
        </li>
      </ul>
    </section>
  );
}

export type { CvFlowStage, CvPreviewProps };
