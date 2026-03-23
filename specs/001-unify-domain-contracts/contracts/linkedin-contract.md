# LinkedIn Domain Contract

## Input Contract

- `LinkedInSourceInput`
  - `userId: string`
  - `profileUrl?: string`
  - `rawProfilePayload?: unknown`

## Output Contract

- `LinkedInNormalizedProfile`
  - `headline: string | null`
  - `experience: LinkedInExperienceItem[]`
  - `education: LinkedInEducationItem[]`
  - `skills: string[]`

## Result Contract

- `DomainResult<LinkedInNormalizedProfile, DomainError>`

## Validation Notes

- Input parseado con Zod en frontera (`actions`/`api`).
- Normalizacion semantica en `services`.
- Mapeo a perfil reutilizable para translation/cv.

## Error Mapping

- Payload mal formado -> `VALIDATION_ERROR`
- Fuente inaccesible/autorizacion -> `FORBIDDEN` o `UNAUTHORIZED`
- Dependencia externa no disponible -> `EXTERNAL_DEPENDENCY_ERROR`
