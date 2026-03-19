# Design: Definición de contrato de entrada y salida para traducción militar-civil

## Technical Approach

El enfoque técnico consiste en definir esquemas Zod para validar tanto la entrada como la salida de la función de traducción militar-civil, siguiendo los patrones establecidos en otros esquemas del proyecto (como profile.schema.ts). Los esquemas se alinearán con los tipos existentes en TranslationResult y aprovecharán las utilidades de Zod para manejo de valores nulos y trimado.

## Architecture Decisions

### Decision: Utilizar esquemas Zod con preprocess para manejo de valores nulos y strings vacíos

**Choice**: Implementar esquemas de entrada y salida utilizando utilidades de Zod como `z.preprocess` para convertir strings vacíos a null y aplicar trimado automático, siguiendo el patrón visto en profile.schema.ts.

**Alternatives considered**:

- Usar solo `z.string().trim().nullable()` sin preprocess
- No manejar valores nulos y dejar que la lógica de negocio los maneje
- Utilizar esquemas sin validación de longitud mínima/máxima

**Rationale**: El patrón de preprocess visto en profile.schema.ts proporciona un manejo consistente de valores nulos y strings vacíos, reduciendo la carga en la lógica de negocio y asegurando que los datos limpios lleguen a las capas posteriores. Esto mejora la robustez y mantiene la consistencia con el resto del códigobase.

### Decision: Alinear esquemas con tipos existentes de TranslationResult

**Choice**: Definir el esquema de salida basado exactamente en la estructura del tipo `TranslationResult` existente en translation.types.ts.

**Alternatives considered**:

- Crear un esquema de salida independiente sin referencia al tipo existente
- Definir el tipo TranslationResult basado en el esquema (inverso)
- Añadir campos adicionales al esquema que no están en el tipo

**Rationale**: Mantener una única fuente de verdad para la estructura de datos evita inconsistencias entre tipos y esquemas. Al derivar el esquema del tipo existente (o viceversa), se asegura que cualquier cambio en la estructura se refleje en ambos lugares, reduciendo el riesgo de desalineación.

## Data Flow

    Onboarding Draft ──→ Translation Input Schema ──→ [Translation Logic] ──→ Translation Output Schema ──→ Persisted Profile
          │                                      │                           │                           │
          └──────────── Validación ──────────────┘                           └──────────── Validación ───────┘

El flujo comienza con un draft de onboarding que se valida contra el esquema de entrada antes de ser procesado por la lógica de traducción. El resultado se valida contra el esquema de salida antes de ser persistido o utilizado en la UI.

## File Changes

| File                                                     | Action             | Description                                                                                                       |
| -------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/features/translation/schemas/translation.schema.ts` | Modify             | Refinar esquemas de entrada y salida siguiendo patrones del proyecto y asegurando alineación con tipos existentes |
| `src/features/translation/types/translation.types.ts`    | Modify (potencial) | Asegurar que los tipos reflejen exactamente la estructura definida en los esquemas (si hay divergencias)          |

## Interfaces / Contracts

```typescript
// Esquema de entrada para traducción militar-civil
export const translationInputSchema = z.object({
  militaryProfile: z.object({
    rank: nullableTrimmedString(MAX_NAME_LENGTH),
    area: nullableTrimmedString(MAX_NAME_LENGTH),
    yearsOfService: z.number().int().min(0).max(60).nullable(),
    summary: nullableTrimmedStringWithDefault(MAX_SUMMARY_LENGTH),
  }),
  civilianTarget: z.object({
    targetRole: nullableTrimmedString(MAX_NAME_LENGTH),
    targetSector: nullableTrimmedString(MAX_NAME_LENGTH),
    locationPreference: nullableTrimmedString(MAX_NAME_LENGTH),
  }),
});

// Esquema de salida para traducción militar-civil
export const translationOutputSchema = z.object({
  professionalSummary: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
  transferableSkills: z.array(z.string().trim().min(1)).min(1),
  suggestedRoles: z.array(z.string().trim().min(1)).min(1),
});

// Tipos inferidos para uso en TypeScript
export type TranslationInput = z.infer<typeof translationInputSchema>;
export type TranslationOutput = z.infer<typeof translationOutputSchema>;

// Donde nullableTrimmedString y nullableTrimmedStringWithDefault siguen el patrón de profile.schema.ts
```

## Testing Strategy

| Layer       | What to Test                                           | Approach                                                                                                                 |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Unit        | Validación de esquemas de entrada y salida             | Tests que verifiquen que los esquemas aceptan datos válidos y rechazan datos inválidos con mensajes de error específicos |
| Unit        | Inferencia de tipos TypeScript                         | Tests que confirmen que `z.infer<typeof schema>` produce los tipos esperados                                             |
| Integración | Consistencia entre esquemas y tipos existentes         | Tests que validen que los esquemas son compatibles con los tipos definidos en translation.types.ts                       |
| Integración | Flujo completo de validación → traducción → validación | Tests que simulen el flujo completo desde entrada válida hasta salida válida                                             |

## Migration / Rollout

No se requiere migración ya que solo se están definiendo esquemas de validación sin modificar datos existentes.

Rollout: Los esquemas pueden ser implementados de forma independiente ya que no afectan lógica de negocio existente. Los componentes que utilicen la función de traducción deberán actualizarse para pasar los datos a través de los nuevos esquemas de validación.

## Open Questions

- [ ] ¿Cuál debería ser el valor máximo para campos de texto como professionalSummary? Actualmente se usa MAX_SUMMARY_LENGTH de profile.schema.ts (500 caracteres), pero podría necesitar ajuste específico para traducción.
- [ ] ¿Debemos considerar la inclusión de metadatos adicionales en la salida como timestamp o versión del algoritmo de traducción?
- [ ] ¿Cómo manejaremos la evolución futura de estos esquemas? ¿Necesitamos versiones o estrategias de compatibilidad hacia atrás?

## Next Step

Ready for tasks (sdd-tasks).
