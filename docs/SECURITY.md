# SECURITY.md — Autenticación, autorización y datos sensibles

> Fuente principal: `prestadora-original_DOCUMENTO_UNICO_v1.md` Parte L (Arquitectura Web) y Parte O
> (RLS policies). Donde se indica, se adoptan patrones de `Prompt de Money Suite.md`
> (no vinculante) porque son buenas prácticas concretas que no contradicen ninguna
> decisión de negocio ya tomada — prestadora-original usa Supabase Auth, no un esquema JWT propio, así
> que solo se toman las partes de Money Suite que son configuración de Supabase o política
> independiente del proveedor.

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
  guardado fuera de Supabase (ej. un bucket separado o descarga local cifrada). Esto
  protege contra el peor caso (cuenta bloqueada, error de facturación, borrado accidental
  del proyecto) sin depender de que el proveedor mismo resuelva su propia falla.
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
| `superadmin` | Todo lo de `admin`, más acceso técnico: configuración profunda del sistema, alta/baja de elementos sensibles, uso de herramientas de IA para diagnóstico/corrección de errores. Login propio, separado del de `admin` |
| `admin` | Todo el negocio (sin el acceso técnico de `superadmin`) |
| `coordinador` | Su zona asignada (familias, pacientes, guardias, Asistentes de esa zona) |
| `asistente` | Sus propias guardias, su perfil, su certificado |
| `familia` | Sus pacientes, reportes y alertas de sus pacientes |

`superadmin` es el único rol, además de `admin`, con acceso de escritura a configuración
de sistema (planes/módulos activables, si se construye esa idea de `PRD_02_Panel_Admin.md`
Módulo 8) y a cualquier herramienta de diagnóstico asistido por IA que se construya sobre
logs/errores de la aplicación — no exponer esas herramientas a `admin` ni a `coordinador`.

## RLS — políticas obligatorias

Cada tabla nueva necesita RLS antes de mergear el PR que la crea. Ejemplos oficiales:

```sql
-- Asistentes solo ven sus propias guardias
CREATE POLICY "asistente_ve_sus_guardias" ON guardias
  FOR SELECT USING (asistente_id = auth.uid());

-- Familias solo ven los reportes de sus pacientes
CREATE POLICY "familia_ve_sus_reportes" ON reportes
  FOR SELECT USING (
    guardia_id IN (
      SELECT id FROM guardias WHERE paciente_id IN (
        SELECT id FROM pacientes WHERE familia_id = auth.uid()
      )
    )
  );

-- Admins y coordinadores ven todo en su ámbito
CREATE POLICY "admin_ve_todo" ON guardias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin','coordinador'))
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

## Verificación de antecedentes penales (etapa 3 del Filtro prestadora-original)

Hoy es un proceso manual/semi-manual (consulta al Registro Nacional de Reincidencia,
renovación anual) — no hay integración de API elegida. Si se automatiza, evaluar
proveedores regionales (Money Suite menciona Truora/Veriff/Idfy como referencia de mercado
para verificación de antecedentes + validación facial en LATAM) — decisión pendiente de
negocio y de presupuesto, no bloquea el desarrollo de las etapas 1-2.

## Decisiones de seguridad pendientes (no bloquean desarrollo, hay que saberlas)

- Proveedor de reconocimiento facial para la etapa de verificación de identidad del Filtro
  prestadora-original: no elegido.
- Si se automatiza la consulta de antecedentes penales: proveedor no elegido.
- Modelo de pagos (ver `CONTEXT.md` y `DATA_MODEL.md`): no hay decisión de negocio, por lo
  tanto tampoco hay decisión de seguridad de datos de pago (tokenización, PCI DSS scope).
  No construir nada de esto hasta que exista un PRD de pagos aprobado.
