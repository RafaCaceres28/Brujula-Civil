# Phase 0 Research - 001-unify-domain-contracts

## Objetivo

Resolver decisiones de arquitectura para contratos unificados en `cv`, `linkedin`, `translation` y `documents`, manteniendo `profile` como punto de inicio del vertical slice.

## Decision 1: Ubicacion de contratos compartidos

- Decision: usar un modulo shared de contratos en `src/lib/contracts/` (con opcion de exponer tipos base en `src/types/domain/`) y mantener contratos especificos dentro de cada feature (`src/features/<feature>/{types,schemas}`).
- Rationale: evita acoplar features entre si, respeta arquitectura feature-first y habilita reutilizacion controlada sin reestructurar el producto.
- Alternativas consideradas:
  - Todo dentro de cada feature sin shared kernel: rechazada por duplicacion y drift rapido.
  - Mover todo a una capa global unica: rechazada por riesgo de BIG REWRITE y perdida de ownership por feature.

## Decision 2: Forma del resultado y error tipado

- Decision: estandarizar en discriminated union (`{ ok: true, data } | { ok: false, error }`) con `DomainErrorCode` compartido y metadata opcional segura.
- Rationale: hace explicita la semantica de exito/fallo entre actions, server y UI; simplifica tests de contrato.
- Alternativas consideradas:
  - Excepciones como flujo principal: rechazada por inconsistencia entre capas y menor trazabilidad en tests.
  - Resultado libre por dominio: rechazada por mantener deriva semantica.

## Decision 3: Fronteras de validacion con Zod

- Decision: validar SIEMPRE input no confiable en fronteras (`actions`, `route handlers`, integraciones externas) con schemas por dominio y helpers shared para parse seguro.
- Rationale: cumple constitucion (Contract-First + Security by Default) y evita propagar datos invalidos a `server/services`.
- Alternativas consideradas:
  - Validar solo en UI: rechazada, no es frontera de confianza.
  - Validar solo en backend final: rechazada por feedback tardio y mayor costo de debugging.

## Decision 4: Estrategia incremental de migracion

- Decision: migrar por vertical slice en orden `profile -> translation -> cv preview -> documents/pdf`, usando adapters temporales por dominio para compatibilidad.
- Rationale: reduce riesgo operativo, deja cada incremento verificable y reversible, y prepara base de testing de integracion.
- Alternativas consideradas:
  - Migracion horizontal por carpeta en todos los dominios a la vez: rechazada por alto riesgo de freeze funcional.
  - Reescritura completa: rechazada por restriccion explicita del usuario y por gobernanza.

## Decision 5: Objetivos de performance y escala para esta iniciativa

- Decision: definir objetivo de impacto neutro en performance (sin nuevos roundtrips) y alcance acotado a 4 dominios + integracion con profile.
- Rationale: la iniciativa es de contratos/arquitectura, no de optimizacion de throughput ni rediseno infra.
- Alternativas consideradas:
  - Introducir cache/capas nuevas en esta fase: rechazada por desviar foco y aumentar complejidad.

## NEEDS CLARIFICATION Resolution

- Performance goals: RESUELTO con objetivo de impacto neutro y verificacion via pruebas de contrato/integracion.
- Scale/scope: RESUELTO con alcance incremental sobre 4 dominios criticos + vertical slice desde profile.

No quedan clarificaciones abiertas para pasar a Phase 1.
