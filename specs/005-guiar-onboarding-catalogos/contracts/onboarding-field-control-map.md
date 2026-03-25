# Contract: Onboarding Field -> Guided Control Mapping

## Boundary

- **Producer**: onboarding UI pages `/onboarding/*`
- **Consumer**: `wizard-form.mapper.ts` + `wizard.schema.ts`
- **Catalog source**: `src/features/wizard/config/wizard-catalogs.ts`

## Input Contract (UI)

Cada campo estructurado se envia como ids de catalogo validos:

- single-select: `string`
- multi-select: `string[]`
- compound (`languages`): `{ name: string; level: string }[]` con ambos ids catalogados

Campos narrativos se mantienen como texto libre acotado.

## Output Contract (Parsed Payload)

`WizardPayloadBySlug` mantiene shape actual, pero con restricciones:

- Estructurados: solo valores del catalogo.
- Narrativos: string/arrays libres dentro de limites de longitud.

## Rules

1. Campos estructurados NO aceptan texto arbitrario.
2. Cualquier valor fuera de catalogo resulta en error de validacion de frontera.
3. `rank` y `specialty` mantienen `code` + `label`, pero `code` debe venir del catalogo.
4. `targetRoles` debe alinearse con opciones canonicas (`slug` estable), no slug generado desde texto libre.

## Evidence Paths

- `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/militar/page.tsx`
- `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/experiencia/page.tsx`
- `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/competencias/page.tsx`
- `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.tsx`
- `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.ts`
- `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.ts`
