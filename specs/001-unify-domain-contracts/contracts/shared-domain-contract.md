# Shared Domain Contract

## Scope

Contrato base reutilizable para `cv`, `linkedin`, `translation`, `documents` y flujo integrado con `profile`.

## Base Types

- `DomainResult<TData, DomainError>` discriminado por `ok`.
- `DomainError` con `code`, `message`, `retryable`, `details` opcional seguro.
- `DomainMeta` para `requestId`, `timestamp`, `source` (sin datos sensibles).

## Error Taxonomy

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `EXTERNAL_DEPENDENCY_ERROR`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

## Boundary Rules

- Toda entrada externa pasa por Zod en `actions` o `api`.
- `server/services` reciben tipos validados y retornan `DomainResult`.
- `components` consumen modelos ya normalizados; no contienen reglas de negocio.

## Compatibility Rule

Cambios breaking en contratos requieren versionado explicito de contrato o adapter backward-compatible durante migracion.
