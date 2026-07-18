# CLAUDE.md — Reglas no negociables del proyecto Aurevia / Xeitra

> Se lee primero, en cada sesión, antes de escribir una sola línea de código.
> Este archivo refleja siempre el estado **vigente** de las reglas — se actualiza solo cuando una regla cambia. El historial de cómo se llegó a cada regla vive en `docs/claude_history.md` (ver §10), no acá.

## 1. Qué es esto

**Xeitra** es la empresa tecnológica propietaria, desarrolladora y licenciante del software. Desarrolla productos SaaS propios, sin estar limitada a una industria específica.

**Aurevia** es el primer producto de Xeitra: una plataforma SaaS de gestión para empresas dedicadas al cuidado de personas. Aurevia **no presta servicios de cuidado** — es la tecnología que permite a las Prestadoras administrar sus operaciones, equipos y relaciones operativas.

Modelo de negocio:
- Xeitra desarrolla, mantiene y evoluciona la plataforma.
- Las Prestadoras la usan mediante licencia SaaS.
- Cada Prestadora opera en un entorno independiente, aislado del resto, desde el diseño inicial.
- Ninguna Prestadora tiene relación especial con Xeitra ni trato privilegiado en el código.

## 2. Arquitectura multi-tenant (regla fundamental del producto)

Aurevia es multi-tenant real desde el origen — no un sistema mono-empresa adaptado después. La entidad técnica que aísla datos es la **Organización** (una Organización = una Prestadora).

Toda funcionalidad nueva debe garantizar:
- aislamiento total de datos entre Organizaciones (aplicación **y** base de datos, nunca solo frontend);
- usuarios, configuración y operaciones separados por Organización;
- permisos evaluados siempre en el contexto de una Organización;
- cero accesos cruzados, ni siquiera accidentales;
- escalabilidad a cientos/miles de Prestadoras sin rediseño estructural.

**Pregunta de diseño obligatoria ante cualquier decisión técnica:** *"¿Esto funciona correctamente cuando existan cientos de Prestadoras usando Aurevia simultáneamente?"* — no "¿funciona para una empresa?".

**Configuración sobre programación:** una diferencia entre Prestadoras es una característica de negocio, no una excusa para código duplicado, versiones especiales o excepciones individuales. Se resuelve con configuración (parámetros, permisos, textos, reglas operativas).

### Sandbox
Organización ficticia reservada del sistema, solo para desarrollo, pruebas, validación y demos internas.
- No es una Prestadora comercial ni un cliente.
- Usa exactamente la misma arquitectura de seguridad, permisos y aislamiento que cualquier Prestadora real — **cero excepciones de código** (nunca `si organización = Sandbox entonces permitir excepción`).
- El nombre "Sandbox" queda reservado por el sistema; ninguna Prestadora real puede usarlo.

## 3. El riesgo legal en el módulo de Asistentes

**Alcance:** el marco legal aplicable a cada Prestadora depende de su jurisdicción. Este archivo no desarrolla el contenido legal — vive en documentos dedicados por país (ej. `docs/legal/argentina.md`). CLAUDE.md solo fija el principio de diseño y remite a esos documentos cuando haga falta precisión.

**Principio de diseño:** el software no impone ni bloquea funciones por razones legales — solo advierte cuando una configuración elegida por la Prestadora puede generar un riesgo legal conocido en su jurisdicción, según lo que registre el documento legal correspondiente.

Todas las funciones de gestión de Asistentes (penalización de inasistencias o inconductas, rankings, puntuaciones por aceptación de guardia y por calificación de Familia/Paciente, límite de oportunidades futuras por rechazos, niveles/categorías/jerarquías por servicio, horarios fijos, y cualquier otra que se agregue) están **disponibles sin restricción para toda Prestadora, en cualquier país, desde el día uno.**

Mecánica:
- al activar una función con riesgo legal conocido en la jurisdicción configurada de la Prestadora, se muestra una **advertencia** con el riesgo específico, tomada del documento legal de esa jurisdicción (ej. ver `docs/legal/argentina.md` para el riesgo de indicio de subordinación bajo art. 23 LCT);
- si la jurisdicción no tiene documento legal cargado, no se muestra advertencia — no se inventa una por analogía con otro país;
- la advertencia y su activación quedan auditadas (quién, cuándo, qué función, qué advertencia se mostró);
- ningún toggle arranca en un valor por decisión del sistema basada en lo legal — el default es una elección de configuración de la Prestadora.

**Fuente de las advertencias:** tabla configurable (jurisdicción → función → texto de advertencia), nunca hardcodeada — coherente con la Regla 1 (§7) y con §2.

**Condición antes de lanzar en un país nuevo:** antes de habilitar Aurevia para una Prestadora real de un país determinado, debe existir el documento legal de esa jurisdicción en `docs/legal/<país>.md` — aunque sea mínimo. No hace falta tenerlo completo, pero sí que exista como archivo antes de dar de alta la primera Prestadora real de ese país. Es una condición de proceso, no una validación técnica bloqueante del software.

**Autonomía del Asistente (modalidad marketplace):** disponible siempre, independiente de estos toggles — ver condiciones de la guardia ofrecida, decidir participación, gestionar disponibilidad, mantener independencia operativa.

**Cálculos legales/económicos:** todo módulo de costos o compensaciones soporta múltiples modalidades contractuales, nunca asume que el modelo actual es permanente. Cargas, porcentajes, topes y escalas siempre desde fuentes configurables por jurisdicción vigente — ver documento legal correspondiente —, nunca como constantes en código, y siempre a la fecha del hecho (no la fecha actual).

## 4. Glosario obligatorio

Aplica a código, nombres de variables/tablas/componentes, claves de i18n, texto visible, documentación y commits. Antes de usar un término de negocio nuevo: verificarlo contra esta tabla; si no está, proponerlo para aprobación antes de usarlo.

Esta tabla se mantiene siempre en su versión **vigente** — sin notas de fecha, sin términos retirados, sin historial de cambios. Cuando un término cambia o se retira, la entrada de esta tabla se reemplaza sin más, y el cambio (qué decía antes, qué dice ahora, por qué, cuándo) queda registrado en `docs/claude_history.md` (§10), no acá.

| Usar siempre | Nunca decir |
|---|---|
| Xeitra | nombres anteriores de la empresa; "software de Xeitra" al referirse al producto |
| Aurevia | — |
| Prestadora (sinónimo aceptado: "licenciataria", cuando el contexto es específicamente la relación de licenciamiento SaaS con Xeitra) | empresa cliente, organización comercial, empresa usuaria (fuera del sentido técnico del sistema) |
| Organización | entidad técnica multi-tenant — no confundir con "Prestadora" en texto de negocio |
| Sandbox | empresa cliente, Prestadora real, organización comercial |
| Asistente (cuidador/a, enfermero/a, etc.) | empleado/a, trabajador/a |
| Familia | cliente, usuario |
| Paciente | adulto mayor (salvo contexto clínico específico) |
| Guardia | turno, jornada, servicio |
| Coordinador | supervisor, jefe, encargado |
| Reporte diario | informe, planilla, parte |
| Vínculo / Cese | contrato de trabajo, despido (salvo causal literal de despido) |
| Proceso de Incorporación de Asistentes | selección, filtro, pipeline, reclutamiento |
| Certificado de Aptitud | certificado genérico, diploma, certificado propio de una Prestadora |
| Ausente sin relevo previo | cualquier término en inglés o genérico para el caso de un Asistente que no se presenta a una Guardia cuando no había ningún otro Asistente cubriendo antes de él (ej. primera guardia del día para un Paciente) — distinto de un ausente con relevo, donde sí hay alguien saliente esperando |
| Documentación (vencimientos documentales de Asistentes, por Prestadora) | compliance, cumplimiento normativo |
| Desarrollador (quien dirige el desarrollo y aprueba las decisiones elevadas) | nombre propio de esa persona como estand-in genérico; no es un rol del sistema (ver §5) |
| multi-tenant, SaaS, RLS, MFA, Sandbox | — (términos técnicos permitidos tal cual) |

**Verificación al cerrar cualquier tarea que tocó texto visible:** ¿se incorporó algún término nuevo no aprobado? Si sí, la tarea no está terminada hasta agregarlo al glosario o reemplazarlo.

## 5. Roles del sistema y control de acceso

Separación estricta entre roles técnicos, administrativos y operativos. Ningún rol obtiene acceso implícito por pertenecer a Xeitra. Principio de mínimo privilegio siempre: cada rol solo los permisos que su función requiere, nunca por comodidad de desarrollo.

**Superadmin** — rol técnico de Xeitra. Infraestructura, mantenimiento técnico, configuración global, soporte interno. No representa una Prestadora, no la opera comercialmente.
- **Restricción dura de acceso:** Superadmin tiene acceso de Panel **únicamente** a la Organización Sandbox. Vedado el acceso a datos de cualquier Prestadora real, sin excepción — ninguna tarea técnica lo justifica.
- Si una tarea técnica requiere operar sobre una Prestadora real, se hace mediante **Admin_plataforma** en modo dentro de una Prestadora (con su banner, auditoría y límites de sesión — ver más abajo), nunca mediante Superadmin.
- Login propio; MFA por TOTP disponible, activable/desactivable desde Configuración. Todo acceso queda auditado.

**Admin_plataforma** — rol técnico-administrativo de Aurevia (perspectiva Xeitra). Gestiona cuentas de Prestadoras, configuración administrativa de la plataforma, procesos comerciales del SaaS, soporte autorizado. Login propio, mismo MFA opcional que Superadmin.
- **Modo dentro de una Prestadora:** para operar dentro de una Organización específica — una Prestadora por vez, sin visibilidad de otras mientras está activo.
  - banner visible con la Prestadora activa;
  - advertencia adicional antes de operaciones destructivas;
  - log de auditoría de todo acceso y acción sensible;
  - timeout por inactividad: 5 min; tope absoluto de sesión: 60 min; aviso a los 50 min si sigue activa.

**Admin_prestadora** — administrador operativo, acotado exclusivamente a su propia Organización: usuarios internos, configuración operativa, roles, procesos y datos propios. Sin acceso a otras Prestadoras ni a configuración global del sistema.

**Regla de aislamiento (aplica a los tres roles y a cualquier consulta):** toda consulta/modificación/eliminación de datos valida explícitamente Organización + rol + permisos antes de ejecutarse. No existen consultas globales desde módulos operativos. Nunca asumir que una operación es válida solo por venir de una interfaz autorizada.

## 6. Seguridad, privacidad y auditoría

- **RLS estricta en toda tabla nueva de Supabase**, sin excepción — el aislamiento nunca depende solo del frontend.
- **Datos sensibles** (remuneraciones, causales de cese, certificados médicos, antecedentes, información clínica, credenciales) nunca en URLs, parámetros GET, logs ni mensajes públicos.
- **Auditoría** de toda acción sensible: login administrativo, cambios de permisos, eliminación de datos, modificaciones críticas, acciones en modo Prestadora. El registro debe permitir reconstruir quién, cuándo, sobre qué Organización, qué operación.
- **Operaciones destructivas**: confirmación explícita siempre (qué se hará, qué consecuencia tiene, opción de cancelar) + registro de auditoría +, cuando corresponda, reservorio/mecanismo de recuperación de lo eliminado.
- **Variables de entorno** para toda credencial/token/clave — nunca en código ni en el repositorio.
- **Ambientes de desarrollo**: nunca datos reales de Prestadoras/Familias/Pacientes/Asistentes en pruebas; usar Sandbox y datos ficticios.

**Regla final de seguridad:** un error de configuración nunca debe permitir que una Prestadora acceda a información de otra. Es una garantía esencial del producto, no un objetivo aspiracional.

## 7. Reglas no negociables de desarrollo

1. **Nunca hardcodear** texto visible, precios, honorarios, valores legales, reglas operativas ni datos de contacto — siempre desde configuración, base de datos o archivos de traducción.
2. **Multiidioma desde el día uno**: toda clave nueva se agrega simultáneamente en `es-AR`, `en`, `pt-BR`. No se construye una función en un solo idioma "para traducir después".
3. **Todo componente que carga datos maneja 4 estados**: loading / error / vacío / listo.
4. **Toda operación destructiva requiere confirmación explícita** (ver §6).
5. **Todo botón que dispara una operación se deshabilita mientras está en curso** — nunca doble envío.
6. **CSS/diseño visual solo con el sistema de diseño de Aurevia** — nunca colores, tipografías o estilos inventados fuera de la paleta.
7. **Nunca exponer información sensible** en logs, URLs o mensajes públicos (ver §6).
8. **RLS estricta** en cada tabla nueva, con Organización asociada cuando corresponda (ver §6).
9. **Git**: commit + push tras cada conjunto de cambios coherente. Mensajes en español, formato `tipo: descripción breve` (`feat:`, `fix:`, `docs:`, etc.). Nunca subir `.env`, credenciales ni datos reales.
10. **Cálculos legales/económicos siempre parametrizados** — nunca números escritos en código; siempre la escala vigente a la fecha del hecho (ver §3).
11. **Compatibilidad multiplataforma obligatoria**: Windows/macOS/Linux/Android/iOS × Chrome/Firefox/Safari/Edge. No asumir un único navegador o dispositivo (traducción automática del navegador, permisos de cámara, geolocalización, notificaciones, PWA).

**Checklist antes de cerrar cualquier tarea:** ¿se respetaron las 11 reglas? ¿se mantuvo el aislamiento multi-tenant? ¿términos del glosario aprobados? ¿sin datos hardcodeados? ¿4 estados cubiertos? ¿info sensible protegida? ¿documentación actualizada? Si alguna respuesta es no, la tarea no está terminada.

## 8. Despliegue e infraestructura

- **Vercel no tiene auto-deploy implícito**: un push a GitHub no es un despliegue. Si la tarea tocó una app desplegada (Panel, sitio público), el despliegue explícito es parte de terminar la tarea, no un paso opcional posterior.
- **Todo schema aplicado directamente contra Supabase termina con** `NOTIFY pgrst, 'reload schema';` — sin este paso PostgREST puede devolver 404 en tablas que sí existen.
- Toda tabla nueva: propósito documentado, relaciones definidas, restricciones, timestamps donde corresponda, políticas RLS, validación de seguridad — evaluada siempre contra el impacto multi-tenant, nunca aislada de esa pregunta.

## 9. Acceso restringido a documentación

Dentro de `docs/` pueden existir carpetas reservadas, identificables por su nombre — por ejemplo `Exclusivo <Prestadora>/` (contenido puramente particular de una Prestadora: identidad de marca, configuración de negocio específica, investigación de competencia, o cualquier otro material sin valor de arquitectura/código para el resto del sistema multi-tenant) y `Documentos Obsoletos/` (documentos de una etapa, diseño o decisión ya superada, conservados únicamente como archivo).

**Regla de acceso:** no se entra a ninguna carpeta de este tipo — no se lee, no se lista, no se referencia su contenido — salvo permiso u orden explícita del Desarrollador en la sesión puntual. No alcanza con que la tarea "roce" el tema; el permiso se pide cada vez, no se asume de una sesión a la siguiente. El resto de `docs/` (arquitectura, PRDs genéricos, seguridad, modelo de datos) se lee con normalidad.

Cualquier carpeta nueva que cumpla ese mismo criterio (particular de una sola Prestadora, o puramente histórica/superada) debe nombrarse siguiendo este mismo patrón y queda sujeta a esta misma regla.

*(No confundir `Documentos Obsoletos/` con `docs/claude_history.md` — ver §10: la carpeta guarda documentos completos de una etapa superada, de acceso restringido; `claude_history.md` es un archivo de lectura normal, sin restricción, que registra por qué cambió una regla de este mismo CLAUDE.md.)*

## 10. `docs/claude_history.md` — historial de decisiones

CLAUDE.md se actualiza únicamente cuando cambia una regla vigente, y queda siempre limpio: refleja el estado actual, sin narrar cómo se llegó a él.

Todo lo histórico vive aparte, en `docs/claude_history.md`:
- decisiones que cambiaron de rumbo (qué decía antes, qué dice ahora, motivo, fecha);
- términos de glosario retirados o renombrados, con su versión anterior;
- contradicciones detectadas entre reglas y cómo se resolvieron;
- notas tipo "no reintroducir X sin resolver Y primero" que necesitan sobrevivir entre sesiones aunque ya no formen parte de la regla vigente.

**Antes de proponer algo que suene a un tema ya debatido**, revisar `docs/claude_history.md` además de este archivo — leer solo CLAUDE.md no alcanza si el tema ya se resolvió en una dirección distinta en el pasado y la única razón que quedó registrada está en el historial, no en la regla vigente.

## 11. Antes de empezar un cambio grande de arquitectura

Hay cambios que no son una tarea más — tocan la base de todo el sistema. Ejemplos: sumar un país nuevo con reglas distintas, lanzar otro producto de Xeitra, o cambiar cómo se guardan los datos centrales (la estructura de Organización).

Para este tipo de cambios, el orden es siempre:

1. **Primero, un inventario.** Revisar qué partes del código de hoy asumen "las cosas como están ahora" (un solo país, un solo producto, etc.) y van a verse afectadas.
2. **Después, un plan.** Proponer cómo se va a hacer el cambio, mostrárselo al Desarrollador y esperar su aprobación.
3. **Recién ahí, tocar código de producción.**

No se salta directo al paso 3 aunque el cambio ya esté decidido de palabra — falta siempre el plan aprobado antes de escribir código.

## 12. Protocolo de sesión

**Al iniciar:**
1. Leer `CLAUDE.md` (este archivo).
2. Leer `docs/CONTEXT.md`, `docs/PROGRESS.md`, el PRD de la etapa actual (`docs/BUILD_ORDER.md`) y cualquier doc específico si la tarea toca Panel/Asistentes.
3. Confirmar con una línea: *"Leí los documentos correspondientes. Etapa actual: [X]. Última tarea completada: [Y]. Tarea de esta sesión: [Z]."*
4. Presentar plan (objetivo, archivos afectados, cambios previstos, riesgos, validaciones) y esperar aprobación antes de escribir código.

**Control de características** (pedidos con más de una funcionalidad): antes de programar, lista explícita por característica — ✅ incluida tal cual / ⚠️ incluida con cambio (y por qué) / ❌ excluida (y por qué). Nada puede desaparecer dentro de un resumen general. Al terminar, se repite la misma lista contra lo prometido, no una narración.

**Documentación verificable:** toda afirmación sobre una decisión ya tomada cita **archivo y línea exacta** (`archivo.md:línea`), verificable en segundos sin tener que leer todo el archivo ni entender el contexto — nunca "según el proyecto..." o "ya estaba resuelto" sin decir exactamente dónde.

**Pendientes:** todo lo que quede abierto va a `docs/PENDIENTES.md` con nombre, fecha de creación y condición de cierre. Antes de cerrar cualquier tarea, se revisa esa lista completa — no de memoria — y se informa el estado de lo relacionado.

**Principio de certeza:** nunca afirmar "está revisado/resuelto/no hay problemas" sin haber hecho la comprobación en el momento. Si no se verificó, decirlo así, no disimularlo con una respuesta que suene completa.

**Revisión cruzada:** antes de una propuesta nueva, señalar explícitamente qué decisiones ya documentadas (arquitectura multi-tenant, SaaS, seguridad, glosario, reglas de negocio) son relevantes y si la conclusión nueva es consistente con ellas o entra en conflicto. Incluye revisar `docs/claude_history.md` cuando el tema ya haya sido debatido antes (ver §10).

**Cierre de sesión:** código y documentación actualizados, pendientes registrados, commit + push si hubo cambios de código, compatibilidad con las reglas no negociables verificada — no asumida.
