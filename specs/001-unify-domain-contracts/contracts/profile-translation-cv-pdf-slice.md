# Vertical Slice Contract: Profile -> Translation -> CV Preview -> PDF

## Slice Goal

Establecer un flujo de referencia que demuestre interoperabilidad de contratos entre dominios sin requerir implementacion final completa.

## Step Contracts

1. **Profile Step**
   - Output: `ProfileSnapshot`
   - Guarantee: campos minimos para traduccion presentes y validados.

2. **Translation Step**
   - Input: `ProfileSnapshot`
   - Output: `TranslatedProfileContent`
   - Guarantee: trazabilidad por bloque hacia evidencia de origen.

3. **CV Preview Step**
   - Input: `TranslatedProfileContent`
   - Output: `CvPreviewModel`
   - Guarantee: estructura estable para render en componentes.

4. **PDF Step (Documents)**
   - Input: `CvPreviewModel`
   - Output: `PdfGenerationOutput`
   - Guarantee: referencia de documento y estado consistente.

## Integration Assertions

- La salida de cada paso satisface el schema de entrada del siguiente paso.
- Cada paso retorna `DomainResult` tipado.
- Cualquier error se expresa con `DomainErrorCode` compartido.

## Testing Hooks

- Fixtures tipados por paso.
- Escenarios minimos: happy path, validation error, dependency error.
- Ejecucion en `vitest --project node` para pruebas de contrato/integracion sin UI.
