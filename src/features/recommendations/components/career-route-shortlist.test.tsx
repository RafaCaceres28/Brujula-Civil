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

    const selectedBadge = container?.querySelector(
      '[data-route-id="route-project-manager-consulting-mid"] [data-selected-badge]',
    );
    expect(selectedBadge).not.toBeNull();
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
