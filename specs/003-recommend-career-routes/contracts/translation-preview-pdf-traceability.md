# Contract: Translation/CV Preview/PDF Traceability with Selected Route

## Boundary

- **Producer**: `src/features/cv/server/generate-cv.ts` + `src/features/cv/server/export-cv-pdf.ts`
- **Consumer**: `src/features/documents/server/generate-pdf.ts`
- **Entry points**:
  - `src/app/api/cv/generate/route.ts`
  - `src/app/api/cv/pdf/route.ts`
  - `src/app/(app)/cv/preview/page.tsx`

## Input Contract

`CvPreviewInput` (extended minimally):

- Contrato actual + `selectedRouteId?: string`

`PdfGenerationInput` (orchestration metadata):

- Contrato actual + `selectedRouteId?: string` + `previewVersionId`

## Output Contract

`DomainResult<PdfGenerationOutput, DomainError>`:

- Success:
  - `documentId`
  - `status`
  - `storagePath`
  - metadata de trazabilidad persistida en `employabilityFlow.export`
- Failure:
  - `VALIDATION_ERROR` para checkpoint inconsistente (`previewVersionId`/`selectedRouteId`)
  - `EXTERNAL_DEPENDENCY_ERROR` para proveedor PDF
  - `INTERNAL_ERROR` fallback seguro

## Rules

1. El checkpoint de preview (`previewVersionId`) DEBE anclar la exportacion.
2. Si existe `selectedRouteId`, DEBE propagarse hasta metadata de export para auditoria funcional.
3. La editabilidad previa sigue siendo obligatoria antes de exportar.
4. En falla de export, draft y seleccion de ruta se conservan para retry.

## Traceability Tag

- `profileSnapshotId -> recommendationSetId/selectedRouteId -> previewVersionId -> documentId`.
