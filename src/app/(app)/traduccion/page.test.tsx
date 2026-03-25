import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { CareerRouteShortlist } from '../../../features/recommendations/components/career-route-shortlist';
import {
  TranslationPreview,
  type TranslationPreviewProps,
} from '../../../features/translation/components/translation-preview';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (!container) {
    return;
  }

  act(() => {
    root?.unmount();
    container?.remove();
  });

  container = null;
  root = null;
});

function renderNode(node: ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(node);
  });
}

function renderContent(props: TranslationPreviewProps) {
  renderNode(<TranslationPreview {...props} />);
}

describe('/traduccion page UI states', () => {
  it('renders loading state with user-facing progress message', () => {
    renderContent({ state: 'loading' });

    const status = container?.querySelector<HTMLElement>('[role="status"]');

    expect(status?.textContent).toContain(
      'Estamos preparando la traduccion y el primer preview del CV.',
    );
  });

  it('renders empty state with actionable profile completion link', () => {
    renderContent({ state: 'empty', retryHref: '/perfil' });

    const link = container?.querySelector<HTMLAnchorElement>('a[href="/perfil"]');

    expect(container?.textContent).toContain('No hay datos suficientes');
    expect(link?.textContent).toContain('Reintentar');
  });

  it('renders safe error state without internal details and with retry action', () => {
    renderContent({
      state: 'error',
      retryHref: '/traduccion',
      error: {
        code: 'INTERNAL_ERROR',
        message: 'supabase timeout with stack trace',
      },
    });

    const alert = container?.querySelector<HTMLElement>('[role="alert"]');
    const retryLink = container?.querySelector<HTMLAnchorElement>('a[href="/traduccion"]');

    expect(alert?.textContent).toContain(
      'No pudimos completar la traduccion por ahora. Intenta nuevamente.',
    );
    expect(alert?.textContent).not.toContain('supabase timeout with stack trace');
    expect(retryLink?.textContent).toContain('Reintentar');
  });

  it('renders recommendation shortlist in ready state', () => {
    renderNode(
      <CareerRouteShortlist
        recommendationSetId="recset-snapshot-1-20260324010101"
        routes={[
          {
            routeId: 'route-operations-coordinator-logistics-mid',
            roleId: 'operations-coordinator',
            sectorId: 'logistics',
            seniorityId: 'mid',
            reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
            matchedSignals: ['TARGET_ROLE_HINT'],
            explanation: {
              reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
              fitLabel: 'alto',
              fitScore: 90,
              explanationKeywords: ['logistica', 'coordinacion'],
              decisionGuidance: 'Priorizala si quieres continuidad operativa inmediata.',
            },
          },
          {
            routeId: 'route-project-manager-consulting-mid',
            roleId: 'project-manager',
            sectorId: 'consulting',
            seniorityId: 'mid',
            reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
            matchedSignals: ['TARGET_SECTOR_HINT'],
            explanation: {
              reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
              fitLabel: 'medio',
              fitScore: 66,
              explanationKeywords: ['planificacion', 'liderazgo'],
              decisionGuidance: 'Comparala con otras rutas antes de decidir.',
            },
          },
          {
            routeId: 'route-team-lead-technology-mid',
            roleId: 'team-lead',
            sectorId: 'technology',
            seniorityId: 'mid',
            reasonSummary: 'Se recomienda por supervision y comunicacion.',
            matchedSignals: ['LEADERSHIP_MATCH'],
            explanation: {
              reasonSummary: 'Se recomienda por supervision y comunicacion.',
              fitLabel: 'exploratorio',
              fitScore: 44,
              explanationKeywords: ['supervision', 'comunicacion'],
              decisionGuidance: 'Usala para explorar una opcion alternativa.',
            },
          },
        ]}
        selectedRouteId="route-project-manager-consulting-mid"
      />,
    );

    expect(container?.textContent).toContain('Rutas sugeridas para tu transicion');
    expect(container?.textContent).toContain('operations-coordinator');
    expect(container?.textContent).toContain('project-manager');
    expect(container?.textContent).toContain('Ajuste alto');
    expect(container?.textContent).toContain('Fortalezas detectadas');
    expect(container?.textContent).toContain('Seleccionada');
  });

  it('renders safe fallback copy when recommendation explainability is incomplete', () => {
    renderNode(
      <CareerRouteShortlist
        recommendationSetId="recset-safe-fallback"
        routes={[
          {
            routeId: 'route-operations-coordinator-logistics-mid',
            roleId: 'operations-coordinator',
            sectorId: 'logistics',
            seniorityId: 'mid',
            reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
            matchedSignals: ['UNKNOWN_REASON_CODE'],
          },
          {
            routeId: 'route-project-manager-consulting-mid',
            roleId: 'project-manager',
            sectorId: 'consulting',
            seniorityId: 'mid',
            reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
            matchedSignals: ['TARGET_SECTOR_HINT'],
          },
          {
            routeId: 'route-team-lead-technology-mid',
            roleId: 'team-lead',
            sectorId: 'technology',
            seniorityId: 'mid',
            reasonSummary: 'Se recomienda por supervision y comunicacion.',
            matchedSignals: ['LEADERSHIP_MATCH'],
          },
        ]}
      />,
    );

    expect(container?.textContent).toContain(
      'Aun no tenemos suficientes detalles para explicar esta ruta con precision.',
    );
    expect(container?.textContent).toContain('Ajuste exploratorio');
    expect(container?.textContent).toContain('Fortalezas detectadas: perfil transferible');
  });

  it('renders actionable UX when recommendation shortlist is empty', () => {
    renderNode(<CareerRouteShortlist recommendationSetId="recset-empty" routes={[]} />);

    expect(container?.textContent).toContain('No hay rutas sugeridas disponibles en este momento.');
    expect(container?.textContent).toContain(
      'Completa tu perfil para volver a generar sugerencias.',
    );
  });

  it('renders recovered explanation context after re-entry', () => {
    renderContent({
      state: 'ready',
      profileSummary: 'Resumen profesional',
      blocks: [],
      cvSections: [],
      reentrySelectedRouteId: 'route-operations-coordinator-logistics-mid',
      reentrySelectedRouteContext: {
        reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
        fitLabel: 'alto',
        guidance: 'Priorizala si quieres continuidad operativa inmediata.',
      },
    });

    expect(container?.textContent).toContain('Contexto recuperado de tu ruta seleccionada');
    expect(container?.textContent).toContain('Ajuste recuperado: alto');
    expect(container?.textContent).toContain(
      'Priorizala si quieres continuidad operativa inmediata.',
    );
  });

  it('renders safe fallback notice when re-entry context is missing', () => {
    renderContent({
      state: 'ready',
      profileSummary: 'Resumen profesional',
      blocks: [],
      cvSections: [],
      reentrySelectedRouteId: 'route-operations-coordinator-logistics-mid',
      reentrySelectedRouteContextFallback: true,
    });

    expect(container?.textContent).toContain('Contexto recuperado de tu ruta seleccionada');
    expect(container?.textContent).toContain(
      'Recuperamos tu ruta seleccionada, pero faltan detalles explicativos en esta sesion.',
    );
  });
});
