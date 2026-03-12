# AGENTS.md — Reglas Locales de Operacion

## Objetivo

Este archivo define las reglas operativas para agentes en `brujula-civil`, con foco en cambios SDD (Spec-Driven Development), verificables y mantenibles.

## Stack Real del Repositorio (verificado)

- Framework web: Next.js `16.1.6` (App Router en `src/app`).
- UI: React `19.2.3` + React DOM `19.2.3`.
- Lenguaje: TypeScript `^5` con `strict: true` y alias `@/*`.
- Testing: Vitest `^4.0.7` con proyectos `node` y `jsdom`, cobertura V8 y thresholds.
- Backend/BaaS: Supabase (`@supabase/supabase-js` + `@supabase/ssr`) y carpeta `supabase/` con migraciones.
- Calidad: ESLint 9 + `eslint-config-next`, Prettier 3, Husky + lint-staged.
- Gestor de paquetes: pnpm (`pnpm-lock.yaml`).

## Convenciones de Estructura

- Rutas y layouts: `src/app/**` (grupos `(marketing)`, `(auth)`, `(app)` y `api/**`).
- Dominio por feature: `src/features/<feature>/{components,server,services,schemas,types,config}`.
- Integraciones compartidas: `src/lib/**` (ej. `src/lib/supabase/**`).
- Tipos y config global: `src/types/**`, `src/config/**`.

## Flujo SDD Recomendado

Para cambios medianos/grandes, ejecutar en este orden:

1. `sdd-explore`
2. `sdd-propose`
3. `sdd-spec`
4. `sdd-design`
5. `sdd-tasks`
6. `sdd-apply`
7. `sdd-verify`
8. `sdd-archive`

Reglas:

- NO implementar sin requerimientos y tareas trazables.
- Cada cambio debe explicitar alcance, riesgos y criterio de aceptacion.
- Mantener artefactos de coordinacion en `.atl/` y/o memoria persistente segun modo activo.

## Politica de Verificacion

Antes de cerrar una tarea, correr (sin `build` implicito):

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

Si el cambio toca calidad o cobertura:

- `pnpm test:coverage`

Comando canonico de repo:

- `pnpm verify` (`lint + typecheck + test:run`)

## Criterios de Implementacion

- Priorizar cambios pequenos, reversibles y orientados a dominio.
- Mantener separacion UI/servicios/logica de servidor.
- NO introducir secretos ni credenciales en codigo o commits.
- Si hay duda arquitectonica, decidir primero el contrato (tipos, puertos, invariantes) y despues codigo.
