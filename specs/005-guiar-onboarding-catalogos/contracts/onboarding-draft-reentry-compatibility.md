# Contract: Onboarding Draft Re-entry Compatibility

## Boundary

- **Producer**: `user_wizard_state.aggregated_draft_jsonb`
- **Consumer**: `get-onboarding-overview.ts` + onboarding pages defaults + downstream services
- **Related consumers**: recommendations/profile/translation pipeline

## Input Contract (Persisted Draft)

`aggregated_draft_jsonb` puede contener mezcla de:

- formato legacy (texto libre),
- formato guiado (ids catalogados),
- `employabilityFlow` con trazas ya existentes.

## Output Contract (Re-entry)

`getOnboardingOverview` devuelve:

- `draft` parseado con defaults deterministas,
- continuidad de `employabilityFlow` intacta,
- fallback seguro para valores legacy invalidos en campos estructurados.

## Rules

1. Reingreso nunca debe perder progreso util por cambio de tipo de control.
2. `employabilityFlow` no se descarta por cambios del onboarding.
3. Valores legacy fuera de catalogo en campos estructurados se degradan sin romper carga.
4. Campos narrativos legacy se preservan segun contrato narrativo.
5. Pipeline downstream (recommendations/translation/profile) sigue operando con shape compatible.

## Evidence Paths

- `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.test.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.ts`
- `/home/svens/dev/brujula-civil/src/features/recommendations/services/build-recommendation-input.ts`
- `/home/svens/dev/brujula-civil/src/features/profile/server/project-wizard-to-profiles.ts`
