# AGENTS.md - Reglas locales para agentes de codificacion

## Objetivo

Definir reglas operativas para agentes en `brujula-civil`.
Foco: cambios verificables, mantenibles y alineados con el stack real.

## Fuentes verificadas del repo

Reglas extraidas de archivos reales (no supuestos):

- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `eslint.config.mjs`
- `prettier.config.mjs`
- `.editorconfig`
- `.husky/pre-commit`
- `src/app/**` y `src/features/**`

## Stack real (verificado)

- Next.js `16.1.6` (App Router).
- React `19.2.3` + React DOM `19.2.3`.
- TypeScript `^5` con `strict: true`.
- Alias: `@/* -> ./src/*`.
- Supabase: `@supabase/supabase-js` + `@supabase/ssr`.
- Testing: Vitest `^4.0.7` (proyectos `node` y `jsdom`).
- Calidad: ESLint 9 + `eslint-config-next` + `eslint-config-prettier`, Prettier 3.
- Package manager: pnpm.

## Comandos del proyecto

Scripts disponibles en `package.json`:

- `pnpm dev` - desarrollo
- `pnpm build` - build
- `pnpm start` - start de produccion
- `pnpm lint` - lint
- `pnpm typecheck` - chequeo de tipos
- `pnpm test` - Vitest interactivo/watch
- `pnpm test:run` - tests en modo run
- `pnpm test:coverage` - cobertura
- `pnpm verify` - `lint && typecheck && test:run`
- `pnpm format` - formateo
- `pnpm format:check` - check de formato

## Como correr UN SOLO test

En este repo usa `pnpm test:run -- ...` para pasar filtros a Vitest.

- Archivo especifico:
  - `pnpm test:run -- src/features/wizard/server/get-onboarding-step.test.ts`
- Caso por nombre:
  - `pnpm test:run -- -t "nombre del caso"`
- Archivo y linea:
  - `pnpm test:run -- src/features/wizard/server/get-onboarding-step.test.ts:42`
- Proyecto concreto (`node` o `jsdom`):
  - `pnpm test:run -- --project node src/features/wizard/server/get-onboarding-step.test.ts`

## Politica de verificacion

Antes de cerrar una tarea (sin build implicito):

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

Si el cambio toca calidad/cobertura, sumar `pnpm test:coverage`.
Comando preferido para validacion completa: `pnpm verify`.

## Hooks y calidad en commits

- Hook de pre-commit: `pnpm lint-staged`.
- `lint-staged` ejecuta:
  - `eslint --fix` + `prettier --write` para `*.{ts,tsx,js,jsx}`
  - `prettier --write` para `*.{json,md,css,scss}`
- En push/CI, usar `pnpm verify`.

## Organizacion por features

- Rutas/layouts en `src/app/**` (`(marketing)`, `(auth)`, `(app)`, `api/**`).
- Dominio en `src/features/<feature>/**`.
- Carpetas observadas por feature:
  - `components/`, `server/`, `services/`, `schemas/`, `types/`
  - `config/`, `constants/`, `actions/` (segun necesidad)
- Compartido en `src/lib/**`; tipos/config global en `src/types/**` y `src/config/**`.

Regla de diseno: definir contrato primero (tipos + schemas), luego implementacion.

## Guia de estilo de codigo

### Formato

- Respetar Prettier: `semi: true`, `singleQuote: true`, `trailingComma: all`, `printWidth: 100`.
- Indentacion de 2 espacios, EOL LF, newline final (`.editorconfig`).
- No introducir formato manual contrario a Prettier.

### Imports

- Usar alias `@/` para rutas desde `src`.
- Relativos solo dentro de la misma feature.
- Separar tipos con `import type { ... }` cuando aplique.
- Orden sugerido: externos -> alias `@/` -> relativos.

### Tipado

- `strict: true` es mandato; evitar `any` salvo justificacion documentada.
- Tipos de dominio en `types/`; validaciones de entrada en `schemas/` (Zod).
- En fronteras (actions, server, servicios), preferir tipos explicitos.
- Parsear datos no confiables con `.parse(...)` antes de usarlos.

### Naming

- Archivos en `kebab-case`.
- Componentes React en `PascalCase`.
- Funciones/variables en `camelCase`.
- Constantes invariantes en `UPPER_SNAKE_CASE`.
- Sufijos recomendados: `*.schema.ts`, `*.types.ts`, `*.mapper.ts`, `*.builder.ts`, `*.test.ts`.

### Errores

- Usar early-return en ramas de error.
- Mensajes de error claros y accionables (server/client).
- `console.log` no permitido por lint; solo `console.warn` y `console.error`.
- No silenciar errores en `catch` sin explicacion tecnica.

### Separacion de responsabilidades

- Logica de negocio fuera de UI.
- `server/`: acceso a datos + reglas de negocio.
- `components/`: presentacion/interaccion.
- `services/`: transformaciones y mapeos reutilizables.

### Secrets

- NO commitear secretos.
- Usar `process.env` para variables sensibles.
- No hardcodear llaves/credenciales.

## Reglas de Cursor/Copilot (estado actual)

Busqueda explicita en el repo:

- `.cursor/rules/**`: no existe
- `.cursorrules`: no existe
- `.github/copilot-instructions.md`: no existe

No hay reglas locales de Cursor/Copilot para incorporar hoy.
Si aparecen, actualizar este archivo inmediatamente.

## Checklist rapido de cierre

- Ejecutado `pnpm verify` (minimo).
- Tipos y schemas alineados con la logica implementada.
- Sin secretos ni credenciales en el diff.
- Cambios pequenos, reversibles y orientados a feature.
