import type { DomainErrorCode } from '@/lib/contracts';
import type { CvDomainOutput } from '@/features/cv/types/cv.types';

type TranslationPreviewState = 'loading' | 'empty' | 'error' | 'ready';

type TranslationTraceability = {
  profileSnapshotId?: string;
  previewCompleteness?: CvDomainOutput['completeness'];
};

type TranslationPreviewProps = {
  state: TranslationPreviewState;
  profileSummary?: string | null;
  blocks?: Array<{ id: string; content: string }>;
  cvSections?: CvDomainOutput['sections'];
  traceability?: TranslationTraceability;
  error?: unknown;
  retryHref?: string;
  explainabilityStatus?: 'complete' | 'partial';
  reentrySelectedRouteId?: string;
  reentrySelectedRouteContext?: {
    reasonSummary: string;
    fitLabel: string;
    guidance: string;
  };
  reentrySelectedRouteContextFallback?: boolean;
};

const USER_SAFE_ERROR_MESSAGE_BY_CODE: Record<DomainErrorCode, string> = {
  VALIDATION_ERROR: 'Necesitamos revisar los datos antes de continuar. Intenta de nuevo.',
  NOT_FOUND: 'No encontramos los datos necesarios para continuar con la traduccion.',
  CONFLICT: 'Detectamos cambios recientes en tu flujo. Recarga e intenta nuevamente.',
  UNAUTHORIZED: 'Tu sesion no es valida. Inicia sesion de nuevo para continuar.',
  FORBIDDEN: 'No tienes permisos para completar esta accion.',
  EXTERNAL_DEPENDENCY_ERROR:
    'El servicio de traduccion no esta disponible por ahora. Intenta nuevamente en unos minutos.',
  RATE_LIMITED: 'Recibimos demasiadas solicitudes seguidas. Espera un momento e intenta otra vez.',
  INTERNAL_ERROR: 'No pudimos completar la traduccion por ahora. Intenta nuevamente.',
};

function toDomainErrorCode(error: unknown): DomainErrorCode | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  if (!('code' in error) || typeof error.code !== 'string') {
    return null;
  }

  if (!(error.code in USER_SAFE_ERROR_MESSAGE_BY_CODE)) {
    return null;
  }

  return error.code as DomainErrorCode;
}

export function mapTranslationErrorToUserMessage(error: unknown): string {
  const code = toDomainErrorCode(error);
  if (!code) {
    return USER_SAFE_ERROR_MESSAGE_BY_CODE.INTERNAL_ERROR;
  }

  return USER_SAFE_ERROR_MESSAGE_BY_CODE[code];
}

function renderRetryAction(retryHref: string | undefined) {
  if (!retryHref) {
    return null;
  }

  return (
    <a
      href={retryHref}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900"
    >
      Reintentar
    </a>
  );
}

function renderTraceability(traceability: TranslationTraceability | undefined) {
  if (!traceability) {
    return null;
  }

  return (
    <ul className="space-y-1 text-xs text-slate-500" data-testid="translation-traceability">
      <li>Origen perfil: {traceability.profileSnapshotId ?? 'pendiente'}</li>
      <li>Estado preview: {traceability.previewCompleteness ?? 'pendiente'}</li>
    </ul>
  );
}

export function TranslationPreview(props: TranslationPreviewProps) {
  if (props.state === 'loading') {
    return (
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Traduccion profesional</h2>
        <p role="status" className="text-sm text-slate-600">
          Estamos preparando la traduccion y el primer preview del CV.
        </p>
      </section>
    );
  }

  if (props.state === 'empty') {
    return (
      <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">No hay datos suficientes</h2>
        <p className="text-sm text-slate-700">
          Necesitas completar tu perfil para generar una traduccion profesional.
        </p>
        {renderRetryAction(props.retryHref)}
      </section>
    );
  }

  if (props.state === 'error') {
    return (
      <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          No pudimos completar la traduccion
        </h2>
        <p role="alert" className="text-sm text-red-700">
          {mapTranslationErrorToUserMessage(props.error)}
        </p>
        {renderRetryAction(props.retryHref)}
      </section>
    );
  }

  return (
    <>
      {props.explainabilityStatus === 'partial' ? (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Explicacion parcial de rutas</h2>
          <p className="text-sm text-slate-700">
            Algunas recomendaciones no tienen todos los detalles aun. Puedes avanzar y ajustar tu
            eleccion cuando tengas mas contexto.
          </p>
        </section>
      ) : null}

      {props.reentrySelectedRouteId ? (
        <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Contexto recuperado de tu ruta seleccionada
          </h2>
          <p className="text-xs text-slate-600">Ruta activa: {props.reentrySelectedRouteId}</p>
          {props.reentrySelectedRouteContext ? (
            <>
              <p className="text-sm text-slate-700">
                {props.reentrySelectedRouteContext.reasonSummary}
              </p>
              <p className="text-sm text-slate-700">
                Ajuste recuperado: {props.reentrySelectedRouteContext.fitLabel}
              </p>
              <p className="text-sm text-slate-700">{props.reentrySelectedRouteContext.guidance}</p>
            </>
          ) : props.reentrySelectedRouteContextFallback ? (
            <p className="text-sm text-amber-700">
              Recuperamos tu ruta seleccionada, pero faltan detalles explicativos en esta sesion.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Perfil fuente</h2>
        <p className="text-sm text-slate-700">{props.profileSummary ?? 'Sin resumen cargado.'}</p>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Traduccion profesional</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {(props.blocks ?? []).map((block) => (
            <li key={block.id}>{block.content}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Primer preview CV</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {(props.cvSections ?? []).map((section) => (
            <li key={section.id}>
              <strong>{section.title}:</strong> {section.content}
            </li>
          ))}
        </ul>
        {renderTraceability(props.traceability)}
      </section>
    </>
  );
}

export type { TranslationPreviewProps, TranslationPreviewState };
