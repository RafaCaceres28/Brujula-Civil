# Contract: Onboarding Save Boundary with Catalog Validation

## Boundary

- **Entry**: `save-*-step-action.ts`
- **Validation/Mapping**: `wizard-form.mapper.ts` + `wizard.schema.ts`
- **Persistence**: `save-onboarding-step.ts`

## Input Contract

`FormData` de cada paso con:

- structured fields como ids de catalogo (single/multi/compound),
- narrative fields como texto libre acotado,
- `confirmed` en resumen como boolean.

## Validation Contract

1. `wizard-form.mapper.ts` convierte `FormData` a payload tipado.
2. `wizard.schema.ts` valida payload final.
3. Valores estructurados fuera de catalogo se rechazan antes de persistir.

## Persistence Contract

`save-onboarding-step.ts` debe:

1. upsert de paso en `wizard_step_states`;
2. merge del draft actual con payload validado;
3. preservar `employabilityFlow` existente (recommendations/selectedRoute/trazas);
4. actualizar `lastOnboardingStep` y `lastUpdatedAt`.

## Error Contract

- Error tecnico interno: log/server error con contexto.
- Error visible: mensaje seguro, sin detalles de proveedor ni SQL.
- No exponer estructuras internas de validacion a UI final.

## Evidence Paths

- `/home/svens/dev/brujula-civil/src/features/wizard/actions/save-militar-step-action.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/actions/save-experiencia-step-action.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/actions/save-competencias-step-action.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/actions/save-objetivos-step-action.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.test.ts`
