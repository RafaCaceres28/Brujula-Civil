# Implementation Plan: Iniciativa de Contratos de Dominio Unificados

**Branch**: `[001-unify-domain-contracts]` | **Date**: 2026-03-23 | **Spec**: `/home/svens/dev/brujula-civil/specs/001-unify-domain-contracts/spec.md`
**Input**: Feature specification from `/home/svens/dev/brujula-civil/specs/001-unify-domain-contracts/spec.md`

## Summary

Definir y documentar un sistema de contratos de dominio unificados (shared + por dominio) para CV, LinkedIn, Translation y Documents, alineado a App Router + TypeScript estricto + Supabase SSR + Zod, sin reescritura global. La entrega se enfoca en un refactor incremental y reversible que habilita el vertical slice perfil -> traduccion -> preview CV -> PDF sobre contratos estables y testeables en integracion.

## Technical Context

**Language/Version**: TypeScript (^5, strict mode)
**Primary Dependencies**: Next.js (App Router), React, Supabase SSR/client, Zod
**Storage**: Supabase Postgres
**Testing**: Vitest (`node` and `jsdom` projects)
**Target Platform**: Web app (SSR + client interactions)
**Project Type**: Single Next.js application
**Performance Goals**: Mantener impacto neutro en latencia percibida del usuario durante el refactor (sin agregar hops de red ni serializacion adicional en runtime); validacion de contratos en frontera sin penalizacion apreciable en UX.
**Constraints**: Must pass `pnpm lint`, `pnpm typecheck`, `pnpm test:run`; no default build validation
**Scale/Scope**: Alcance incremental sobre 4 features (`cv`, `linkedin`, `translation`, `documents`) y su integracion con `profile`; sin cambios de infraestructura ni migraciones masivas de datos.

## Constitution Check

GATE: Must pass before implementation and again before merge.

- [x] Verify-First: validado con `/home/svens/dev/brujula-civil/specs/001-unify-domain-contracts/spec.md`, `/home/svens/dev/brujula-civil/.specify/memory/constitution.md`, `/home/svens/dev/brujula-civil/AGENTS.md` y estructura real de `/home/svens/dev/brujula-civil/src/features/*`.
- [x] Contract-First: el plan prioriza artefactos en `types/` + `schemas/` (shared y por dominio) antes de cualquier cambio de logica en `server/`/`services`.
- [x] Quality Gates: incluye estrategia de verificacion con `pnpm lint`, `pnpm typecheck`, `pnpm test:run` por incrementos.
- [x] Security by Default: define taxonomia de errores seguros, no exposicion de internals y respeto de credenciales Supabase por entorno.
- [x] Reversible Delivery: migra por vertical slices y por feature, con compatibilidad temporal de adaptadores.

## Gates

- Gate Status: PASS
- ERROR Conditions: ninguna. No hay incumplimientos injustificados ni clarificaciones pendientes al cierre de plan.

## Project Structure

### Documentation (this feature)

```text
/home/svens/dev/brujula-civil/specs/001-unify-domain-contracts/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- shared-domain-contract.md
|   |-- cv-contract.md
|   |-- linkedin-contract.md
|   |-- translation-contract.md
|   |-- documents-contract.md
|   `-- profile-translation-cv-pdf-slice.md
`-- tasks.md
```

### Source Code (repository root)

```text
/home/svens/dev/brujula-civil/src/
|-- app/
|-- features/
|   |-- profile/
|   |-- cv/
|   |-- linkedin/
|   |-- translation/
|   `-- documents/
|       |-- actions/
|       |-- components/
|       |-- schemas/
|       |-- server/
|       |-- services/
|       `-- types/
|-- lib/
`-- types/

/home/svens/dev/brujula-civil/test/
`-- setup.ts
```

**Structure Decision**: Mantener arquitectura feature-first con una unica ubicacion shared en `/home/svens/dev/brujula-civil/src/lib/contracts/*` y contratos especificos por feature en `/home/svens/dev/brujula-civil/src/features/<feature>/{types,schemas}`, sin mover responsabilidades de UI a negocio.

## Proposed Architecture

- Shared contract kernel: `DomainResult`, `DomainError`, codigos de error y helpers de parseo seguro Zod para fronteras.
- Domain contract modules: CV, LinkedIn, Translation, Documents con `input/output/result/error` y adapters para consumo gradual.
- Boundary alignment: `actions` y `api` validan entrada; `server/services` aplican reglas y retornan `DomainResult`; `components` consumen tipos ya normalizados.
- Editable-before-publish gate: todo contenido generado debe conservar estado editable previo a publicacion/exportacion con trazabilidad contractual por frontera.
- Vertical slice target: perfil produce datos origen -> translation transforma -> cv preview consume contrato comun -> documents/PDF materializa salida.

## Migration Strategy (Incremental)

1. Baseline shared contracts sin tocar flujos productivos.
2. Introducir contratos por dominio con adapters backward-compatible.
3. Asegurar paridad por dominio (`types + schemas + tests de schema`) antes de adopcion total en consumidores.
4. Migrar consumo por feature en orden: `profile` -> `translation` -> `cv` preview -> `documents`/PDF.
5. Retirar adapters temporales una vez cubiertos tests de contrato e integracion por slice.

## Risks and Mitigations

- Riesgo: drift semantico entre contratos y modelos legacy de feature. Mitigacion: adapters explicitos por version de contrato y checklist de trazabilidad por campo.
- Riesgo: errores no uniformes entre server actions y route handlers. Mitigacion: taxonomia unica de `DomainError` y mapeo centralizado.
- Riesgo: sobrecarga de migracion en paralelo en 4 dominios. Mitigacion: rollout por vertical slice y feature flags de consumo.
- Riesgo: falsos positivos en pruebas por mocks poco realistas. Mitigacion: fixtures tipados compartidos y pruebas de integracion contract-first sobre Supabase SSR boundaries.

## Testing Strategy

- Contract tests por dominio: validar `input/output/error/result` con escenarios de exito y fallo.
- Integration-ready base: utilidades de fixtures y builders tipados reutilizables para `node` tests.
- Slice tests: perfil -> translation -> cv preview -> PDF con stubs de infraestructura, verificando compatibilidad de contratos entre pasos.
- Acceptance metrics: validar por dominio una matriz de alineacion contractual con minimo 1 Route Handler + 1 Server Action/servicio y 0 discrepancias abiertas.
- Editability tests: cubrir editabilidad obligatoria previa a exportar/publicar en preview y flujo hacia PDF.
- Quality gates obligatorios por incremento: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.

## Post-Design Constitution Check

- Verify-First: PASS
- Contract-First: PASS
- Quality Gates: PASS (planificados; ejecucion queda para fase de implementacion)
- Security by Default: PASS
- Reversible Incremental Delivery: PASS
- Gate Status: PASS (sin ERROR)

## Complexity Tracking

Fill only for constitution violations that require explicit approval.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
