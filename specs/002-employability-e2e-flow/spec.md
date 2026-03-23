# Feature Specification: Flujo E2E de Empleabilidad a CV Exportable

**Feature Branch**: `002-employability-e2e-flow`
**Created**: 2026-03-23
**Status**: Completed
**Input**: User description: "Crear una funcionalidad end-to-end para Brújula Civil que permita al usuario completar el flujo principal de empleabilidad desde su perfil hasta un CV exportable."

## Constitution Alignment (mandatory)

- **Verify-First Evidence**: Revisión de `.opencode/command/speckit.specify.md`, `.specify/templates/spec-template.md`, `.specify/templates/checklist-template.md` y ejecución única de `.specify/scripts/bash/create-new-feature.sh` con salida JSON para generar branch y ruta de especificación.
- **Contract Impact**: Se requiere definir y alinear contratos de dominio para perfil fuente, traducción profesional, documento editable de CV, snapshot de preview y artefacto de exportación. Impacto esperado en `types` y `schemas` del dominio de empleabilidad/CV.
- **Security Impact**: El flujo debe evitar exposición de detalles internos en errores, respetar aislamiento por usuario de datos de perfil/traducción/CV y prevenir mezclas de contenido entre cuentas.
- **Quality Gate Plan**: En etapas de implementación se validará alcance afectado con `pnpm lint`, `pnpm typecheck` y `pnpm test:run`, incluyendo pruebas de flujo feliz, estados vacíos y manejo de errores del proceso de exportación.

## User Scenarios & Testing (mandatory)

User stories MUST be prioritized and independently testable.

### User Story 1 - Completar flujo principal hasta PDF (Priority: P1)

Como usuario autenticado con perfil cargado, quiero generar un CV profesional desde mi información actual, revisarlo y exportarlo a PDF sin salir de la aplicación.

**Why this priority**: Es el objetivo de negocio central del vertical slice: demostrar valor real de punta a punta en una sola sesión de uso.
**Independent Test**: Validar que un usuario con perfil completo puede recorrer perfil -> traducción -> preview -> edición -> exportación y obtener un PDF final disponible dentro del flujo.

**Acceptance Scenarios**:

1. **Given** un usuario con perfil y experiencia estructurada suficientes, **When** inicia la generación de CV y completa la revisión/edición, **Then** obtiene un PDF final consistente con el contenido aprobado en preview.
2. **Given** un usuario que regresa al flujo después de interrumpir su sesión, **When** retoma el proceso, **Then** encuentra su progreso y contenido editable recuperado sin pérdida relevante de trabajo.

---

### User Story 2 - Editar contenido antes de exportar (Priority: P2)

Como usuario, quiero modificar manualmente el contenido propuesto antes de exportar para asegurar que el resultado refleje mi intención profesional.

**Why this priority**: La edición previa a exportación es condición explícita de aceptación y reduce riesgo de rechazo por baja calidad percibida del contenido generado.
**Independent Test**: Verificar que cambios manuales en secciones clave del CV impactan directamente el preview y quedan reflejados en el PDF exportado.

**Acceptance Scenarios**:

1. **Given** un contenido traducido autogenerado en preview, **When** el usuario edita texto en una o más secciones, **Then** el preview se actualiza con esas ediciones y el PDF final conserva el mismo significado profesional.
2. **Given** ediciones válidas guardadas por el usuario, **When** recarga o reingresa al flujo, **Then** las ediciones persisten y continúan disponibles para revisión final.

---

### User Story 3 - Comprender estados y errores del flujo (Priority: P3)

Como usuario, quiero ver estados claros de carga, vacío y error para entender qué está pasando y qué acción debo tomar cuando algo falla.

**Why this priority**: Mejora confianza y completitud del flujo, evitando abandono por incertidumbre o mensajes técnicos incomprensibles.
**Independent Test**: Simular ausencia de datos, latencia y fallos controlados para confirmar mensajes comprensibles, acciones de recuperación y ausencia de información sensible.

**Acceptance Scenarios**:

1. **Given** que faltan datos mínimos de perfil, **When** el usuario intenta generar el CV, **Then** recibe un estado vacío accionable que explica qué completar antes de continuar.
2. **Given** un error durante traducción, preview o exportación, **When** ocurre la falla, **Then** el usuario ve un mensaje claro, no técnico, con alternativa para reintentar sin perder su trabajo previo.

## Edge Cases

- El perfil del usuario existe pero no contiene experiencia suficiente para generar contenido profesional de forma útil.
- La traducción profesional devuelve contenido incompleto o con secciones faltantes respecto del perfil fuente.
- El usuario edita manualmente campos críticos y genera inconsistencias semánticas entre secciones del CV.
- El usuario intenta exportar mientras aún hay una operación previa en curso.
- La exportación falla después de que el preview fue aprobado por el usuario.
- El usuario abre el mismo flujo desde dos sesiones y hay conflicto de cambios recientes.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: El sistema DEBE consumir el perfil actual del usuario autenticado como fuente principal para iniciar el flujo de empleabilidad.
- **FR-002**: El sistema DEBE transformar la información de perfil y experiencia en una versión de lenguaje profesional civil utilizable para CV.
- **FR-003**: El sistema DEBE generar un preview de CV basado en la traducción profesional y mostrarlo en una estructura revisable por el usuario.
- **FR-004**: El sistema DEBE permitir edición manual del contenido del CV antes de exportar, incluyendo actualización visible del preview.
- **FR-005**: El sistema DEBE exportar un PDF cuyo contenido sea semánticamente consistente con el preview confirmado por el usuario.
- **FR-006**: El sistema DEBE presentar estados de carga, vacío y error con mensajes comprensibles orientados al usuario final.
- **FR-007**: El sistema DEBE persistir el progreso y el contenido editable del flujo para evitar pérdida de trabajo ante interrupciones.
- **FR-008**: El sistema DEBE mantener trazabilidad mínima entre perfil fuente, traducción generada, versión de preview y versión exportada.
- **FR-009**: El sistema DEBE validar entradas no confiables en los límites del flujo antes de procesarlas.
- **FR-010**: El sistema DEBE exponer mensajes de error seguros para usuario final sin revelar detalles internos de implementación.
- **FR-011**: El sistema DEBE mantener compatibilidad de experiencia para usuarios que ya tienen información de perfil creada previamente.

### Non-Functional Requirements

- **NFR-001**: El flujo DEBE mantener impacto neutro de performance percibida en los pasos principales (traducción, preview editable y solicitud de exportación) respecto del baseline definido para la iniciativa.
- **NFR-002**: El sistema DEBE mantener errores seguros para usuario final (sin filtrado de detalles internos) y observables para diagnóstico en backend.
- **NFR-003**: La implementación DEBE preservar la arquitectura feature-first y extender módulos existentes de forma incremental, sin reescrituras completas innecesarias.

### Key Entities (include if feature involves data)

- **PerfilBaseUsuario**: Representa los datos estructurados actuales del usuario (identidad profesional, experiencia, educación y habilidades) usados como origen del flujo.
- **TraduccionProfesionalCV**: Representa la conversión del perfil a narrativa profesional civil, con secciones textuales aptas para CV.
- **BorradorCVEditable**: Representa el contenido editable por el usuario antes de exportar, incluyendo historial mínimo de actualización y estado de completitud.
- **SnapshotPreviewCV**: Representa la versión de preview presentada para revisión, asociada a una versión concreta del borrador editable.
- **ArtefactoPDFCV**: Representa la salida exportada final con referencia trazable al snapshot de preview que le dio origen.

### Dependencies & Assumptions

- Se asume que el usuario está autenticado y cuenta con permiso para acceder y editar su propio flujo de CV.
- Se asume disponibilidad de datos mínimos de perfil; si no existen, el flujo debe detenerse con estado vacío accionable.
- Se asume que el flujo se enfoca en un único CV activo por usuario para este vertical slice.
- Se asume que la trazabilidad mínima exige al menos vinculación entre origen de perfil, versión traducida, versión de preview y exportación final.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Al menos 85% de usuarios con perfil completo que inician el flujo logran llegar a un PDF exportado sin salir de la aplicación.
- **SC-002**: Al menos 90% de usuarios que editan contenido antes de exportar confirman que sus cambios aparecen en el resultado final exportado.
- **SC-003**: En validaciones funcionales del vertical slice, 100% de casos aprobados mantienen consistencia semántica entre preview y PDF final.
- **SC-004**: En pruebas de error del flujo, 100% de mensajes visibles para usuario se presentan en lenguaje comprensible y sin exponer detalles internos.
- **SC-005**: En pruebas de interrupción y reingreso, al menos 95% de sesiones recuperan el progreso y borrador editable sin pérdida material.
