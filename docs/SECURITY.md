# SECURITY.md — Autenticación, autorización y datos sensibles

> Fuente principal: `prestadora-original_DOCUMENTO_UNICO_v1.md` Parte L (Arquitectura Web) y Parte O
> (RLS policies). Donde se indica, se adoptan patrones de `Prompt de Money Suite.md`
> (no vinculante) porque son buenas prácticas concretas que no contradicen ninguna
> decisión de negocio ya tomada — la plataforma usa Supabase Auth, no un esquema JWT propio,
> así que solo se toman las partes de Money Suite que son configuración de Supabase o
> política independiente del proveedor.

## Autenticación por etapa

- **Etapa 2 (Panel Admin):** Supabase Auth, email + password, **sin** magic link (decisión
  oficial — el panel es de uso interno, no beneficia la fricción-cero del magic link).
- **Etapas 3-4 (PWA Asistentes / Familias):** Supabase Auth, magic link o email/password.

Supabase Auth ya maneja la emisión, rotación y revocación de tokens JWT — **no construir
un esquema propio de access/refresh tokens**. El detalle de "Access Token 15 min + Refresh
Token 30 días con rotación" que aparece en `Prompt de Money Suite.md` sección 13.1 describe
cómo se construiría un auth desde cero; no aplica acá porque Supabase ya lo resuelve. Se
menciona para dejar constancia de que fue evaluado y descartado por redundante, no por
error.

## Política de contraseñas (patrón adoptado de Money Suite, configurable en Supabase Auth)

- Longitud mínima: 10 caracteres.
- Al menos 1 mayúscula, 1 número, 1 carácter especial.
- Rate limit: 5 intentos fallidos → bloqueo temporal (usar la config nativa de rate
  limiting de Supabase Auth, no reimplementar).

Esto es una recomendación de configuración para cuando se dé de alta el proyecto de
Supabase — no requiere código propio.

## Portabilidad de datos — no depender de un solo proveedor (decisión 2026-07-07)

Supabase es la base de datos elegida para todo el roadmap (ver `CONTEXT.md`), pero el
proyecto **no debe construirse de forma que dejarlo sea riesgoso o traumático**. Reglas
para mantener esa salida siempre abierta:

- **Toda la lógica de negocio vive en el backend Node/Express propio**, nunca en Supabase
  Edge Functions ni en triggers/funciones de Postgres con lógica de negocio compleja. Si
  cambia el proveedor de base de datos, el backend cambia una connection string, no su
  código.
- **RLS se escribe en SQL estándar de Postgres**, sin depender de helpers propietarios de
  Supabase más allá de `auth.uid()` (que tiene equivalente directo en cualquier Postgres
  con su propio esquema de usuarios).
- **Backup propio, independiente del backup nativo de Supabase**: un `pg_dump` periódico
  de la base (automatizable con un cron simple en el propio backend o una GitHub Action)
  guardado fuera de Supabase, en almacenamiento de objetos (bucket — Google Cloud Storage,
  AWS S3, Backblaze B2 o similar). Esto protege contra el peor caso (cuenta bloqueada, error
  de facturación, borrado accidental del proyecto) sin depender de que el proveedor mismo
  resuelva su propia falla. **Git/GitHub queda descartado como destino, no en evaluación**
  (decisión 2026-07-10): guarda historial permanente que no se puede purgar sin reescribir
  todo el repo, es una segunda copia de datos sensibles sin ninguna protección de RLS/tenant,
  y tiene límite de tamaño de archivo (100MB) que un dump de base va a superar con el tiempo.
- Storage: si se sube a Supabase Storage, evitar features no estándar que no tengan
  equivalente en cualquier storage S3-compatible.

Ninguna de estas reglas frena el desarrollo actual — son restricciones de diseño, no
trabajo extra significativo. El backup propio es la única tarea pendiente concreta, a
implementar antes de que haya datos reales de pacientes/Asistentes/familias en producción
(no es urgente mientras solo haya datos de prueba).

## RBAC — roles del sistema

Los 5 roles reales del proyecto (nota histórica: Money Suite usaba genéricos
`super_admin`/`operations_manager` sin correspondencia en ningún PRD de prestadora-original en ese
momento — desde el 2026-07-07 sí existe un `superadmin` real, pero es una decisión propia
de prestadora-original, con alcance distinto, no el que traía Money Suite):

| Rol | Alcance |
|---|---|
| `superadmin` | Todo lo de `admin_prestadora`, en todas las prestadoras: configuración profunda del sistema, alta/baja de elementos sensibles, uso de herramientas de IA para diagnóstico/corrección de errores. Login propio, separado del de `admin_prestadora` |
| `admin_prestadora` | Todo el negocio de su propia prestadora (sin el acceso técnico de `superadmin`, cero visibilidad de otras prestadoras) |
| `coordinador` | Su zona asignada (familias, pacientes, guardias, Asistentes de esa zona), dentro de su propia prestadora |
| `asistente` | Sus propias guardias, su perfil, su certificado |
| `familia` | Sus pacientes, reportes y alertas de sus pacientes |

**Nota (2026-07-10):** el rol se llamaba `admin` hasta el Bloque 2 de
`docs/PLAN_MULTITENANT_PLM.md` — se renombró a `admin_prestadora` en dato y código (sin
transición pendiente, no queda ningún registro ni ruta con el valor `admin`) al pasar a
multi-tenant real, para reflejar que su alcance quedó acotado a una sola prestadora. Ver
glosario de `CLAUDE.md`.

`superadmin` es el único rol, además de `admin_prestadora`, con acceso de escritura a
configuración de sistema (planes/módulos activables, si se construye esa idea de
`PRD_02_Panel_Admin.md` Módulo 8) y a cualquier herramienta de diagnóstico asistido por IA
que se construya sobre logs/errores de la aplicación — no exponer esas herramientas a
`admin_prestadora` ni a `coordinador`.

## Multi-tenancy — `current_tenant()` y `es_superadmin()` (Bloque 2, aplicado y verificado)

Toda policy de RLS escrita desde el Bloque 2 en adelante usa estas dos funciones SQL en vez
de repetir el `EXISTS (SELECT ... FROM usuarios WHERE id = auth.uid() ...)` a mano:

```sql
CREATE FUNCTION current_tenant() RETURNS UUID
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT prestadora_id FROM usuarios WHERE id = auth.uid();
$$;

CREATE FUNCTION es_superadmin() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol = 'superadmin' FROM usuarios WHERE id = auth.uid();
$$;
```

Toda tabla con `prestadora_id` debe filtrar por `prestadora_id = current_tenant() OR
es_superadmin()` en sus policies — nunca solo por rol, sin el filtro de tenant, salvo que la
tabla sea intencionalmente global (ej. `escalas_legales`, que no tiene `prestadora_id`).

## RLS — políticas obligatorias

Cada tabla nueva necesita RLS antes de mergear el PR que la crea. Ejemplos oficiales
(actualizados 2026-07-10 al patrón multi-tenant — toda policy nueva debe filtrar por
`current_tenant()`, no solo por rol):

```sql
-- Asistentes solo ven sus propias guardias (dentro de su tenant)
CREATE POLICY "asistente_ve_sus_guardias" ON guardias
  FOR SELECT USING (asistente_id = auth.uid() AND prestadora_id = current_tenant());

-- Familias solo ven los reportes de sus pacientes
CREATE POLICY "familia_ve_sus_reportes" ON reportes
  FOR SELECT USING (
    guardia_id IN (
      SELECT id FROM guardias WHERE paciente_id IN (
        SELECT id FROM pacientes WHERE familia_id = auth.uid()
      )
    )
  );

-- Admin_prestadora y coordinadores ven todo en su ámbito, acotado a su propia prestadora
CREATE POLICY "admin_prestadora_ve_todo" ON guardias
  FOR ALL USING (
    prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin_prestadora','coordinador'))
    OR es_superadmin()
  );
```

**Patrón OR-de-dos-EXISTS para FK nullable (ejemplo oficial, `incidentes_relevo`, Módulo 6):**
cuando una tabla tiene una FK opcional que cambia de qué fila derivar el tenant/zona según
esté NULL o no (acá, `guardia_saliente_id` NULL = "Ausente sin relevo previo", ver glosario
de `CLAUDE.md`), la policy resuelve ambos casos con dos `EXISTS` unidos por `OR`, en vez de
intentar una sola condición que cubra los dos:

```sql
CREATE POLICY "coordinador_ve_incidentes_de_su_zona" ON incidentes_relevo
  FOR SELECT USING (
    prestadora_id = current_tenant() AND (
      -- Caso con relevo previo: derivar la zona desde la guardia saliente
      EXISTS (
        SELECT 1 FROM guardias g
        JOIN asistentes a ON a.id = g.asistente_id
        WHERE g.id = incidentes_relevo.guardia_saliente_id
          AND a.zonas && (SELECT zonas FROM usuarios WHERE id = auth.uid())
      )
      OR
      -- Caso "ausente sin relevo previo" (guardia_saliente_id IS NULL): derivar la zona
      -- desde la guardia entrante en su lugar
      EXISTS (
        SELECT 1 FROM guardias g
        JOIN asistentes a ON a.id = g.asistente_id
        WHERE g.id = incidentes_relevo.guardia_entrante_id
          AND incidentes_relevo.guardia_saliente_id IS NULL
          AND a.zonas && (SELECT zonas FROM usuarios WHERE id = auth.uid())
      )
    )
  );
```

Tablas que **nunca** deben tener policy de lectura para `asistente` ni `familia`:
`escalas_legales`, `ceses`, `ausencias`, `guardias_cobertura` (regla 8 de `CLAUDE.md`).

Para `coordinador`, la policy de "su zona" debe filtrar por el campo `zonas` del
Coordinador contra la zona de la `familia`/`asistente` — no dar acceso total a
`coordinador` salvo en las tablas donde el PRD lo indica explícitamente.

**Estado real (actualizado 2026-07-09):** implementado y aplicado contra Supabase real
(`backend/src/db/schema_etapa2i.sql`) para las tablas donde existe una columna `zonas` real
o un join directo a `asistentes.zonas`: `asistentes` (lectura y edición),
`verificaciones_asistente`, `ausencias`, `guardias_cobertura`, `certificados` — vía
`usuarios.zonas && tabla.zonas` (operador de overlap de arrays) en policies separadas de
`admin_*` (sin filtro) y `coordinador_*_de_su_zona` (filtradas), que Postgres combina con OR
al ser ambas permisivas. **Pendiente, no resuelto**: `solicitudes`/`familias`/`pacientes`/
`prestaciones` no tienen zona modelada como código real (`solicitudes.localidad` es texto
libre sin FK a `zonas_cobertura`) — Coordinador sigue viendo todas las filas de estas 4
tablas, igual que Admin, hasta que exista una decisión de producto sobre cómo derivar la
zona de una Familia/Solicitud (agregar un `select` de zona al formulario público, inferir
por `localidad`, u otra opción). No adivinar esa semántica sin confirmarla primero.

**Módulo 6 (Guardias), estado 2026-07-10:** las 8 tablas de
`backend/src/db/schema_modulo6_guardias.sql` tienen RLS multi-tenant aplicada y verificada
contra Supabase real (15 policies, incluyendo el patrón OR-de-dos-EXISTS de
`incidentes_relevo` documentado arriba, verificado con datos reales para el caso
`guardia_saliente_id IS NULL`). Sigue sin existir ninguna ruta backend ni pantalla de Panel
que consuma estas tablas.

**Pendiente de decisión, no bloquea desarrollo:** `guardias_tracking_gps` guarda histórico de
posiciones GPS del Asistente durante una guardia activa — esto es un dato personal sensible
bajo Ley 25.326 (geolocalización de una persona física). Falta definir política de retención
(cuánto tiempo se conserva el histórico) y si se necesita un aviso/consentimiento explícito
al Asistente más allá del que ya cubre el vínculo contractual — no se ha tomado ninguna
decisión de producto sobre esto todavía.

## Datos sensibles — qué nunca se loguea ni va en URL/GET

- Sueldos, honorarios, montos de `ceses`.
- Causales de cese.
- Certificados médicos, antecedentes penales.
- Datos de salud del paciente (`patologias`, `medicacion_habitual`, contenido de `reportes`).
- Texto libre de reportes y salida de los prompts de IA (ver `AI_PROMPTS.md`).

Estos datos viajan solo en el body de requests autenticadas, nunca en query params, nunca
en logs de aplicación accesibles a todo el equipo.

## Cumplimiento normativo

- Ley 25.326 (Protección de Datos Personales, Argentina) aplica a todos los datos de
  salud y datos personales de pacientes, Asistentes y familias.
- No aplica GDPR salvo expansión internacional futura (no está en el roadmap actual).

## Verificación de antecedentes penales (etapa 3 del Proceso de Incorporación de Asistentes)

Hoy es un proceso manual/semi-manual (consulta al Registro Nacional de Reincidencia,
renovación anual) — no hay integración de API elegida. Si se automatiza, evaluar
proveedores regionales (Money Suite menciona Truora/Veriff/Idfy como referencia de mercado
para verificación de antecedentes + validación facial en LATAM) — decisión pendiente de
negocio y de presupuesto, no bloquea el desarrollo de las etapas 1-2.

## Decisiones de seguridad pendientes (no bloquean desarrollo, hay que saberlas)

- Proveedor de reconocimiento facial para la etapa de verificación de identidad del Proceso
  de Incorporación de Asistentes: no elegido.
- Si se automatiza la consulta de antecedentes penales: proveedor no elegido.
- Modelo de pagos (ver `CONTEXT.md` y `DATA_MODEL.md`): no hay decisión de negocio, por lo
  tanto tampoco hay decisión de seguridad de datos de pago (tokenización, PCI DSS scope).
  No construir nada de esto hasta que exista un PRD de pagos aprobado.
