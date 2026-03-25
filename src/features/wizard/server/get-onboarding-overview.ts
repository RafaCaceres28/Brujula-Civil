import { createClient } from '@/lib/supabase/server';
import { selectedRouteContextSchema } from '../../recommendations/schemas/recommendation.schema';
import {
  employabilityFlowDraftSchema,
  onboardingDraftStateSchema,
} from '../schemas/wizard-state.schema';
import type { OnboardingOverview } from '../types/wizard.types';

function isSameSelectedRoute(
  selectedRoute:
    | {
        recommendationSetId: string;
        selectedRouteId: string;
      }
    | undefined,
  selectedRouteContext:
    | {
        recommendationSetId: string;
        selectedRouteId: string;
      }
    | undefined,
) {
  if (!selectedRoute || !selectedRouteContext) {
    return true;
  }

  return (
    selectedRoute.recommendationSetId === selectedRouteContext.recommendationSetId &&
    selectedRoute.selectedRouteId === selectedRouteContext.selectedRouteId
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCatalogToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function getLegacyObsoleteTargetRoleLabels(
  aggregatedDraft: Record<string, unknown>,
  parsedTargetRoles: Array<{ slug: string; label: string }>,
) {
  const objetivos = isRecord(aggregatedDraft.objetivos) ? aggregatedDraft.objetivos : null;
  if (!objetivos || !Array.isArray(objetivos.targetRoles)) {
    return [];
  }

  const selectedSlugs = new Set(parsedTargetRoles.map((role) => role.slug));
  const selectedLabels = new Set(
    parsedTargetRoles.map((role) => normalizeCatalogToken(role.label)).filter(Boolean),
  );
  const obsoleteLabels = new Set<string>();

  for (const item of objetivos.targetRoles) {
    if (isRecord(item)) {
      const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
      const label = typeof item.label === 'string' ? item.label.trim() : '';

      if (
        (slug && selectedSlugs.has(slug)) ||
        (label && selectedLabels.has(normalizeCatalogToken(label)))
      ) {
        continue;
      }

      const candidate = label || slug;
      if (candidate) {
        obsoleteLabels.add(candidate);
      }

      continue;
    }

    if (typeof item !== 'string') {
      continue;
    }

    const candidate = item.trim();
    if (!candidate) {
      continue;
    }

    if (selectedSlugs.has(candidate) || selectedLabels.has(normalizeCatalogToken(candidate))) {
      continue;
    }

    obsoleteLabels.add(candidate);
  }

  return Array.from(obsoleteLabels);
}

function applyLegacyNarrativeFallback(
  draft: OnboardingOverview['draft'],
  aggregatedDraft: Record<string, unknown>,
): OnboardingOverview['draft'] {
  const obsoleteRoles = getLegacyObsoleteTargetRoleLabels(
    aggregatedDraft,
    draft.objetivos.targetRoles,
  );
  if (obsoleteRoles.length === 0) {
    return draft;
  }

  const fallbackNote = `Rol objetivo legacy no disponible: ${obsoleteRoles.join(', ')}`;
  const currentNotes = draft.objetivos.preferencesNotes?.trim();

  return {
    ...draft,
    objetivos: {
      ...draft.objetivos,
      preferencesNotes: currentNotes ? `${currentNotes}\n${fallbackNote}` : fallbackNote,
    },
  };
}

function parseEmployabilityFlow(input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  const parsedFlow = employabilityFlowDraftSchema.safeParse(input);

  if (parsedFlow.success) {
    const normalizedFlow =
      parsedFlow.data.selectedRoute || !parsedFlow.data.selectedRecommendation
        ? parsedFlow.data
        : {
            ...parsedFlow.data,
            selectedRoute: parsedFlow.data.selectedRecommendation,
          };

    if (!normalizedFlow.selectedRouteContext) {
      return normalizedFlow;
    }

    const selectedRoute = normalizedFlow.selectedRoute ?? normalizedFlow.selectedRecommendation;

    if (
      !selectedRoute ||
      !isSameSelectedRoute(selectedRoute, normalizedFlow.selectedRouteContext)
    ) {
      return {
        ...normalizedFlow,
        selectedRouteContext: undefined,
      };
    }

    const parsedSelectedRouteContext = selectedRouteContextSchema.safeParse(
      normalizedFlow.selectedRouteContext,
    );

    if (!parsedSelectedRouteContext.success) {
      return {
        ...normalizedFlow,
        selectedRouteContext: undefined,
      };
    }

    return {
      ...normalizedFlow,
      selectedRouteContext: parsedSelectedRouteContext.data,
    };
  }

  const sanitizedInput = { ...input };

  if ('selectedRouteContext' in sanitizedInput) {
    delete sanitizedInput.selectedRouteContext;
  }

  const parsedWithoutContext = employabilityFlowDraftSchema.safeParse(sanitizedInput);

  if (!parsedWithoutContext.success) {
    return undefined;
  }

  const selectedRoute =
    parsedWithoutContext.data.selectedRoute ?? parsedWithoutContext.data.selectedRecommendation;

  if (!selectedRoute) {
    return parsedWithoutContext.data;
  }

  if (
    !isRecord(input.selectedRouteContext) ||
    !isSameSelectedRoute(
      selectedRoute,
      input.selectedRouteContext as {
        recommendationSetId: string;
        selectedRouteId: string;
      },
    )
  ) {
    return {
      ...parsedWithoutContext.data,
      ...(parsedWithoutContext.data.selectedRoute
        ? {}
        : { selectedRoute: parsedWithoutContext.data.selectedRecommendation }),
    };
  }

  const parsedSelectedRouteContext = selectedRouteContextSchema.safeParse(
    input.selectedRouteContext,
  );

  if (!parsedSelectedRouteContext.success) {
    return {
      ...parsedWithoutContext.data,
      ...(parsedWithoutContext.data.selectedRoute
        ? {}
        : { selectedRoute: parsedWithoutContext.data.selectedRecommendation }),
    };
  }

  return {
    ...parsedWithoutContext.data,
    ...(parsedWithoutContext.data.selectedRoute
      ? {}
      : { selectedRoute: parsedWithoutContext.data.selectedRecommendation }),
    selectedRouteContext: parsedSelectedRouteContext.data,
  };
}

export async function getOnboardingOverview(userId: string): Promise<OnboardingOverview> {
  const supabase = await createClient();

  const [{ data: state, error: stateError }, { data: steps, error: stepsError }] =
    await Promise.all([
      supabase.from('user_wizard_state').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('wizard_step_states')
        .select('*')
        .eq('user_id', userId)
        .order('step_order', { ascending: true }),
    ]);

  if (stateError) {
    throw new Error(`Error loading user_wizard_state: ${stateError.message}`);
  }

  if (stepsError) {
    throw new Error(`Error loading wizard_step_states: ${stepsError.message}`);
  }

  const aggregatedDraft = isRecord(state?.aggregated_draft_jsonb)
    ? state.aggregated_draft_jsonb
    : {};
  const parsedDraft = onboardingDraftStateSchema.parse(aggregatedDraft);
  const draft = applyLegacyNarrativeFallback(parsedDraft, aggregatedDraft);
  const employabilityFlow = parseEmployabilityFlow(aggregatedDraft.employabilityFlow);
  const typedSteps = (steps ?? []) as OnboardingOverview['steps'];

  return {
    state: state as OnboardingOverview['state'],
    steps: typedSteps,
    completedStepKeys: typedSteps.filter((step) => step.is_completed).map((step) => step.step_key),
    draft,
    ...(employabilityFlow ? { employabilityFlow } : {}),
  };
}
