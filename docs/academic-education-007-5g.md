# Formacion academica 007.5g

## Contrato

- `/formacion` permite anadir, editar y eliminar estudios declarados por el usuario autenticado.
- Cada entrada tiene `id` estable, `title`, `institution` nullable, `year` nullable y `status` explicito (`completed` o `in_progress`). No se infieren titulaciones, equivalencias ni verificaciones documentales.
- Nombre y centro admiten 200 caracteres; el nombre es obligatorio. El ano es un entero de cuatro cifras (1000 a 9999), sin reglas dependientes de la fecha actual. No hay un limite arbitrario de estudios.
- El selector comienza sin indicar; ese valor no es persistible. Los estudios en curso muestran `En curso` y, solo si se indica ano, `Finalizacion prevista: YYYY`.
- `academic_education_jsonb = NULL` significa ausencia; `[]` es una coleccion vaciada explicitamente. Las lecturas nunca escriben ni sustituyen datos corruptos por una coleccion vacia.

## Persistencia

Migracion `20261101211847_academic_education.sql`: una columna JSONB nullable, sin default ni backfill. Se aplico exclusivamente al stack Supabase local existente. No se cambiaron las cuatro politicas RLS.

El servicio lee solamente la base canonica del usuario, valida la integridad y compara el baseline canonico recibido. La escritura CAS filtra por `user_id` (clave primaria) y por el JSON original leido, no por su version normalizada. Solo actualiza la columna academica; exige exactamente una fila devuelta. Si no existe perfil inserta unicamente `user_id` y la coleccion, sin copiar email, nombre o datos de otros sistemas. Una colision de insercion devuelve `CONFLICT`.

Este CAS detecta cambios desde el baseline, no historial de versiones: una secuencia A-B-A no se distingue de A. No se anade infraestructura de versionado. Los errores y conflictos conservan el formulario; no hay sobrescritura forzada.

`/cv-borrador` lee esta misma fuente de forma independiente de contactos e historial. No usa datos de wizard, traducciones ni fuentes legacy para completar estudios.

## Verificacion Local

```sh
ACADEMIC_EDUCATION_LOCAL_TEST=1 CONTACT_DETAILS_LOCAL_TEST=1 pnpm run verify
```

Las pruebas locales obtienen credenciales en memoria desde `supabase status`, rechazan cualquier API distinta de `http://127.0.0.1:54321` y crean solo usuarios sinteticos. Cubren CRUD, nueva sesion autenticada, CAS con barrera de lectura entre clientes, colision con contactos, RLS de propietario/otro usuario/anonimo, integridad y limpieza de los fixtures. Las credenciales administrativas solo gestionan el ciclo de vida de los usuarios sinteticos y las comprobaciones acotadas de sus filas.

Las pruebas de formulario son jsdom y las paginas se renderizan en servidor. No sustituyen una comprobacion de navegador real ni verifican cookies HTTP de Next.js. No se ejecuta build.
