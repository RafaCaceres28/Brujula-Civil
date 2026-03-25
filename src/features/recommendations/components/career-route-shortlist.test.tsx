import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CareerRouteShortlist } from './career-route-shortlist';

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

function renderShortlist(options?: {
  selectedRouteId?: string;
  onSelect?: (input: { recommendationSetId: string; selectedRouteId: string }) => Promise<void>;
}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
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
              fitScore: 68,
              explanationKeywords: ['planificacion', 'liderazgo'],
              decisionGuidance: 'Comparala si quieres equilibrio entre estrategia y ejecucion.',
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
              fitLabel: 'medio',
              fitScore: 62,
              explanationKeywords: ['supervision', 'comunicacion'],
              decisionGuidance: 'Usala para evaluar un rol de liderazgo tecnico.',
            },
          },
        ]}
        selectedRouteId={options?.selectedRouteId}
        onSelect={options?.onSelect}
      />,
    );
  });
}

describe('CareerRouteShortlist', () => {
  it('renders all routes and highlights current selection', () => {
    renderShortlist({ selectedRouteId: 'route-project-manager-consulting-mid' });

    expect(container?.textContent).toContain('Rutas sugeridas para tu transicion');
    expect(container?.textContent).toContain('operations-coordinator');
    expect(container?.textContent).toContain('project-manager');
    expect(container?.textContent).toContain('Ajuste alto');
    expect(container?.textContent).toContain('Ajuste medio');
    expect(container?.textContent).toContain('Fortalezas detectadas');
    expect(container?.textContent).toContain('logistica');
    expect(container?.textContent).toContain(
      'Comparala si quieres equilibrio entre estrategia y ejecucion.',
    );

    const selectedBadge = container?.querySelector(
      '[data-route-id="route-project-manager-consulting-mid"] [data-selected-badge]',
    );
    expect(selectedBadge).not.toBeNull();
  });

  it('uses safe fallback copy when route explanation is incomplete', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <CareerRouteShortlist
          recommendationSetId="recset-snapshot-1-20260324010101"
          routes={[
            {
              routeId: 'route-operations-coordinator-logistics-mid',
              roleId: 'operations-coordinator',
              sectorId: 'logistics',
              reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
              matchedSignals: ['TARGET_ROLE_HINT'],
            },
            {
              routeId: 'route-project-manager-consulting-mid',
              roleId: 'project-manager',
              sectorId: 'consulting',
              reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
              matchedSignals: ['TARGET_SECTOR_HINT'],
              explanation: {
                reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
                fitLabel: 'medio',
                fitScore: 68,
                explanationKeywords: ['planificacion', 'liderazgo'],
                decisionGuidance: 'Comparala con otras rutas y prioriza la mas realista.',
              },
            },
            {
              routeId: 'route-team-lead-technology-mid',
              roleId: 'team-lead',
              sectorId: 'technology',
              reasonSummary: 'Se recomienda por supervision y comunicacion.',
              matchedSignals: ['LEADERSHIP_MATCH'],
              explanation: {
                reasonSummary: 'Se recomienda por supervision y comunicacion.',
                fitLabel: 'exploratorio',
                fitScore: 42,
                explanationKeywords: ['supervision', 'comunicacion'],
                decisionGuidance: 'Usala para evaluar una ruta alternativa.',
              },
            },
          ]}
        />,
      );
    });

    expect(container?.textContent).toContain('Ajuste exploratorio');
    expect(container?.textContent).toContain(
      'Aun no tenemos suficientes detalles para explicar esta ruta con precision.',
    );
    expect(container?.textContent).toContain(
      'Fortalezas detectadas: objetivo profesional definido',
    );
  });

  it('allows selecting and changing the selected route', async () => {
    const onSelect = vi.fn().mockResolvedValue(undefined);
    renderShortlist({ onSelect });

    const firstRoute = container?.querySelector<HTMLButtonElement>(
      '[data-route-id="route-operations-coordinator-logistics-mid"] [data-action="select-route"]',
    );
    const secondRoute = container?.querySelector<HTMLButtonElement>(
      '[data-route-id="route-project-manager-consulting-mid"] [data-action="select-route"]',
    );

    await act(async () => {
      firstRoute?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenNthCalledWith(1, {
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
    });

    await act(async () => {
      secondRoute?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenNthCalledWith(2, {
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-project-manager-consulting-mid',
    });

    const selectedBadge = container?.querySelector(
      '[data-route-id="route-project-manager-consulting-mid"] [data-selected-badge]',
    );
    expect(selectedBadge).not.toBeNull();
  });
});
