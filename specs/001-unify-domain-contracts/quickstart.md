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

## Cierre tecnico de adopcion (Final Phase)

Este bloque registra el cierre tecnico de la iniciativa `001-unify-domain-contracts` dentro del alcance de quality gates, documentacion y verificacion de neutralidad de performance.

### Scope de cierre ejecutado

1. `T051`: `pnpm lint`
2. `T052`: `pnpm typecheck`
3. `T053`: `pnpm test:run`
4. `T054`: actualizacion de este quickstart
5. `T065`: registro de baseline/metodo/resultados en `contracts/performance-neutrality-check.md`

### Resultado operativo esperado para cierre

- Lint en verde sin cambios funcionales extra.
- Typecheck en verde sin ampliacion de alcance.
- Suite de tests en verde dentro del estado de la iniciativa.
- Evidencia tecnica de performance neutral en documentacion contractual.
- SC-002 verificado mediante `contracts/alignment-matrix.md` y adopcion cerrada en handlers/actions/services.

### Regla de control del alcance

- No abrir nuevas lineas de trabajo fuera de `001`.
- No modificar alcance funcional durante el bloque final.
- Si aparece un fallo, aplicar correccion minima y localizada solo en contratos/rutas/actions/services/schemas/types/tests/docs de la iniciativa.
- No usar `pnpm build` como gate de cierre.
