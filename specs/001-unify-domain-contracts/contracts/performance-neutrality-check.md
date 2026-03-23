# Performance Neutrality Check - 001-unify-domain-contracts

## Objetivo

Validar que el cierre de la iniciativa de contratos unificados no introduzca regresiones de performance en quality gates del repo.

## Baseline

- Entorno: `/home/svens/dev/brujula-civil`.
- Runner: misma maquina/sesion local, sin `pnpm build`.
- Comandos medidos con `/usr/bin/time` antes del bloque documental final (`quickstart/tasks/performance-check`).

| Gate             | Baseline real (s) | Baseline user (s) | Baseline sys (s) | Baseline maxrss (KB) |
| ---------------- | ----------------: | ----------------: | ---------------: | -------------------: |
| `pnpm lint`      |             40.36 |             25.59 |             9.25 |               623900 |
| `pnpm typecheck` |             16.83 |              9.74 |             4.26 |               301012 |
| `pnpm test:run`  |             40.61 |             46.00 |            24.91 |               142636 |

## Metodo

1. Ejecutar baseline de `lint`, `typecheck` y `test:run` con medicion de tiempo/uso de recursos.
2. Aplicar SOLO cambios documentales de cierre (`specs/001-unify-domain-contracts/**`).
3. Repetir exactamente los mismos comandos con la misma medicion.
4. Comparar variacion relativa de `real` y validar neutralidad bajo criterio operativo de no regresion.

## Resultados observados (post-adopcion)

| Gate             | Post real (s) | Delta real (s) | Delta real (%) | Post maxrss (KB) |
| ---------------- | ------------: | -------------: | -------------: | ---------------: |
| `pnpm lint`      |         34.60 |          -5.76 |        -14.27% |           573212 |
| `pnpm typecheck` |         16.26 |          -0.57 |         -3.39% |           303000 |
| `pnpm test:run`  |         36.25 |          -4.36 |        -10.74% |           151064 |

## Conclusión

- No se detecta regresion de performance en los quality gates medidos.
- La variacion observada es favorable y consistente con ruido normal de ejecucion local.
- Con el alcance aplicado (sin cambios funcionales adicionales en este bloque final), la iniciativa se considera PERFORMANCE-NEUTRAL para cierre tecnico.
