# Shared Domain Contracts

Este modulo define el contrato base que deben compartir `actions`, `api`, `server/services` y features de dominio.

## Objetivo

- Unificar semantica de exito/fallo con `DomainResult`.
- Unificar taxonomia de error segura con `DomainError` + `DomainErrorCode`.
- Estandarizar parseo de frontera con schemas Zod + helpers shared.

## Estructura

- `domain-result.ts`: union discriminada `{ ok: true } | { ok: false }`.
- `domain-error-codes.ts`: catalogo de codigos permitidos.
- `domain-error.ts`: constructor y normalizacion de errores seguros.
- `shared.schema.ts`: schemas base (`domainId`, `locale`, `meta`).
- `zod-helpers.ts`: utilidades de parse seguro (`safeParseWithDomainError`).

## Reglas de uso por frontera

1. `actions` y `route handlers` SIEMPRE validan payload no confiable con Zod.
2. `server/services` reciben tipos ya validados y retornan `DomainResult`.
3. `components` consumen modelos normalizados, sin reglas de negocio.
4. Mensajes de error expuestos al usuario deben ser seguros; no filtrar detalles internos.

## Ejemplo de parseo seguro

```ts
import { safeParseWithDomainError } from '@/lib/contracts';
import { cvPreviewInputSchema } from '@/features/cv/schemas/cv.schema';

const parsed = safeParseWithDomainError(cvPreviewInputSchema, payload, {
  message: 'Invalid CV preview payload',
  details: { boundary: 'api/cv/generate' },
});

if (!parsed.ok) {
  return parsed.error;
}

const validatedInput = parsed.data;
```

## Checklist rapido

- Reusar `DomainResult` y `DomainError` en contratos de feature.
- Reusar `domainIdSchema` y `localeSchema` cuando aplique.
- Evitar `throw` de errores no tipados fuera de fronteras.
- Cubrir con tests de tipo/schema por dominio para evitar drift.
