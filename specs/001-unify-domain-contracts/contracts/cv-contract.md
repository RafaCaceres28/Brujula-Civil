# CV Domain Contract

## Input Contract

- `CvPreviewInput`
  - `userId: string`
  - `profileSnapshotId: string`
  - `translatedContent: TranslatedProfileContent`
  - `templateKey: string`

## Output Contract

- `CvPreviewModel`
  - `sections: CvSection[]`
  - `layout: CvLayoutConfig`
  - `completeness: CvCompletenessStatus`

## Result Contract

- `DomainResult<CvPreviewModel, DomainError>`

## Validation Notes

- Schema de entrada en `src/features/cv/schemas/`.
- Tipos en `src/features/cv/types/`.
- Reglas de armado del preview en `src/features/cv/server/` o `src/features/cv/services/`.

## Error Mapping

- Input invalido -> `VALIDATION_ERROR`
- Plantilla inexistente -> `NOT_FOUND`
- Fallo de composicion interna -> `INTERNAL_ERROR`
