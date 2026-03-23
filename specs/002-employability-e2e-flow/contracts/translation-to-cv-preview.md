# Contract: Translation -> CV Preview Editable

## Boundary

- **Producer**: `src/features/translation/server/generate-translation.ts`
- **Consumer**: `src/features/cv/server/generate-cv.ts`
- **Entry points**:
  - `src/app/api/cv/generate/route.ts`
  - `src/app/(app)/cv/preview/page.tsx`

## Reused Contracts

- `translationOutputSchema`
- `cvPreviewInputSchema`
- `cvPreviewOutputSchema`
- `parseEditableCvPreviewBoundary`

## Input Contract

`CvPreviewInput`:

- `userId: domainId`
- `profileSnapshotId: domainId`
- `translatedContent: TranslationOutput`
- `templateKey: single-column | modern | compact`

## Output Contract

`DomainResult<CvPreviewModel, DomainError>`:

- Success:
  - `sections[]` con `sourceBlockIds[]`
  - `layout`
  - `completeness`
- Failure:
  - `VALIDATION_ERROR` para payload inválido
  - `INTERNAL_ERROR` para fallas no controladas

## Rules

1. Cada sección del preview DEBE mantener `sourceBlockIds` trazables a `translatedContent.blocks`.
2. El preview DEBE pasar por validación de edición (`parseEditableCvPreviewBoundary`) antes de habilitar export.
3. El estado `completeness` controla UX de empty/needs_review/complete.
4. Edición previa es OBLIGATORIA: no se exporta si no hay confirmación de edición.

## Traceability Tag

- `previewVersionId` se genera al confirmar edición para anclar exportación PDF.
