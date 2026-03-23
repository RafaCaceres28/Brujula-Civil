# Data Model - 001-unify-domain-contracts

## Shared Core Entities

### DomainResult<TData, TError>

- Purpose: contrato de salida uniforme para operaciones de dominio.
- Shape:
  - Success: `{ ok: true; data: TData; meta?: DomainMeta }`
  - Failure: `{ ok: false; error: TError; meta?: DomainMeta }`
- Notes: usado en `actions`, `server` y `services`; UI consume estado discriminado sin inferencias ambiguas.

### DomainError

- Purpose: representar fallos de forma segura y tipada.
- Minimum fields:
  - `code: DomainErrorCode`
  - `message: string` (seguro para usuario)
  - `cause?: string` (opcional, no sensible)
  - `retryable?: boolean`
  - `details?: Record<string, unknown>` (controlado, sin secretos)

### DomainErrorCode (taxonomy)

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `EXTERNAL_DEPENDENCY_ERROR`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

### BoundaryValidationRule

- Purpose: reglas de parseo en fronteras no confiables.
- Mapping:
  - `actions`/`api`: parseo estricto de input
  - `server/services`: operan sobre tipos ya validados
  - `components`: no validan negocio, solo constraints de UI

## Domain Contract Entities

### Profile Snapshot (entry point del slice)

- Input origin: formularios y estado de perfil del usuario.
- Output contract: `ProfileSnapshot` normalizado para alimentar translation.
- Invariants:
  - IDs de usuario y documento consistentes
  - campos requeridos para traduccion presentes

### Translation Contract

- Input: `ProfileSnapshot` + parametros de destino.
- Output: `TranslatedProfileContent` con trazabilidad (`sourceRef`, `transformationMeta`).
- Invariants:
  - cada bloque traducido mantiene referencia a fuente
  - errores de proveedor externo mapean a `EXTERNAL_DEPENDENCY_ERROR`

### CV Preview Contract

- Input: contenido traducido + preferencias de render.
- Output: `CvPreviewModel` consumible por componentes de preview.
- Invariants:
  - estructura estable para secciones de CV
  - datos faltantes no rompen render; devuelven error tipado o defaults explicitados

### Documents/PDF Contract

- Input: `CvPreviewModel` + parametros de export.
- Output: `PdfGenerationResult` (metadata de archivo, estado de generacion, referencia de storage).
- Invariants:
  - path/URL de storage no expone secretos
  - estados de generacion y fallo normalizados

## Relationship Map

1. `ProfileSnapshot` -> `TranslationInput`
2. `TranslationOutput` -> `CvPreviewInput`
3. `CvPreviewOutput` -> `PdfGenerationInput`
4. Todos los pasos retornan `DomainResult<Success, DomainError>`

## Validation Ownership

- Shared schemas: formatos comunes (ID, locale, timestamps, pagination/meta).
- Domain schemas: reglas de negocio por feature.
- Integration tests: validan que la salida de un paso satisface el input del siguiente sin mapeos ad hoc.
