# Contract: Profile -> Translation

## Boundary

- **Producer**: `src/features/profile/services/profile.mapper.ts`
- **Consumer**: `src/features/translation/server/generate-translation.ts`
- **Entry points**:
  - `src/app/(app)/traduccion/page.tsx`
  - `src/app/api/translation/route.ts`

## Reused Contracts

- `profileSnapshotSchema`
- `translationInputSchema`
- `translationOutputSchema`
- `DomainResult` / `DomainError`

## Input Contract

`TranslationInput`:

- `userId: domainId`
- `sourceProfile: profile_snapshot | linkedin_normalized_profile`
- `sourceLanguage: locale`
- `targetLanguage: locale`
- `tone?: formal | neutral | concise`

## Output Contract

`DomainResult<TranslationOutput, DomainError>`:

- Success:
  - `blocks[]`
  - `sourceRefMap`
  - `qualityFlags[]`
- Failure:
  - `error.code` in `DOMAIN_ERROR_CODES`
  - `error.message` safe for user boundary mapping

## Rules

1. `sourceRefMap` DEBE referenciar `profileSnapshotId` origen.
2. No se permite `blocks` vacíos.
3. Errores de validación se devuelven como `VALIDATION_ERROR`.
4. Detalles técnicos se mantienen server-side (`details`).

## Traceability Tag

- `profileSnapshotId` es el identificador fuente obligatorio para todo el flujo.
