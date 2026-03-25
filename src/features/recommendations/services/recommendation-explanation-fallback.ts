import type {
  RecommendationExplanation,
  RecommendationRoute,
} from '../schemas/recommendation.schema';

const MAX_EXPLANATION_KEYWORDS = 6;

const REASON_CODE_TO_STRENGTH: Record<string, string> = {
  TARGET_ROLE_HINT: 'objetivo profesional definido',
  TARGET_SECTOR_HINT: 'sector priorizado',
  SKILL_SIGNAL_MATCH: 'experiencia transferible',
  LEADERSHIP_MATCH: 'liderazgo de equipos',
  TEAM_SIZE_MATCH: 'gestion de equipos',
  PROFILE_BASELINE: 'perfil transferible',
};

function toStrengthLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed in REASON_CODE_TO_STRENGTH) {
    return REASON_CODE_TO_STRENGTH[trimmed];
  }

  return '';
}

function resolveReasonSummary(route: RecommendationRoute): string {
  const summary = route.explanation?.reasonSummary?.trim() || route.reasonSummary.trim();

  if (summary.length >= 8) {
    return summary;
  }

  return 'Tu perfil muestra experiencia transferible para esta ruta.';
}

function resolveFitLabel(
  explanation: RecommendationRoute['explanation'],
): RecommendationExplanation['fitLabel'] {
  if (explanation?.fitLabel) {
    return explanation.fitLabel;
  }

  const score = explanation?.fitScore;
  if (typeof score === 'number' && score >= 85) {
    return 'alto';
  }

  if (typeof score === 'number' && score >= 55) {
    return 'medio';
  }

  return 'exploratorio';
}

function resolveFitScore(explanation: RecommendationRoute['explanation']): number {
  if (typeof explanation?.fitScore === 'number') {
    return Math.max(0, Math.min(100, Math.round(explanation.fitScore)));
  }

  return 45;
}

function resolveKeywords(route: RecommendationRoute): string[] {
  const directKeywords = (route.explanation?.explanationKeywords ?? [])
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => keyword.length > 0);

  if (directKeywords.length > 0) {
    return [...new Set(directKeywords)].slice(0, MAX_EXPLANATION_KEYWORDS);
  }

  const inferredKeywords = route.matchedSignals
    .map(toStrengthLabel)
    .filter((keyword) => keyword.length > 0);

  if (inferredKeywords.length > 0) {
    return [...new Set(inferredKeywords)].slice(0, MAX_EXPLANATION_KEYWORDS);
  }

  return ['perfil transferible'];
}

function resolveDecisionGuidance(
  explanation: RecommendationRoute['explanation'],
  fitLabel: RecommendationExplanation['fitLabel'],
): string {
  const guidance = explanation?.decisionGuidance?.trim();
  if (guidance && guidance.length >= 8) {
    return guidance;
  }

  if (fitLabel === 'alto') {
    return 'Prioriza esta ruta si quieres continuidad profesional en el corto plazo.';
  }

  if (fitLabel === 'medio') {
    return 'Compara esta ruta con otras opciones antes de tomar una decision final.';
  }

  return 'Usa esta ruta como referencia inicial mientras reunes mas contexto.';
}

export function normalizeRouteExplainability(route: RecommendationRoute): RecommendationRoute {
  const reasonSummary = resolveReasonSummary(route);
  const fitLabel = resolveFitLabel(route.explanation);
  const explanation: RecommendationExplanation = {
    reasonSummary,
    fitLabel,
    fitScore: resolveFitScore(route.explanation),
    explanationKeywords: resolveKeywords(route),
    decisionGuidance: resolveDecisionGuidance(route.explanation, fitLabel),
  };

  return {
    ...route,
    reasonSummary,
    explanation,
  };
}

export function normalizeRecommendationRoutesExplainability(
  routes: RecommendationRoute[],
): RecommendationRoute[] {
  return routes.map(normalizeRouteExplainability);
}
