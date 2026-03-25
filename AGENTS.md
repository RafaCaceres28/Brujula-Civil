# AGENTS.md - Guia operativa para agentes de coding

## Objetivo

Estandarizar como trabajar en `brujula-civil` con cambios verificables, reversibles y alineados al stack real del repo.

La linea base de gobernanza obligatoria esta en `.specify/memory/constitution.md`; este archivo detalla la operativa diaria para cumplirla.

## Fuentes verificadas (NO asumir)

Este documento se mantiene solo con evidencia de archivos reales:

- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `eslint.config.mjs`
- `prettier.config.mjs`
- `.editorconfig`
- `.husky/pre-commit`
- estructura observada en `src/app/**` y `src/features/**`

## Stack real del proyecto

- Next.js `16.1.6` (App Router)
- React `19.2.3` + React DOM `19.2.3`
- TypeScript `^5` con `strict: true`
- Alias `@/* -> ./src/*`
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Vitest `^4.0.7` (proyectos `node` y `jsdom`)
- ESLint 9 + `eslint-config-next` + `eslint-config-prettier`
- Prettier 3

## Comandos del proyecto

Scripts disponibles (fuente: `package.json`):

- `pnpm dev` - desarrollo local
- `pnpm build` - build de produccion
- `pnpm start` - servir build
- `pnpm lint` - lint del repo
- `pnpm typecheck` - TypeScript sin emitir (`tsc --noEmit`)
- `pnpm test` - Vitest interactivo/watch
- `pnpm test:run` - corrida unica de tests
- `pnpm test:coverage` - cobertura
- `pnpm verify` - `lint && typecheck && test:run`
- `pnpm format` - formateo
- `pnpm format:check` - validacion de formato
- `pnpm governance:check` y `pnpm governance:apply`

## Como correr UN SOLO test

Patron oficial: `pnpm test:run -- <filtros de vitest>`.

- Por archivo: `pnpm test:run -- src/features/wizard/server/get-onboarding-step.test.ts`
- Por nombre: `pnpm test:run -- -t "debe recalcular el estado"`
- Por archivo + linea: `pnpm test:run -- src/features/wizard/server/get-onboarding-step.test.ts:42`
- Forzando `node`: `pnpm test:run -- --project node src/features/wizard/server/get-onboarding-step.test.ts`
- Forzando `jsdom`: `pnpm test:run -- --project jsdom src/features/profile/components/profile-form.test.tsx`

Discovery desde `vitest.config.ts`:

- `node`: incluye `src/**/*.test.ts`, excluye `src/**/*.dom.test.ts`
- `jsdom`: incluye `src/**/*.dom.test.ts` y `src/**/*.test.tsx`
- setup compartido: `test/setup.ts`

## Politica de verificacion

NO usar build como validacion por defecto.

Antes de cerrar una tarea, correr en este orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

Si se tocan umbrales/cobertura, sumar `pnpm test:coverage`.
Comando rapido recomendado: `pnpm verify`.

## Hooks de calidad

- pre-commit actual: `pnpm lint-staged`
- `*.{ts,tsx,js,jsx}` -> `eslint --fix` y `prettier --write`
- `*.{json,md,css,scss}` -> `prettier --write`
- comentario del hook: validacion completa en CI/pre-push con `pnpm verify`

## Organizacion observada

- rutas/layouts en `src/app/**`
- segmentos observados: `(app)`, `(auth)`, `(marketing)`, `api/**`
- dominio por feature en `src/features/<feature>/**`
- features observadas: `auth`, `cv`, `documents`, `linkedin`, `profile`, `translation`, `wizard`
- carpetas frecuentes: `actions`, `components`, `config`, `constants`, `schemas`, `server`, `services`, `types`
- convencion recomendada: contrato primero (`types` + `schemas`) y luego implementacion

## Guia de estilo de codigo

### Formato

- respetar Prettier: `semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`
- respetar `.editorconfig`: UTF-8, LF, newline final, indentacion de 2 espacios
- evitar formato manual contrario a Prettier

### Imports

- preferir alias `@/` para imports desde `src`
- usar relativos solo dentro de la misma feature/modulo
- separar tipos con `import type { ... }` cuando aplique
- orden recomendado: externos -> alias `@/` -> relativos

### Tipado y validacion

- `strict: true` es obligatorio; evitar `any` salvo justificacion tecnica
- usar tipos explicitos en bordes (`actions`, `server`, `services`)
- validar datos no confiables con Zod (`.parse(...)` o equivalente seguro)
- `types/` para contratos de dominio, `schemas/` para validacion

### Naming

- archivos en `kebab-case`
- componentes React en `PascalCase`
- funciones/variables en `camelCase`
- constantes invariantes en `UPPER_SNAKE_CASE`
- sufijos recomendados: `*.schema.ts`, `*.types.ts`, `*.mapper.ts`, `*.builder.ts`, `*.test.ts`

### Manejo de errores

- priorizar early-return
- mensajes claros y accionables
- `no-console` en warn con allowlist para `console.warn` y `console.error`
- no silenciar errores en `catch` sin razon tecnica explicita

### Separacion de responsabilidades

- logica de negocio fuera de UI
- `components/`: presentacion e interaccion
- `server/`: acceso a datos y reglas de negocio
- `services/`: mapeos/transformaciones reutilizables
- `actions/`: orquestacion y frontera de entrada

### Seguridad

- PROHIBIDO commitear secretos
- usar variables de entorno para credenciales/llaves
- no hardcodear tokens o API keys en codigo, tests o fixtures

## Reglas Cursor/Copilot (estado actual)

Busqueda explicita en el repo:

- `.cursor/rules/**`: NO existe
- `.cursorrules`: NO existe
- `.github/copilot-instructions.md`: NO existe

Conclusión: hoy NO hay reglas locales de Cursor/Copilot para incorporar.
Si aparecen esos archivos, actualizar este AGENTS.md de inmediato.

## Checklist de cierre para agentes

- correr `pnpm verify` o `lint + typecheck + test:run`
- no ejecutar build sin requerimiento explicito
- mantener tipos/schemas alineados a la logica
- no incluir secretos/credenciales en el diff

## Active Technologies

- Supabase Postgres (`user_wizard_state`, `wizard_step_states`, perfiles proyectados) (005-guiar-onboarding-catalogos)

- Supabase Postgres (`user_wizard_state.aggregated_draft_jsonb.employabilityFlow`) (004-explicabilidad-rutas)

- Supabase Postgres (`user_wizard_state.aggregated_draft_jsonb`) (003-recommend-career-routes)

- TypeScript (^5, strict mode) + Next.js (App Router), React, Supabase SSR/client, Zod (001-unify-domain-contracts)
- Supabase Postgres (001-unify-domain-contracts)

## Recent Changes

- 001-unify-domain-contracts: Added TypeScript (^5, strict mode) + Next.js (App Router), React, Supabase SSR/client, Zod
