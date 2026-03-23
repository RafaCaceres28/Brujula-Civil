# Feature Specification: Iniciativa de Contratos de Dominio Unificados

**Feature Branch**: `[001-unify-domain-contracts]`
**Created**: 2026-03-23
**Status**: Completed
**Input**: User description: "Crear una iniciativa de arquitectura para unificar contratos de dominio en Brujula Civil para CV, LinkedIn, Translation y Documents, reduciendo deriva entre capas y habilitando evolucion segura."

## Constitution Alignment (mandatory)

- **Verify-First Evidence**: Se verificaron `.opencode/command/speckit.specify.md`, `.specify/templates/spec-template.md`, `AGENTS.md`, y la estructura `src/features/**` como base para definir alcance y criterios de calidad.
- **Contract Impact**: Se definen contratos minimos de entrada/salida, tipos de resultado, taxonomia de errores y validacion de frontera para los dominios CV, LinkedIn, Translation y Documents; el impacto esperado recae en artefactos de contratos de dominio (schemas, types, result y error) por feature.
- **Security Impact**: Los contratos deben evitar filtrado de detalles internos hacia usuarios finales, clasificar errores de forma segura, y exigir validacion de entradas no confiables en todos los puntos de ingreso.
- **Quality Gate Plan**: La iniciativa se considera lista cuando los contratos se puedan validar mediante pruebas de contrato por dominio y sin regresion en los checks obligatorios del repositorio (lint, tipado y test unitario) sobre el alcance impactado.

## User Scenarios & Testing (mandatory)

User stories MUST be prioritized and independently testable.

### User Story 1 - Definir base comun de contratos (Priority: P1)

Como responsable de arquitectura del producto, necesito una base comun de contratos para los dominios criticos para que frontend, backend y servicios hablen el mismo lenguaje y no se rompan por interpretaciones distintas.

**Why this priority**: Sin base comun, cualquier avance en vertical slices mantiene riesgo alto de retrabajo y bloquea la evolucion segura.
**Independent Test**: Revisar los contratos minimos de CV, LinkedIn, Translation y Documents y comprobar que todos incluyen input/output, resultado estandar y error tipado con criterios uniformes.

**Acceptance Scenarios**:

1. **Given** un dominio critico sin contrato estable, **When** se define su contrato minimo con la convencion comun, **Then** cualquier equipo puede identificar con claridad entradas, salidas y errores permitidos.
2. **Given** dos dominios distintos (por ejemplo CV y Translation), **When** se comparan sus contratos, **Then** ambos siguen la misma estructura conceptual y eliminan ambiguedades de integracion.

---

### User Story 2 - Alinear capas consumidoras de contratos (Priority: P2)

Como desarrollador de features, necesito que UI, acciones de servidor, handlers y servicios consuman contratos alineados para reducir deriva entre capas y evitar rutas o flujos no operativos por desacople semantico.

**Why this priority**: La mayor fuente de ineficiencia actual es la inconsistencia entre capas, no la falta de componentes aislados.
**Independent Test**: Validar, por dominio, que existe trazabilidad entre contrato definido y puntos de consumo en frontend/backend, sin discrepancias de significado en campos o estados de resultado.

**Acceptance Scenarios**:

1. **Given** una capacidad de dominio con contrato definido, **When** se revisa su uso entre capa de presentacion y capa de servidor, **Then** ambos consumen el mismo contrato sin mapeos ad hoc contradictorios.
2. **Given** contenido generado pendiente de publicacion/exportacion/entrega final, **When** el usuario edita en UI y se reevalua el contrato en fronteras, **Then** la editabilidad previa queda habilitada con trazabilidad completa entre frontend, Route Handlers y Server Actions/servicios.

---

### User Story 3 - Habilitar pruebas de contrato y evolucion del vertical slice (Priority: P3)

Como equipo de producto, necesito validar contratos sin depender de implementaciones completas para avanzar de forma incremental en el vertical slice perfil -> traduccion -> preview CV -> PDF.

**Why this priority**: Permite entregar valor por etapas y detectar roturas de integracion antes de cerrar implementaciones finales.
**Independent Test**: Ejecutar pruebas de contrato por dominio usando escenarios de exito y error, confirmando que pueden correr sin requerir servicios finales completamente implementados.

**Acceptance Scenarios**:

1. **Given** un dominio con implementacion parcial, **When** se ejecutan pruebas de contrato sobre sus definiciones publicas, **Then** el resultado confirma compatibilidad esperada o reporta desviaciones de contrato sin bloquear por dependencias faltantes.

## Edge Cases

- Que ocurre cuando un dominio no puede mapear su modelo actual a la convencion comun sin romper consumidores existentes?
- Como se clasifica un error transversal (por ejemplo dependencia externa caida) para que sea consistente entre dominios y seguro para usuarios?
- Que pasa cuando una entrada invalida llega desde una frontera distinta (UI, handler o accion) con formatos incompatibles?
- Como se evita que rutas o placeholders no operativos se publiquen como contratos validos?

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: El sistema de contratos de dominio MUST definir, para CV, LinkedIn, Translation y Documents, contratos minimos explicitos de input y output con significado de negocio claro.
- **FR-002**: El sistema MUST establecer un tipo de resultado uniforme para operaciones de dominio, diferenciando de forma explicita exito y fallo.
- **FR-003**: El sistema MUST definir una taxonomia base de errores tipados de dominio que permita clasificacion consistente y mensajes seguros para usuarios.
- **FR-004**: El sistema MUST exigir validacion de entradas no confiables en fronteras explicitas de UI boundary, Route Handlers y Server Actions para los dominios CV, LinkedIn, Translation y Documents usando el estandar de validacion por esquemas vigente del producto.
- **FR-005**: El sistema MUST establecer una convencion uniforme para artefactos de contrato (schemas, types, result y error) aplicable a todos los dominios priorizados.
- **FR-006**: El sistema MUST asegurar alineacion semantica medible mediante una matriz de alineacion contractual, con 100% de correspondencia entre frontend, Route Handlers y Server Actions/servicios dentro del alcance definido.
- **FR-007**: El sistema MUST permitir que nuevos endpoints, acciones y servicios se definan sobre contratos estables sin depender de decisiones ad hoc por feature.
- **FR-008**: El sistema MUST permitir pruebas de contrato independientes de la implementacion final completa para validar compatibilidad y detectar drift temprano.
- **FR-009**: El sistema MUST mantener compatibilidad con la organizacion feature-first vigente del repositorio, sin exigir una reestructuracion global del producto.
- **FR-010**: El sistema MUST garantizar que todo contenido generado permanezca editable antes de publicacion, exportacion o entrega final.

### Non-Functional Requirements

- **NFR-001**: La adopcion de contratos MUST mantener impacto neutro de performance percibida en los flujos cubiertos por el vertical slice.
- **NFR-002**: Los errores MUST mantenerse seguros para usuario final, sin exponer detalles internos de proveedores o infraestructura.
- **NFR-003**: La iniciativa MUST preservar la estructura feature-first existente sin requerir reestructuracion global del producto.

### Key Entities (include if feature involves data)

- **Domain Contract**: Acuerdo de negocio por dominio que define entradas permitidas, salidas esperadas y restricciones de uso entre capas.
- **Domain Result**: Estructura estandar de resultado que comunica exito o fallo de una operacion de dominio y su contexto funcional.
- **Domain Error**: Error tipado con categoria, severidad y mensaje seguro, util para manejo consistente entre capas y pruebas.
- **Boundary Validation Rule**: Regla de aceptacion o rechazo de entradas en cada frontera del sistema para evitar datos invalidos o ambiguos.

### Assumptions

- La iniciativa cubre definicion y adopcion de contratos minimos por dominio, no la implementacion completa de todas las capacidades de negocio.
- Los cuatro dominios criticos (CV, LinkedIn, Translation y Documents) son el alcance inicial obligatorio; otros dominios quedan fuera de este ciclo.
- El estandar vigente de validacion por esquemas del proyecto se mantiene como base para las fronteras sin abrir un cambio de herramienta en esta iniciativa.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: El 100% de los dominios criticos definidos en alcance (4 de 4) cuenta con contratos minimos publicados y revisables por negocio y desarrollo.
- **SC-002**: Se valida 4/4 dominios con matriz de alineacion contractual, con al menos 1 Route Handler y 1 Server Action/servicio por dominio y 0 discrepancias abiertas.
- **SC-003**: Se incorporan 8 capacidades nuevas de muestra (2 por dominio) en <=4 horas de analisis, sin crear nuevos tipos base fuera de `shared`.
- **SC-004**: El equipo puede ejecutar pruebas de contrato para los dominios priorizados sin requerir implementacion final completa, con tasa de ejecucion exitosa >= 95% en escenarios definidos.
- **SC-005**: La iniciativa deja trazado un camino verificable para construir el vertical slice perfil -> traduccion -> preview CV -> PDF sobre contratos estables compartidos.
- **SC-006**: La editabilidad previa a publicacion/exportacion es obligatoria y queda validada por pruebas de contrato en el vertical slice perfil -> traduccion -> preview CV -> PDF.
