# Documents Domain Contract

## Input Contract

- `PdfGenerationInput`
  - `userId: string`
  - `cvPreview: CvPreviewModel`
  - `format: 'pdf'`
  - `locale: string`

## Output Contract

- `PdfGenerationOutput`
  - `documentId: string`
  - `status: 'queued' | 'generated' | 'failed'`
  - `storagePath?: string`
  - `downloadUrl?: string`

## Result Contract

- `DomainResult<PdfGenerationOutput, DomainError>`

## Validation Notes

- Input validado antes de invocar generador.
- URL/path de salida sanitizados y alineados a politicas de storage.
- Mensajes de error seguros para UI.

## Error Mapping

- Input invalido -> `VALIDATION_ERROR`
- Documento inexistente -> `NOT_FOUND`
- Error de storage o generacion -> `EXTERNAL_DEPENDENCY_ERROR` o `INTERNAL_ERROR`
