# Translation Domain Contract

## Input Contract

- `TranslationInput`
  - `userId: string`
  - `sourceProfile: ProfileSnapshot | LinkedInNormalizedProfile`
  - `sourceLanguage: string`
  - `targetLanguage: string`
  - `tone?: 'formal' | 'neutral' | 'concise'`

## Output Contract

- `TranslatedProfileContent`
  - `blocks: TranslatedBlock[]`
  - `sourceRefMap: Record<string, string>`
  - `qualityFlags: TranslationQualityFlag[]`

## Result Contract

- `DomainResult<TranslatedProfileContent, DomainError>`

## Validation Notes

- Validar idiomas soportados y shape de bloques.
- Mantener trazabilidad source->output para integridad de dominio.
- No exponer mensajes crudos de proveedores de traduccion.

## Error Mapping

- Idioma no soportado/input invalido -> `VALIDATION_ERROR`
- Limite de proveedor -> `RATE_LIMITED`
- Falla proveedor -> `EXTERNAL_DEPENDENCY_ERROR`
