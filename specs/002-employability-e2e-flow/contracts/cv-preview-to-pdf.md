# Contract: CV Preview -> PDF Export

## Boundary

- **Producer**: `src/features/cv/server/export-cv-pdf.ts`
- **Consumer**: `src/features/documents/server/generate-pdf.ts`
- **Entry points**:
  - `src/app/api/cv/pdf/route.ts`
  - `src/app/(app)/cv/preview/page.tsx`

## Reused Contracts

- `cvPreviewOutputSchema`
- `pdfGenerationInputSchema`
- `pdfGenerationOutputSchema`
- `mapCvPreviewToPdfGenerationInput`

## Input Contract

`PdfGenerationInput`:

- `userId: domainId`
- `cvPreview: CvPreviewModel`
- `format: 'pdf'`
- `locale: locale`
- `previewVersionId: string` (metadata de trazabilidad en capa orchestration)

## Output Contract

`DomainResult<PdfGenerationOutput, DomainError>`:

- Success:
  - `documentId`
  - `status: queued | generated | failed`
  - `storagePath?`
  - `downloadUrl?`
- Failure:
  - `VALIDATION_ERROR` cuando el preview no pasa contrato
  - `EXTERNAL_DEPENDENCY_ERROR` para fallas de generación/subida
  - `INTERNAL_ERROR` fallback

## Rules

1. El payload de exportación DEBE representar exactamente el snapshot de `previewVersionId` confirmado.
2. Debe existir lock de exportación para evitar doble submit concurrente.
3. Si `status=failed`, se conserva el draft editable para retry sin pérdida de contenido.
4. Mensajes al usuario deben ser seguros; detalles técnicos quedan en observabilidad interna.

## Traceability Tag

- Cadena mínima: `profileSnapshotId -> translation.block.id/sourceRef -> previewVersionId -> documentId`.
