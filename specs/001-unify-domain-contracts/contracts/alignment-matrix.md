# Contract Alignment Matrix - Profile -> Translation -> CV -> PDF

## Scope

Validar alineacion contractual del vertical slice `profile -> translation -> preview CV -> PDF` sin reestructuracion global y con compatibilidad incremental.

## Matrix

| Step          | Input Contract                 | Output Contract       | Consumer Boundary         | Adapter                                                               | Validation Owner                                                     | Contract Tests                                                                          |
| ------------- | ------------------------------ | --------------------- | ------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Profile       | `ProfileReadOutputSchemaInput` | `ProfileSnapshot`     | Translation service input | `mapProfileToTranslationSnapshot`                                     | `profileReadOutputSchema` + `profileSnapshotSchema`                  | `profile-translation-cv-pdf.contract.test.ts`                                           |
| Translation   | `TranslationInput`             | `TranslationOutput`   | CV preview service input  | `mapTranslationOutputToCvInput`                                       | `translationInputSchema` + `translationOutputSchema`                 | `profile-translation-cv-pdf.contract.test.ts`, `cv-contract-compatibility.test.ts`      |
| CV Preview    | `CvPreviewInput`               | `CvPreviewModel`      | PDF generation input      | `parseEditableCvPreviewBoundary` + `mapCvPreviewToPdfGenerationInput` | `cvPreviewInputSchema` + `cvPreviewOutputSchema` + UI boundary parse | `cv-editability.contract.test.ts`, `cv-contract-compatibility.test.ts`, `page.test.tsx` |
| Documents/PDF | `PdfGenerationInput`           | `PdfGenerationOutput` | Documents queue/storage   | `generatePdfFromCvPreview`                                            | `pdfGenerationInputSchema` + `pdfGenerationOutputSchema`             | `profile-translation-cv-pdf.contract.test.ts`                                           |

## Error Alignment

| Boundary               | Failure Type                  | Error Code                       | Validation/Test Anchor                                                                             |
| ---------------------- | ----------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Preview UI editability | Blank/invalid section payload | `VALIDATION_ERROR`               | `parseEditableCvPreviewBoundary`, `cv-editability.contract.test.ts`, `cross-domain-errors.test.ts` |
| CV generation          | Missing translated blocks     | `VALIDATION_ERROR`               | `generateCv`, `cross-domain-errors.test.ts`                                                        |
| CV -> PDF adapter      | Invalid mapped input shape    | `INTERNAL_ERROR` (safe fallback) | `generatePdfFromCvPreview`, `cross-domain-errors.test.ts`                                          |

## Coverage Status (Sub-block 3 / Phase C)

- UI/editability: Cubierto por `page.tsx`, `page.test.tsx`, `cv.types.ts`, `cv.mapper.ts`.
- Slice adapters + traceability: Cubierto por `profile.mapper.ts`, `cv.mapper.ts`, `generate-pdf.ts` y este documento.
- Contract/integration tests: Cubierto por los 5 tests de contrato definidos para este subbloque.
