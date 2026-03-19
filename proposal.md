# Proposal: Definición de contrato de entrada y salida para traducción militar-civil

## Intent

Definir claramente los contratos de entrada y salida para el proceso de traducción de perfiles militares a civiles, asegurando consistencia entre el draft del onboarding y el perfil persistido. Este cambio busca establecer una base sólida para la feature de traducción militar-civil al especificar exactamente qué datos se reciben como entrada y qué se produce como salida, facilitando la implementación futura y reduciendo ambigüedades en el proceso de traducción.

## Scope

### In Scope

- Definir el esquema de entrada (input) para la función de traducción en src/features/translation/schemas/translation.schema.ts
- Definir el esquema de salida (output) para la función de traducción en src/features/translation/schemas/translation.schema.ts
- Alinear los esquemas con los tipos existentes en src/features/translation/types/translation.types.ts
- Utilizar Zod para la validación de esquemas

### Out of Scope

- Implementar la lógica de traducción en sí
- Modificar los componentes UI relacionados con la traducción
- Cambiar la persistencia en Supabase
- Alterar el flujo de onboarding existente

## Approach

Revisar los modelos existentes de perfiles (tanto del onboarding como persistidos), definir esquemas Zod que capturen exactamente qué datos se necesitan como entrada y qué se produce como salida, y asegurar que los esquemas estén tipados correctamente para uso en TypeScript. El enfoque se basará en el examen de los tipos actuales y los flujos de datos para crear contratos precisos y reutilizables.

## Affected Areas

| Area                                                   | Impact     | Description                                                             |
| ------------------------------------------------------ | ---------- | ----------------------------------------------------------------------- |
| src/features/translation/schemas/translation.schema.ts | Modified   | Definición de esquemas de entrada y salida para la traducción           |
| src/features/translation/types/translation.types.ts    | Referenced | Tipos existentes que serán utilizados como referencia para los esquemas |

## Risks

| Risk                                            | Likelihood | Mitigation                                                          |
| ----------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| Desalineación entre esquemas y tipos existentes | Medium     | Revisar cuidadosamente los tipos existentes y mantener consistencia |
| Esquemas demasiado restrictivos o permisivos    | Low        | Iterar con retroalimentación del equipo y pruebas unitarias         |

## Rollback Plan

Dado que solo se está definiendo un contrato (esquema) y no se está modificando lógica de negocio existente, el rollback consistiría en revertir los cambios al archivo translation.schema.ts a su estado anterior (vacío).

## Dependencies

- Ninguna dependencia externa adicional más allá de las ya existentes en el proyecto (Zod, TypeScript)

## Success Criteria

- [ ] Los esquemas de entrada y salida están definidos en translation.schema.ts
- [ ] Los esquemas utilizan Zod para validación
- [ ] Los esquemas están alineados con los tipos existentes en translation.types.ts
- [ ] Los esquemas pueden ser importados y utilizados sin errores de TypeScript
