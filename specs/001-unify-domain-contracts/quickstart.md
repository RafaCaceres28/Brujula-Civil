# Quickstart - 001-unify-domain-contracts

## Objetivo

Aplicar el refactor de contratos de manera incremental, verificable y reversible, sin reescritura global.

## Paso 1: Baseline shared contracts

1. Definir tipos base (`DomainResult`, `DomainError`, `DomainErrorCode`) en modulo shared.
2. Definir schemas base reutilizables (ids, locale, metadata, status).
3. Publicar convenciones de uso en `actions/components/schemas/server/services/types`.

## Paso 2: Contratos por dominio

1. CV: input/output para preview de CV.
2. LinkedIn: normalizacion de source profile.
3. Translation: entrada tipada + salida trazable.
4. Documents: input de PDF + resultado de generacion.

Cada dominio debe exponer:

- schema de input de frontera
- tipos de output
- `DomainResult` con `DomainError`

## Paso 3: Migracion por vertical slice

Orden recomendado:

1. `profile` emite `ProfileSnapshot` estable.
2. `translation` consume snapshot y emite `TranslatedProfileContent`.
3. `cv` consume salida de translation y arma `CvPreviewModel`.
4. `documents` genera PDF desde `CvPreviewModel`.

Usar adapters temporales cuando un consumidor legacy todavia no adopta el contrato nuevo.

## Paso 4: Testing de contratos e integracion

1. Crear contract tests por dominio (happy path + errores).
2. Crear test del slice completo perfil->translation->cv->pdf con stubs de infraestructura.
3. Reutilizar fixtures tipados compartidos para reducir drift.

## Paso 5: Quality gates obligatorios

Ejecutar en orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

No usar `pnpm build` como validacion por defecto.

## Criterio de salida de planificacion

- Contratos shared y por dominio definidos documentalmente.
- Estrategia incremental y riesgos documentados.
- Base lista para crear `tasks.md` y comenzar Phase 2 (task planning) sin clarificaciones pendientes.
