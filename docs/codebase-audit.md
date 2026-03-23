# Auditoría Brownfield de Codebase - Brújula Civil

## 1) Contexto

Brújula Civil es una aplicación Next.js (App Router) orientada al acompañamiento de transición laboral, con módulos de autenticación, onboarding guiado, perfil de usuario, generación de CV, perfil de LinkedIn, traducción de lenguaje militar a civil y gestión documental.

El estado actual del repo refleja una base sólida en autenticación, onboarding y perfil, mientras que los dominios de CV/LinkedIn/Translation/Documents se encuentran en implementación parcial o con placeholders. Esta auditoría busca priorizar endurecimiento técnico y reducción de riesgo sin introducir cambios de producto en esta etapa.

## 2) Alcance y metodología

### Alcance

- Revisión de estructura funcional en `src/app/**` y `src/features/**`.
- Identificación de madurez por dominio (cobertura funcional + señales de pruebas + endpoints activos/pendientes).
- Priorización de riesgos técnicos y operativos para un roadmap de endurecimiento.

### Metodología

- Inspección estática de rutas, features y tests existentes.
- Trazabilidad por evidencia en archivos concretos (sin ejecutar fixes).
- Clasificación por criticidad usando impacto x probabilidad.

### Criterios de evaluación

- Completitud funcional (flujo utilizable end-to-end).
- Robustez técnica (manejo de errores, contratos, consistencia).
- Cobertura de pruebas por dominio.
- Riesgo de operación (deuda, rutas placeholder, piezas vacías).

## 3) Hallazgos (1..12)

### Hallazgo 1 - Madurez alta en autenticación base

El dominio de auth tiene rutas, acciones y capa server bien definidas, incluyendo guardas y recuperación de usuario.

**Evidencia:** `src/features/auth/server/require-user.ts`, `src/features/auth/server/get-current-user.ts`, `src/features/auth/actions/login-action.ts`, `src/features/auth/actions/register-action.ts`, `src/features/auth/server/auth-guards.test.ts`.

### Hallazgo 2 - Flujo de onboarding con núcleo funcional y pruebas

Onboarding presenta lógica de estado, resolución de entrada y persistencia de pasos con cobertura de pruebas server y esquema.

**Evidencia:** `src/features/wizard/server/get-onboarding-state.ts`, `src/features/wizard/server/resolve-onboarding-entry.ts`, `src/features/wizard/server/save-onboarding-step.ts`, `src/features/wizard/server/get-onboarding-state.test.ts`, `src/features/wizard/schemas/wizard.schema.test.ts`, `src/app/(app)/onboarding/page.tsx`.

### Hallazgo 3 - Perfil con implementación consistente y desacoplada

El módulo de perfil combina capa de lectura/escritura, mapeadores y formularios con separación razonable de responsabilidades.

**Evidencia:** `src/features/profile/server/get-profile.ts`, `src/features/profile/server/save-profile.ts`, `src/features/profile/services/profile.mapper.ts`, `src/features/profile/components/profile-form.tsx`, `src/features/profile/actions/save-profile-action.test.ts`, `src/app/(app)/perfil/page.tsx`.

### Hallazgo 4 - Secciones CV/LinkedIn/Traducción en rutas principales con UI mínima

Las páginas principales existen pero hoy funcionan como contenedor informativo, sin flujo operacional completo.

**Evidencia:** `src/app/(app)/cv/page.tsx`, `src/app/(app)/linkedin/page.tsx`, `src/app/(app)/traduccion/page.tsx`.

### Hallazgo 5 - Editor/preview de CV y LinkedIn sin implementación efectiva

Las rutas críticas de edición/preview retornan `null`, indicando dependencia de desarrollo pendiente para habilitar uso real.

**Evidencia:** `src/app/(app)/cv/editor/page.tsx`, `src/app/(app)/cv/preview/page.tsx`, `src/app/(app)/linkedin/editor/page.tsx`, `src/app/(app)/linkedin/preview/page.tsx`.

### Hallazgo 6 - Endpoints API de generación/traducción en estado placeholder

Rutas API clave responden mensajes de "pendiente de implementación", lo que bloquea capacidades productivas del dominio.

**Evidencia:** `src/app/api/cv/generate/route.ts`, `src/app/api/linkedin/generate/route.ts`, `src/app/api/translation/route.ts`, `src/app/api/cv/pdf/route.ts`.

### Hallazgo 7 - Capa Documents con archivos server vacíos

Hay contratos/rutas de documentos declarados, pero funciones server esenciales aparecen vacías (0 líneas), elevando riesgo de integración incompleta.

**Evidencia:** `src/features/documents/server/generate-pdf.ts`, `src/features/documents/server/upload-document.ts`, `src/features/documents/server/get-document-url.ts`.

### Hallazgo 8 - Desbalance de cobertura de pruebas entre dominios

Auth/Onboarding/Profile cuentan con pruebas visibles; CV/LinkedIn/Documents no muestran suites equivalentes, y Translation solo tiene señales de esquema/tipos.

**Evidencia:**

- Con pruebas: `src/features/auth/**/*.test.*`, `src/features/wizard/**/*.test.*`, `src/features/profile/**/*.test.*`.
- Sin pruebas detectadas: `src/features/cv/**/*.test.*`, `src/features/linkedin/**/*.test.*`, `src/features/documents/**/*.test.*`.
- Cobertura parcial en Translation: `src/features/translation/schemas/translation.schema.test.ts`, `src/features/translation/types/translation.types.test.ts`.

### Hallazgo 9 - Riesgo de deuda por esqueleto funcional adelantado a la lógica

Existe estructura de carpetas y nombres de servicios en dominios no maduros, pero sin cierre operacional homogéneo en rutas, server y tests.

**Evidencia:** coexistencia de archivos en `src/features/cv/**`, `src/features/linkedin/**`, `src/features/documents/**` junto con placeholders en `src/app/api/**` y páginas `editor/preview`.

### Hallazgo 10 - Dependencia de Supabase correctamente centralizada, pero con variabilidad de madurez por feature

La app reutiliza cliente server para acceso a datos, aunque el uso robusto está más consolidado en auth/profile/wizard que en módulos aún en construcción.

**Evidencia:** `src/lib/supabase/server.ts`, `src/features/auth/server/get-current-user.ts`, `src/features/profile/server/get-profile.ts`, `src/features/wizard/server/get-onboarding-state.ts`.

### Hallazgo 11 - Rutas de aplicación están bien segmentadas por dominios

La estructura App Router separa `(auth)`, `(app)` y `(marketing)`, lo que reduce acoplamiento y facilita endurecimiento incremental por módulo.

**Evidencia:** `src/app/(auth)/**`, `src/app/(app)/**`, `src/app/(marketing)/**`.

### Hallazgo 12 - Necesidad de gate de "ready" por dominio antes de escalar funcionalidades

Sin criterios de entrada/salida por módulo (API + UI + tests + errores), existe riesgo de liberar funcionalidades con experiencia incompleta.

**Evidencia:** combinación de rutas operativas en perfil/onboarding con placeholders o archivos vacíos en CV/LinkedIn/Translation/Documents.

## 4) Matriz de riesgos - Top 10

| #   | Riesgo                                                                           | Impacto | Probabilidad | Severidad | Evidencia principal                                                                                                                             |
| --- | -------------------------------------------------------------------------------- | ------- | ------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Endpoints críticos en placeholder (CV/LinkedIn/Translation/PDF)                  | Alto    | Alto         | Critica   | `src/app/api/cv/generate/route.ts`, `src/app/api/linkedin/generate/route.ts`, `src/app/api/translation/route.ts`, `src/app/api/cv/pdf/route.ts` |
| 2   | Documentos server sin implementación                                             | Alto    | Alto         | Critica   | `src/features/documents/server/generate-pdf.ts`, `src/features/documents/server/upload-document.ts`                                             |
| 3   | Flujos editor/preview no operativos                                              | Alto    | Alto         | Critica   | `src/app/(app)/cv/editor/page.tsx`, `src/app/(app)/linkedin/preview/page.tsx`                                                                   |
| 4   | Cobertura de pruebas insuficiente en módulos de salida (CV/LinkedIn/Documents)   | Alto    | Alto         | Alta      | ausencia de `*.test.*` en `src/features/cv/**`, `src/features/linkedin/**`, `src/features/documents/**`                                         |
| 5   | Riesgo de integración tardía entre UI, API y capa server                         | Alto    | Media        | Alta      | desalineación entre `src/app/(app)/**` y `src/app/api/**`                                                                                       |
| 6   | Inconsistencia de experiencia al usuario entre módulos maduros e incompletos     | Medio   | Alto         | Alta      | páginas funcionales en perfil/onboarding vs páginas mínimas en CV/LinkedIn/Traducción                                                           |
| 7   | Deuda de arquitectura por esqueletos no cerrados                                 | Medio   | Alto         | Alta      | estructura amplia en `src/features/cv/**` y `src/features/linkedin/**` sin cobertura equivalente                                                |
| 8   | Riesgo de defectos ocultos en rutas sin tests de integración                     | Alto    | Media        | Alta      | ausencia de pruebas integrales para generación y exportación                                                                                    |
| 9   | Falta de criterios explícitos de readiness por dominio                           | Medio   | Media        | Media     | no se observan gates formales por módulo en documentación de auditoría actual                                                                   |
| 10  | Bloqueo de valor de negocio en módulos de empleabilidad (CV/LinkedIn/Traducción) | Alto    | Media        | Alta      | endpoints y vistas principales aún no productivos                                                                                               |

## 5) Backlog propuesto por horizontes

### Horizonte 1 (0-30 días) - Estabilización crítica

- Definir "Definition of Ready" y "Definition of Done" por dominio (CV, LinkedIn, Translation, Documents).
- Eliminar placeholders en API con contratos mínimos funcionales y errores tipados.
- Implementar funciones server vacías de Documents para no bloquear exportación.
- Habilitar un flujo vertical mínimo (perfil -> traducción -> preview) en entorno controlado.
- Añadir pruebas unitarias mínimas en CV/LinkedIn/Documents (contratos, mappers, casos de error).

### Horizonte 2 (31-90 días) - Consolidación funcional

- Completar editor + preview de CV y LinkedIn con persistencia y validaciones.
- Integrar generación de contenido con capa translation y reglas de consistencia.
- Agregar pruebas de integración API + server para generación/exportación.
- Endurecer observabilidad de errores en rutas críticas (API y server actions).
- Definir criterios de rollout por feature flag o activación gradual por módulo.

### Horizonte 3 (91-180 días) - Escalamiento y confiabilidad

- Optimizar performance y tiempos de generación (especialmente exportación PDF).
- Incorporar pruebas E2E de journeys completos de empleabilidad.
- Estandarizar métricas de calidad por dominio (defect leakage, cobertura útil, MTTR).
- Documentar arquitectura objetivo de módulos de salida (CV/LinkedIn/Documents).
- Preparar plan de hardening continuo con revisiones trimestrales de riesgo.

## 6) Roadmap sugerido

### Fase A - Contención de riesgo (semanas 1-3)

- Objetivo: cerrar brechas críticas que impiden operación real.
- Resultado esperado: API críticas sin placeholders y server documents operativo.

### Fase B - Vertical slices productivos (semanas 4-8)

- Objetivo: entregar flujos utilizables de CV/LinkedIn con persistencia y preview.
- Resultado esperado: experiencia funcional básica para usuarios piloto.

### Fase C - Hardening de calidad (semanas 9-12)

- Objetivo: elevar confiabilidad con pruebas de integración, manejo de errores y observabilidad.
- Resultado esperado: reducción de riesgo operativo y mayor predictibilidad de releases.

### Fase D - Escalado controlado (trimestre siguiente)

- Objetivo: optimizar performance y robustecer journeys end-to-end.
- Resultado esperado: readiness para crecimiento de uso y menor deuda acumulada.

## 7) Definition of Done (DoD) de endurecimiento

Un dominio se considera "endurecido" solo si cumple TODOS los criterios:

1. **Funcionalidad end-to-end:** ruta UI + capa server + endpoint/API operativos sin placeholders.
2. **Contratos claros:** schemas/types actualizados y consistentes con payloads reales.
3. **Manejo de errores:** errores tipados, mensajes accionables y estados de falla previstos.
4. **Pruebas mínimas obligatorias:** unitarias en lógica crítica + integración en flujos server/API.
5. **No archivos vacíos en rutas críticas:** prohibido merge con funciones server sin implementación.
6. **Observabilidad básica:** logging de errores críticos y trazabilidad por feature.
7. **Validación de release:** pasar `pnpm lint`, `pnpm typecheck`, `pnpm test:run` para el dominio afectado.
8. **Documentación viva:** estado del módulo y decisiones técnicas registradas en `docs/`.

## 8) Conclusión ejecutiva

Brújula Civil tiene una base confiable en auth, onboarding y perfil, lo que habilita avanzar por capas. El riesgo mayor NO está en fundamentos, sino en módulos de salida al usuario (CV/LinkedIn/Translation/Documents) aún incompletos en rutas, API y pruebas. La prioridad recomendada es endurecimiento por vertical slices con gates de calidad explícitos antes de escalar alcance funcional.
