'use client';

import { useState, useTransition } from 'react';
import type { RecommendationRoute } from '../schemas/recommendation.schema';
import { normalizeRouteExplainability } from '../services/recommendation-explanation-fallback';

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
        <p className="text-sm text-slate-700">
          Guia rapida: prioriza ajuste alto para continuidad inmediata y compara ajuste medio si
          quieres alternativas.
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
            const normalizedRoute = normalizeRouteExplainability(route);
            const explanation = normalizedRoute.explanation!;
            const hadIncompleteExplanation =
              !route.explanation ||
              route.explanation.explanationKeywords.length === 0 ||
              route.explanation.decisionGuidance.trim().length === 0;
            const isSelected = activeRouteId === normalizedRoute.routeId;
            const fitLabel = `Ajuste ${explanation.fitLabel}`;
            const strengths = explanation.explanationKeywords.join(', ');

            return (
              <li
                key={normalizedRoute.routeId}
                data-route-id={normalizedRoute.routeId}
                className={`rounded-lg border p-3 ${
                  isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {formatRouteLabel(normalizedRoute)}
                  </p>
                  {isSelected ? (
                    <span data-selected-badge className="text-xs font-semibold text-slate-900">
                      Seleccionada
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-slate-700">{explanation.reasonSummary}</p>
                <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {fitLabel}
                </p>
                <p className="mt-2 text-sm text-slate-700">{explanation.decisionGuidance}</p>
                {isSelected ? (
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    Eleccion activa: esta guia se conservara al continuar a traduccion y preview.
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-600">Fortalezas detectadas: {strengths}</p>

                {hadIncompleteExplanation ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Aun no tenemos suficientes detalles para explicar esta ruta con precision.
                  </p>
                ) : null}

                <button
                  type="button"
                  data-action="select-route"
                  onClick={() => {
                    setActiveRouteId(normalizedRoute.routeId);

                    if (!props.onSelect) {
                      return;
                    }

                    startTransition(() => {
                      void props.onSelect?.({
                        recommendationSetId: props.recommendationSetId,
                        selectedRouteId: normalizedRoute.routeId,
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
