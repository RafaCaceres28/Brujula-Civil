# 007.5f: datos de contacto

## Fuente y alcance

- `/datos-contacto` lee y edita solo `app_user_profiles` del usuario autenticado.
- `display_name` conserva su significado existente de nombre de la persona. Se reutiliza, no se duplica.
- La migracion `20261101195347_contact_details.sql` agrega exclusivamente `phone`, `contact_email` y `locality_province`: `text NULL`, sin defaults, backfill, indices ni cambios de RLS.
- `contact_email` es el email profesional declarado, nunca el email de acceso. No hay fallback a `email`, Auth ni metadatos.
- La ausencia de fila es editable. La creacion incluye solo `user_id` y los campos cambiados; no ejecuta bootstrap, wizard ni crea perfiles militares/civiles.
- Los campos son opcionales. Los valores editados se recortan y el vaciado explicito guarda `NULL`. Los valores existentes no editados se conservan literalmente.
- El borrador de CV consulta estos cuatro campos por separado del historial confirmado. Un error de contacto no oculta la experiencia ni las competencias, y no se presenta como ausencia de datos.

## Concurrencia y limites

El guardado compara los cuatro valores originales con `eq` o `is null`, filtrando por la clave primaria `user_id` obtenida de la sesion. Solo escribe campos cambiados y confirma exito si recibe exactamente una fila valida. Cero filas o un insert concurrente con clave duplicada producen `CONFLICT`; el formulario conserva el borrador y pide recargar para revisar. No hay autosave, almacenamiento paralelo ni sobrescritura forzada.

Esta proteccion NO es una garantia global frente a escritores legacy. El bootstrap existente solo inserta si falta la fila, sin sobrescribir nombres existentes. El mapper de `saveProfile` omite las tres columnas nuevas y comparte `display_name`: un cambio legacy anterior al guardado invalida la baseline del editor, pero un escritor legacy posterior puede volver a cambiar el nombre sin este CAS. No se modifica ese flujo en 007.5f.

## Verificacion local

Antes de aplicar, comparar `supabase/migrations` con `pnpm exec supabase migration list --local` y con `supabase_migrations.schema_migrations`. Solo ejecutar `pnpm exec supabase migration up --local` cuando la unica pendiente sea esta migracion. No usar reset, push ni destino remoto.

Pruebas reales, con Supabase LOCAL iniciado:

```bash
CONTACT_DETAILS_LOCAL_TEST=1 pnpm exec vitest run src/features/profile/server/contact-details.local.test.ts
pnpm verify
```

La suite local no lee `.env.local`: obtiene credenciales del CLI local y rechaza cualquier URL distinta de `http://127.0.0.1:54321`. Crea dos usuarios sinteticos y los elimina al terminar; prueba schema/ledger, persistencia entre clientes, CAS concurrente, clears, preservacion de datos ajenos y RLS de lectura/insercion/actualizacion. Su ejecucion requiere opt-in; la suite ordinaria no depende de Docker. No se ejecuta build.
