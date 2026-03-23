# Roadmap técnico - Next Steps (Brújula Civil)

## Estado actual del producto

Basado en `docs/codebase-research.md` y consistente con `docs/codebase-audit.md`, el producto presenta dos velocidades de madurez:

- **Base sólida y utilizable** en autenticación, onboarding y perfil (`src/features/auth/**`, `src/features/wizard/**`, `src/features/profile/**`).
- **Bloqueos críticos en salida de valor** (CV, LinkedIn, traducción, documentos) por placeholders, rutas no operativas y funciones server vacías (`src/app/api/cv/generate/route.ts`, `src/app/api/linkedin/generate/route.ts`, `src/app/api/translation/route.ts`, `src/app/api/cv/pdf/route.ts`, `src/features/documents/server/*.ts`, `src/app/(app)/cv/**`, `src/app/(app)/linkedin/**`).

Conclusión arquitectónica: el riesgo principal no es de stack ni de fundamento técnico, sino de **integración incompleta entre UI + API + server + contratos + pruebas** en dominios de empleabilidad.

## Objetivos técnicos de corto plazo

### Iniciativa 1 - Contratos funcionales mínimos para APIs críticas

- nombre: Contratos funcionales mínimos para APIs críticas (CV/LinkedIn/Translation/PDF)
- problema que resuelve: Endpoints críticos en placeholder bloquean cualquier flujo end-to-end utilizable.
- impacto: Alto (desbloquea capacidad real de producto y reduce riesgo de release engañoso).
- esfuerzo estimado (S/M/L): M
- dependencias: Iniciativa 5 (contratos unificados), Iniciativa 2 (documents operativo para PDF).
- recomendación de prioridad: **Now (P0)**

### Iniciativa 2 - Operativizar capa Documents server

- nombre: Operativizar capa Documents server (generate/upload/url)
- problema que resuelve: Archivos server vacíos impiden exportación y gestión documental reales.
- impacto: Alto (habilita parte final del flujo de empleabilidad y reduce deuda crítica).
- esfuerzo estimado (S/M/L): M
- dependencias: Iniciativa 5 (contratos), Iniciativa 7 (errores/observabilidad básica).
- recomendación de prioridad: **Now (P0)**

### Iniciativa 3 - Gate de readiness por dominio

- nombre: Definition of Ready/Done por dominio de salida
- problema que resuelve: No hay criterio explícito para evitar liberar módulos incompletos.
- impacto: Alto (gobernanza técnica, menor deuda futura, releases predecibles).
- esfuerzo estimado (S/M/L): S
- dependencias: Ninguna técnica dura; usa evidencia de auditoría y standards del repo.
- recomendación de prioridad: **Now (P0)**

## Objetivos técnicos de medio plazo

### Iniciativa 4 - Vertical slice empleable end-to-end

- nombre: Slice perfil -> traducción -> preview CV -> exportación PDF
- problema que resuelve: No existe flujo verificable completo de generación de valor al usuario.
- impacto: Muy alto (primera capacidad comercialmente defendible del producto).
- esfuerzo estimado (S/M/L): L
- dependencias: Iniciativa 1, Iniciativa 2, Iniciativa 5, Iniciativa 6.
- recomendación de prioridad: **Next (P1)**

### Iniciativa 6 - Cobertura de pruebas de integración en dominios de salida

- nombre: Test harness de integración API+server para CV/LinkedIn/Documents
- problema que resuelve: Defectos ocultos por falta de pruebas en rutas críticas de generación/exportación.
- impacto: Alto (sube confiabilidad y reduce regresiones en cambios futuros).
- esfuerzo estimado (S/M/L): M
- dependencias: Iniciativa 1 e Iniciativa 2 para tener superficie funcional testeable.
- recomendación de prioridad: **Next (P1)**

### Iniciativa 7 - Taxonomía de errores y observabilidad mínima

- nombre: Estandarización de errores de dominio + logging por feature
- problema que resuelve: Manejo heterogéneo de fallos dificulta soporte, triage y operación.
- impacto: Medio-alto (mejora MTTR y calidad operativa).
- esfuerzo estimado (S/M/L): M
- dependencias: Iniciativa 3 (gates) para formalizar criterios de operación.
- recomendación de prioridad: **Next (P1)**

## Refactors imprescindibles

### Iniciativa 5 - Unificación de contratos de dominio

- nombre: Homologar schemas/types/resultados en CV/LinkedIn/Translation/Documents
- problema que resuelve: Contratos incompletos o vacíos crean drift entre rutas, server y tipos.
- impacto: Alto (reduce acoplamiento implícito y errores de integración).
- esfuerzo estimado (S/M/L): M
- dependencias: Ninguna bloqueante; se recomienda iniciar en paralelo con Iniciativa 1.
- recomendación de prioridad: **Now (P0)**

## Refactors recomendables

### Iniciativa 8 - Refactor de mapeadores cross-feature

- nombre: Extraer y consolidar mapeadores wizard/profile/translation
- problema que resuelve: Riesgo de duplicación semántica y divergencia entre modelo militar y salidas civiles.
- impacto: Medio-alto (consistencia de datos y menor costo de mantenimiento).
- esfuerzo estimado (S/M/L): M
- dependencias: Iniciativa 5 (contratos estables), Iniciativa 4 (flujo vertical definido).
- recomendación de prioridad: **Later (P2)**

## Riesgos a resolver antes de crecer

- **Riesgo: UX visible sin backend real** -> mitigado por Iniciativa 1 e Iniciativa 4.
- **Riesgo: exportación bloqueada por funciones vacías** -> mitigado por Iniciativa 2.
- **Riesgo: regresiones en módulos no cubiertos** -> mitigado por Iniciativa 6.
- **Riesgo: deuda de integración por contratos débiles** -> mitigado por Iniciativa 5.
- **Riesgo: operación reactiva sin trazabilidad** -> mitigado por Iniciativa 7.
- **Riesgo: releases sin criterios de entrada/salida** -> mitigado por Iniciativa 3.

## Dependencias entre iniciativas

Secuencia de acoplamientos técnicos recomendada:

1. Iniciativa 3 (gates) define marco de calidad y aceptación.
2. Iniciativa 5 (contratos) fija interfaces para implementación estable.
3. Iniciativa 1 (APIs críticas) y 2 (documents) habilitan backend operativo mínimo.
4. Iniciativa 6 (tests integración) valida el comportamiento real de 1+2.
5. Iniciativa 4 (vertical slice) integra UX y capacidad end-to-end.
6. Iniciativa 7 (errores/observabilidad) endurece operación tras flujo funcional.
7. Iniciativa 8 (mapeadores cross-feature) optimiza mantenibilidad para escala.

## Quick wins

- **Iniciativa 3** (S): mayor retorno por menor esfuerzo; reduce riesgo de decisiones difusas.
- **Iniciativa 5** (M, arrancable por submódulos): elimina deuda estructural antes de implementar más lógica.
- **Apalancar el trabajo documental existente**: usar este roadmap como baseline para las primeras specs de spec-kit.

## Trabajo de arquitectura/plataforma

Líneas de trabajo con impacto estructural:

- Iniciativa 3 (gobernanza técnica por dominio).
- Iniciativa 5 (contratos y fronteras de dominio).
- Iniciativa 6 (estrategia de pruebas de integración reusable).
- Iniciativa 7 (modelo de errores y observabilidad mínima).
- Iniciativa 8 (estabilidad semántica de mapeos entre features).

## Trabajo de producto/UX con impacto técnico

Líneas de trabajo donde UX depende de decisiones técnicas:

- Iniciativa 1: disponibilidad real de operaciones de generación.
- Iniciativa 2: exportación y acceso a documentos utilizable.
- Iniciativa 4: primer journey completo y demostrable para usuarios piloto.

## Propuesta de priorización: Now / Next / Later

| Iniciativa                             | Prioridad | Motivo arquitectónico                                                  |
| -------------------------------------- | --------- | ---------------------------------------------------------------------- |
| 3. Gate de readiness por dominio       | Now       | Evita que crezca deuda al implementar sobre módulos incompletos.       |
| 5. Unificación de contratos de dominio | Now       | Estabiliza interfaces y reduce retrabajo en API/server/UI.             |
| 1. APIs críticas funcionales           | Now       | Elimina el principal bloqueo de valor en producción.                   |
| 2. Documents server operativo          | Now       | Desbloquea exportación y cierre del flujo de salida.                   |
| 6. Tests de integración en salida      | Next      | Sube confiabilidad una vez el backend mínimo existe.                   |
| 4. Vertical slice end-to-end           | Next      | Convierte capacidad técnica en valor visible de producto.              |
| 7. Errores y observabilidad mínima     | Next      | Mejora soporte, operación y diagnóstico tras habilitar flujo.          |
| 8. Refactor mapeadores cross-feature   | Later     | Optimiza escalabilidad y consistencia una vez estabilizado lo crítico. |
