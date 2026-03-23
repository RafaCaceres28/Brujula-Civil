# Codebase Research - Brújula Civil

## Resumen ejecutivo

Brújula Civil es una plataforma Next.js enfocada en la transición laboral de perfiles militares hacia mercado civil. La base técnica está consolidada en autenticación, onboarding y perfil, mientras que CV, LinkedIn, traducción operativa y documentos presentan implementación parcial con placeholders o archivos vacíos. El repositorio ya tiene estándares fuertes de calidad (TypeScript estricto, validación con Zod, pruebas con Vitest y flujo de verificación), pero existe una brecha de madurez entre dominios núcleo y dominios de salida de valor.

Este documento toma como base `docs/codebase-audit.md` y la evidencia actual del repositorio para servir como contexto permanente en futuras specs de spec-kit.

## Objetivo actual del producto

El objetivo de producto detectado es acompañar un flujo de reconversión profesional: capturar trayectoria militar, traducirla a lenguaje civil y habilitar outputs empleables (CV/LinkedIn/documentos).

- Mensaje de producto explícito en home marketing: `src/app/(marketing)/page.tsx`.
- Flujo guiado de captura y estructuración de datos personales/militares: `src/app/(app)/onboarding/page.tsx`, `src/app/(app)/onboarding/militar/page.tsx`, `src/features/wizard/server/*`.
- Perfil como ancla de datos persistidos y edición: `src/app/(app)/perfil/page.tsx`, `src/features/profile/server/get-profile.ts`, `src/features/profile/server/save-profile.ts`.
- Intención de salida a CV/LinkedIn/traducción y exportación PDF todavía en madurez baja: `src/app/(app)/cv/page.tsx`, `src/app/(app)/linkedin/page.tsx`, `src/app/api/cv/generate/route.ts`, `src/app/api/linkedin/generate/route.ts`, `src/app/api/cv/pdf/route.ts`.

## Arquitectura detectada

Arquitectura modular por feature sobre App Router, con separación por fronteras de entrada (UI/rutas/actions), lógica de dominio (server/services) y contratos (schemas/types).

- Framework base: Next.js App Router + React + TypeScript estricto (`package.json`, `tsconfig.json`).
- Segmentación de aplicación por grupos de rutas: `(marketing)`, `(auth)`, `(app)` y `api`: `src/app/`.
- Estructura por dominio en `src/features/<feature>/{actions,components,schemas,server,services,types}` (varía según madurez): `src/features/*`.
- Patrón de acceso a datos centralizado en cliente Supabase server-side: `src/lib/supabase/server.ts`.
- Validación de contratos con Zod antes de persistencia/acciones: `src/features/profile/schemas/profile.schema.ts`, `src/features/wizard/schemas/wizard.schema.ts`, `src/features/translation/schemas/translation.schema.ts`.
- Estrategia de testing dual (node/jsdom) con setup común: `vitest.config.ts`.

## Estructura de carpetas relevante

- `src/app/`: rutas, layouts y Route Handlers (incluye `(app)`, `(auth)`, `(marketing)`, `api/`).
- `src/features/auth/`: autenticación, guardas, acciones de login/registro y tipos.
- `src/features/wizard/`: onboarding multi-paso, mapeo form-data y estado agregado.
- `src/features/profile/`: lectura/escritura de perfil, mappers y formularios.
- `src/features/cv/`, `src/features/linkedin/`, `src/features/translation/`, `src/features/documents/`: dominios de salida con madurez heterogénea.
- `src/lib/supabase/`: env + cliente SSR/server compartido.
- `src/types/`: contratos globales de persistencia (`database.types.ts`) y tipos comunes.
- `docs/`: auditoría y documentación técnica viva (`docs/codebase-audit.md`, este documento).

## Flujos de usuario implementados

### 1) Acceso y sesión

- Login/registro/recuperación con acciones server y mapeo de errores: `src/features/auth/actions/login-action.ts`, `src/features/auth/actions/register-action.ts`, `src/features/auth/server/auth-error-mapper.ts`.
- Guardia de acceso y redirección por sesión: `src/features/auth/server/require-user.ts`, `src/features/auth/server/get-required-user.ts`.

### 2) Onboarding guiado (funcional)

- Entrada dinámica al paso correcto según estado: `src/features/wizard/server/resolve-onboarding-entry.ts`.
- Persistencia por paso + estado agregado + recálculo de avance: `src/features/wizard/server/save-onboarding-step.ts`, `src/features/wizard/server/recalculate-onboarding-state.ts`.
- Form pages por etapa (militar, experiencia, competencias, objetivos, resumen): `src/app/(app)/onboarding/*/page.tsx`.

### 3) Perfil (funcional)

- Lectura de perfil compuesto (app + militar + civil) con fallback de versión actual: `src/features/profile/server/get-profile.ts`.
- Edición y envío con validación estricta vía server actions: `src/features/profile/actions/save-profile-action.ts`, `src/features/profile/actions/submit-profile-action.ts`.

### 4) Flujos parcialmente implementados

- CV/LinkedIn/Traducción muestran secciones base sin operación end-to-end: `src/app/(app)/cv/page.tsx`, `src/app/(app)/linkedin/page.tsx`, `src/app/(app)/traduccion/page.tsx`.
- Editor/preview de CV y LinkedIn no renderizan funcionalidad: `src/app/(app)/cv/editor/page.tsx`, `src/app/(app)/cv/preview/page.tsx`, `src/app/(app)/linkedin/editor/page.tsx`, `src/app/(app)/linkedin/preview/page.tsx`.
- Endpoints API principales en modo placeholder: `src/app/api/cv/generate/route.ts`, `src/app/api/linkedin/generate/route.ts`, `src/app/api/translation/route.ts`, `src/app/api/cv/pdf/route.ts`, `src/app/api/profile/route.ts`.

## Dominio de datos y entidades principales

Según `src/types/database.types.ts`, el modelo base hoy gira en torno a:

- `AppUserProfileRow`: perfil base del usuario (identidad, locale, flags de onboarding/marketing).
- `UserWizardStateRow`: estado agregado del onboarding (paso actual, avance, draft jsonb, timestamps).
- `WizardStepStateRow`: estado por paso con payload jsonb por usuario.
- `UserMilitaryProfileRow`: snapshot de trayectoria militar normalizada por usuario.
- `UserCivilProfileRow`: perfil civil versionado (draft/processing/ready/etc.) asociado a perfil militar.

Relación de entidades (nivel conceptual):

- `app_user_profiles (1) -> (1) user_wizard_state`
- `app_user_profiles (1) -> (N) wizard_step_states`
- `app_user_profiles (1) -> (N) user_military_profiles`
- `user_military_profiles (1) -> (N) user_civil_profiles`

Observación clave: hay contratos de tipos avanzados en `translation.types.ts`, pero sin servicios server operativos equivalentes en `src/features/translation/server/`.

## Integraciones y dependencias externas

- **Supabase Auth/DB (core):** cliente SSR para server components, route handlers y server actions (`src/lib/supabase/server.ts`).
- **Variables públicas obligatorias:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`src/lib/supabase/env.ts`).
- **Zod como contrato de frontera:** validación de input/output en features críticas.
- **Stack runtime/build:** Next.js 16 + React 19 + TypeScript 5 (`package.json`).
- **Calidad y pruebas:** ESLint 9, Prettier 3, Vitest 4 con proyectos node/jsdom (`eslint.config.mjs`, `prettier.config.mjs`, `vitest.config.ts`).

## Decisiones técnicas detectadas

1. **Arquitectura feature-first:** cada dominio encapsula componentes, acciones, server, esquemas y tipos.
2. **BFF en Next.js App Router:** server actions + route handlers como frontera backend ligera.
3. **Supabase como backend principal unificado:** auth y persistencia bajo un solo proveedor.
4. **Contratos primero (schema/type):** validación estricta en inputs de acciones y normalización de payloads.
5. **Testing segmentado por entorno:** lógica server en `node` y componentes DOM en `jsdom`.
6. **Calidad por pipeline declarativa:** `pnpm verify` (lint + typecheck + test:run) y pre-commit con lint-staged.
7. **Modelo de onboarding stateful:** draft agregado + estados por paso + recálculo de completitud.

## Convenciones del repositorio

- Alias de imports `@/* -> src/*`: `tsconfig.json`.
- Estilo consistente: `semi: true`, `singleQuote: true`, `trailingComma: all`, `printWidth: 100`: `prettier.config.mjs`.
- Tipado estricto obligatorio: `strict: true`: `tsconfig.json`.
- Linting enfocado en higiene práctica (`no-unused-vars` en warn, `no-console` restringido): `eslint.config.mjs`.
- Pre-commit no bloquea por typecheck/tests completos; delega verificación total a CI/pre-push: `.husky/pre-commit`.
- Convención organizativa predominante: `actions/`, `components/`, `schemas/`, `server/`, `services/`, `types/` por feature.

## Deuda técnica priorizada

Prioridad propuesta (P1 mayor impacto):

- **P1 - Placeholders en endpoints críticos** (`/api/cv/generate`, `/api/linkedin/generate`, `/api/translation`, `/api/cv/pdf`, `/api/profile`) bloquean entrega de valor.
- **P1 - Archivos server vacíos** en `documents`, `cv`, `linkedin`, `translation` impiden integración real y favorecen falsa sensación de avance.
- **P1 - UI no operativa en editor/preview** (`return null` en CV/LinkedIn) rompe journeys end-to-end.
- **P2 - Desbalance de cobertura de tests** entre dominios maduros (auth/wizard/profile) y dominios de salida.
- **P2 - Contratos incompletos** (schemas/types vacíos, p.ej. `cv.schema.ts`, `linkedin.schema.ts`, `document.types.ts`).
- **P3 - Riesgo de drift entre modelo y rutas**: tipos sugieren flujos avanzados que no están implementados en server/API.

## Riesgos y huecos funcionales

- Riesgo de publicar módulos con UX incompleta por coexistencia de páginas visibles y backend placeholder.
- Riesgo de defectos ocultos por falta de integración tests en rutas de generación/exportación.
- Riesgo de deuda acumulada por esqueletos sin cierre operativo (archivos 0 líneas en capas server/types/schemas).
- Hueco funcional principal: no existe hoy un flujo completo verificable perfil -> traducción -> CV/LinkedIn -> exportación PDF.
- Riesgo operativo moderado: webhooks de Supabase también en placeholder (`src/app/api/webhooks/supabase/route.ts`).

## Oportunidades de refactor

1. **Verticalizar por capability** (translation -> cv/linkedin -> documents) en slices entregables, en lugar de avanzar por carpetas aisladas.
2. **Estandarizar contratos de dominio** (input/output/result/error) en todos los features para eliminar tipos vacíos y acoplamientos implícitos.
3. **Introducir capa común de errores de dominio** para acciones, route handlers y server services, evitando mensajes heterogéneos.
4. **Crear harness de integración reusable con Supabase mock/fixture** para CV/LinkedIn/Documents, replicando patrón robusto de profile/wizard.
5. **Extraer mapeadores cross-feature** de wizard->profile->translation para reducir duplicación y drift semántico.

## Recomendaciones para evolución del sistema

### Horizonte inmediato (0-30 días)

- Definir gates de readiness por dominio (API + server + UI + tests + observabilidad mínima).
- Sustituir placeholders críticos por contratos funcionales mínimos con manejo de error tipado.
- Completar funciones server vacías priorizando documentos y generación básica.

### Horizonte corto (31-90 días)

- Cerrar al menos un journey completo de salida (perfil -> traducción -> preview -> exportación).
- Añadir pruebas de integración por feature de salida y pruebas de contrato en route handlers.
- Homologar schemas/types de CV/LinkedIn/Documents al nivel de rigor de profile/wizard.

### Horizonte medio (91-180 días)

- Introducir observabilidad de errores por dominio y métricas de confiabilidad.
- Preparar pruebas E2E de journeys completos antes de escalar alcance funcional.
- Consolidar documentación de arquitectura objetivo por módulo en `docs/` para decisiones de spec-kit.

## Evidencia principal utilizada

- `docs/codebase-audit.md`
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `eslint.config.mjs`
- `prettier.config.mjs`
- `.editorconfig`
- `.husky/pre-commit`
- `src/app/**`
- `src/features/**`
- `src/lib/supabase/**`
- `src/types/database.types.ts`
