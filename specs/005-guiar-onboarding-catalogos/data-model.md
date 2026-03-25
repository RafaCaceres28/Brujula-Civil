# Phase 1 Data Model - 005-guiar-onboarding-catalogos

## Scope

Modelar onboarding guiado por catalogos sobre la estructura actual de draft (`onboardingDraftSchema`) separando formalmente:

- campos estructurados controlados por catalogo,
- campos narrativos/complementarios de texto libre,
- y compatibilidad de reingreso con payload legacy.

## Canonical Entities

### 1) CatalogFieldDefinition

- **Purpose**: contrato de cada campo estructurado de onboarding.
- **Fields**:
  - `step: 'militar' | 'experiencia' | 'competencias' | 'objetivos'`
  - `fieldKey: string`
  - `mode: 'single' | 'multi' | 'compound'`
  - `allowedValues: string[]` (fuente: `wizard-catalogs.ts`)
  - `legacyFallback: 'drop' | 'map_to_other' | 'keep_if_valid'`

### 2) NarrativeFieldDefinition

- **Purpose**: contrato de campos libres permitidos por negocio.
- **Fields**:
  - `step`
  - `fieldKey`
  - `maxLength`
  - `required: boolean`

Campos narrativos del alcance:

- `militar.notes`
- `experiencia.additionalContext`
- `experiencia.achievements`
- `competencias.extraTraining`
- `objetivos.preferencesNotes`
- `militar.unitName` (complementario)

### 3) GuidedOnboardingDraft

- **Base**: `onboardingDraftSchema` actual.
- **Evolucion**:
  - campos estructurados validan contra catalogs.
  - campos narrativos conservan string/array libre con max length.
  - shape general del draft se mantiene para compatibilidad de persistencia.

### 4) CatalogSelectionSnapshot

- **Storage**: dentro de `aggregated_draft_jsonb` por paso (sin tabla nueva).
- **Purpose**: asegurar que valores guardados corresponden a ids de catalogo validos en el momento del guardado.
- **Fields (conceptuales para trazabilidad, no tabla nueva)**:
  - `step`
  - `fieldKey`
  - `selectedValues`
  - `savedAt`

### 5) DownstreamConsistencyContext

- **Purpose**: subconjunto de datos estructurados que consume recommendations/translation/profile.
- **Anchors**:
  - `buildRecommendationInput` (recommendations)
  - `projectWizardToProfiles` (profile)
  - pipeline translation/cv/pdf (trazabilidad ya existente)

## Structured vs Narrative Matrix

### Militar

- **Structured**: `branch`, `corps`, `rank.code`, `specialty.code`, `destinationContext`, `leadershipLevel`, `teamSize`, `serviceYears`
- **Narrative**: `unitName`, `notes`

### Experiencia

- **Structured**: `responsibilityAreas[]`, `missionTypes[]`, `functionTypes[]`, `tools[]`, `leadershipScopes[]`
- **Narrative**: `achievements[]`, `additionalContext`

### Competencias

- **Structured**: `technicalSkills[]`, `softSkills[]`, `certifications[]`, `drivingLicenses[]`, `officeTools[]`, `languages[].name/level`
- **Narrative**: `extraTraining`

### Objetivos

- **Structured**: `targetRoles[]`, `targetSectors[]`, `preferredLocations[]`, `workModel`, `seniority`
- **Narrative**: `preferencesNotes`

## Invariants

1. Ningun campo estructurado puede persistir valores fuera de su catalogo.
2. Campos narrativos mantienen max length y sanitizacion (`trim`, `nullable`).
3. Guardado de onboarding debe preservar `employabilityFlow` existente (recomendaciones/trazas).
4. Reingreso no falla por drafts legacy; si hay valor invalido legacy en campo estructurado, se degrada a `null`/`[]` y se conserva continuidad de flujo.
5. `targetRoles[].slug` debe derivar de opcion canonical o mapearse a opcion valida de catalogo.

## Migration and Compatibility Rules

1. **Lectura**: parse tolerante de drafts anteriores.
2. **Edicion**: UI guiada solo produce ids validos.
3. **Guardado**: mapper/schema rechazan valores fuera de catalogo.
4. **Persistencia**: no sobrescribir trazas de `employabilityFlow` en merge.
5. **Downstream**: consumers existentes reciben shape compatible, con menor ambiguedad semantica.

## Testable Model Expectations

- `wizard.schema.test.ts`: rechaza ids invalidos en campos estructurados y mantiene narrativos.
- `wizard-form.mapper.test.ts`: parsea controles guiados por ids canonicos.
- `save-onboarding-step.test.ts`: mergea draft guiado sin romper `employabilityFlow`.
- `get-onboarding-overview.test.ts`: rehidrata draft mixto legacy + guiado.
