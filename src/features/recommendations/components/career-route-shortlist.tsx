'use client';

import { useState, useTransition } from 'react';
import type { RecommendationRoute } from '../schemas/recommendation.schema';

type SelectionInput = {
  recommendationSetId: string;
  selectedRouteId: string;
};

type CareerRouteShortlistProps = {
  recommendationSetId: string;
  routes: RecommendationRoute[];
  selectedRouteId?: string;
  onSelect?: (input: SelectionInput) => Promise<unknown>;
};

function formatRouteLabel(route: RecommendationRoute) {
  return [route.roleId, route.sectorId, route.seniorityId].filter(Boolean).join(' / ');
}

export function CareerRouteShortlist(props: CareerRouteShortlistProps) {
  const [activeRouteId, setActiveRouteId] = useState(props.selectedRouteId ?? '');
  const [pending, startTransition] = useTransition();

  const hasRoutes = props.routes.length > 0;

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">
          Rutas sugeridas para tu transicion
        </h2>
        <p className="text-sm text-slate-600">
          Elige una ruta para mantener consistencia en traduccion, preview y exportacion.
        </p>
      </header>

      {!hasRoutes ? (
        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            No hay rutas sugeridas disponibles en este momento.
          </p>
          <p className="text-sm text-slate-600">
            Completa tu perfil para volver a generar sugerencias.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {props.routes.map((route) => {
            const isSelected = activeRouteId === route.routeId;

            return (
              <li
                key={route.routeId}
                data-route-id={route.routeId}
                className={`rounded-lg border p-3 ${
                  isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{formatRouteLabel(route)}</p>
                  {isSelected ? (
                    <span data-selected-badge className="text-xs font-semibold text-slate-900">
                      Seleccionada
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-slate-700">{route.reasonSummary}</p>

                <button
                  type="button"
                  data-action="select-route"
                  onClick={() => {
                    setActiveRouteId(route.routeId);

                    if (!props.onSelect) {
                      return;
                    }

                    startTransition(() => {
                      void props.onSelect?.({
                        recommendationSetId: props.recommendationSetId,
                        selectedRouteId: route.routeId,
                      });
                    });
                  }}
                  disabled={pending}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSelected ? 'Cambiar ruta' : 'Seleccionar ruta'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export type { CareerRouteShortlistProps, SelectionInput as CareerRouteSelectionInput };
