# Phase 1 Data Model - 002-employability-e2e-flow

## Scope

Modelo de datos del flujo perfil -> traducción -> preview editable -> exportación PDF, reutilizando contratos existentes y persistencia mínima.

## Canonical Entities

### 1) EmployabilityFlowDraft (persistencia mínima)

- **Storage**: `user_wizard_state.aggregated_draft_jsonb.employabilityFlow`
- **Purpose**: evitar pérdida de trabajo entre pasos y sesiones.
- **Fields**:
  - `userId: string`
  - `profileSnapshotId: string`
  - `translation: TranslationTrace`
  - `cvPreview: CvPreviewTrace`
  - `export: PdfExportTrace`
  - `lastUpdatedAt: string (ISO)`

### 2) TranslationTrace

- **Reuses**: `TranslationOutput` (`src/features/translation/schemas/translation.schema.ts`)
- **Fields**:
  - `blocks: TranslatedBlock[]`
  - `sourceRefMap: Record<string, string>`
  - `qualityFlags: TranslationQualityFlag[]`
  - `generatedAt: string (ISO)`

### 3) CvPreviewTrace

- **Reuses**: `CvPreviewModel` (`src/features/cv/schemas/cv.schema.ts`)
- **Fields**:
  - `previewVersionId: string`
  - `sections: CvSection[]`
  - `layout: CvLayoutConfig`
  - `completeness: CvCompletenessStatus`
  - `editedAt: string (ISO)`
  - `isUserEdited: boolean`

### 4) PdfExportTrace

- **Reuses**: `PdfGenerationOutput` (`src/features/documents/schemas/document.schema.ts`)
- **Fields**:
  - `requestId: string`
  - `previewVersionId: string`
  - `documentId: string | null`
  - `status: 'queued' | 'generated' | 'failed'`
  - `storagePath: string | null`
  - `downloadUrl: string | null`
  - `requestedAt: string (ISO)`

## Invariants

1. `profileSnapshotId` es obligatorio para crear `TranslationTrace`.
2. `CvPreviewTrace.sections[*].sourceBlockIds` solo referencia ids presentes en `TranslationTrace.blocks`.
3. `PdfExportTrace.previewVersionId` DEBE coincidir con la versión del snapshot aprobado en preview.
4. Si `PdfExportTrace.status = 'generated'`, `documentId` y `storagePath` no son nulos.
5. El flujo NO permite exportación cuando `isUserEdited = false`.

## State Model

- `idle`: sin draft previo recuperado.
- `profile_ready`: perfil mínimo válido para traducir.
- `translation_ready`: traducción disponible.
- `preview_editing`: borrador editable abierto.
- `preview_confirmed`: edición validada y lista para exportar.
- `export_queued`: exportación solicitada.
- `export_generated`: PDF disponible.
- `export_failed`: error de exportación recuperable.

## Mapping to Existing Contracts

- `ProfileDomainModel` -> `ProfileSnapshot` via `mapProfileToTranslationSnapshot`.
- `TranslationOutput` -> `CvPreviewInput` via `mapTranslationOutputToCvInput`.
- `CvPreviewModel` -> `PdfGenerationInput` via `mapCvPreviewToPdfGenerationInput`.
- Resultado transversal en `DomainResult<TData, DomainError>`.

## Persistence Envelope Proposal (JSONB)

```json
{
  "employabilityFlow": {
    "userId": "user-123",
    "profileSnapshotId": "profile-snapshot-user-123",
    "translation": {
      "blocks": [],
      "sourceRefMap": {},
      "qualityFlags": [],
      "generatedAt": "2026-03-23T20:00:00.000Z"
    },
    "cvPreview": {
      "previewVersionId": "preview-v1",
      "sections": [],
      "layout": {
        "templateKey": "single-column",
        "columns": 1
      },
      "completeness": "needs_review",
      "editedAt": "2026-03-23T20:02:00.000Z",
      "isUserEdited": true
    },
    "export": {
      "requestId": "export-req-1",
      "previewVersionId": "preview-v1",
      "documentId": null,
      "status": "queued",
      "storagePath": null,
      "downloadUrl": null,
      "requestedAt": "2026-03-23T20:03:00.000Z"
    },
    "lastUpdatedAt": "2026-03-23T20:03:00.000Z"
  }
}
```

## Non-Goals for this Slice

- Historial completo de versiones de CV (solo última versión activa).
- Colaboración multi-sesión en tiempo real.
- Migración a tabla dedicada de drafts en esta fase.
