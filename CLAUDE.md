# CLAUDE.md — Reglas no negociables del proyecto prestadora-original Salud

> Este archivo se lee primero, en cada sesión, antes de escribir una sola línea de código.
> Fuente: `prestadora-original_PROMPT_MAESTRO_v1.md` Partes A, E y F (documento original del proyecto,
> no se repite acá su desarrollo — esto es la versión operativa lista para ejecutar).

## Qué es esto

prestadora-original Salud: plataforma de cuidado domiciliario de adultos mayores (CABA/GBA, Argentina).
Conecta familias con Asistentes Integrales verificados. Modelo que combina, **DESDE EL
MINUTO 1**, empresa directa Y marketplace + B2B — no son etapas secuenciales, conviven en
paralelo desde el lanzamiento. Es la única división en desarrollo (de 6 planificadas en
prestadora-original Group).

**Cambio de estructura societaria (2026-07-09):** el software deja de ser propiedad de
prestadora-original Salud. Pasa a haber dos empresas: **PLM Systems** es la dueña del software y lo
licencia como producto SaaS — no solo a prestadora-original, sino potencialmente a cualquier prestadora
de cuidado domiciliario, dentro y fuera de Argentina. **prestadora-original** sigue con su negocio de
cuidado domiciliario (directo + marketplace) y, además, le vende a otras prestadoras un
servicio B2B de auditoría/certificación apoyado en la tecnología que le licencia a PLM,
pagando como cualquier otro cliente. Consecuencia técnica: el sistema tiene que evolucionar
de mono-tenant (una sola organización, prestadora-original) a **multi-tenant real**, donde cada
prestadora licenciataria — incluida la propia prestadora-original — es un cliente aislado. El plan
técnico completo de esa migración está en `docs/Prompt_Claude_Code_PLM_Multitenant.md`.
**Estado actual: solo documentado, nada de esto está implementado en código todavía** — el
sistema sigue siendo mono-tenant (prestadora-original) en producción; el multi-tenant es la próxima
etapa grande a acometer, empezando por el inventario/plan que pide ese documento, no por
código directo. Ver también `docs/CONTEXT.md` y `docs/BUILD_ORDER.md`.

Mientras tanto: "prestadora-original Salud" sigue siendo la marca correcta en todo lo que describe el
negocio de cuidado domiciliario en sí (nav, login, footer-brand, PDFs de RRHH). Solo la
titularidad/copyright del software cambia a PLM Systems — ver el glosario abajo.

## El riesgo legal que condiciona el diseño (leer antes de tocar cualquier flujo de Asistente)

Los Asistentes son monotributistas independientes, no empleados. El art. 23 LCT presume
relación de dependencia y el caso Cabify (2021) es precedente desfavorable para plataformas
que asignan y controlan. Por eso:

- La app de Asistentes **nunca** penaliza el rechazo de una guardia (sin ranking, sin badges,
  sin restricciones futuras por rechazos) — es indicio de subordinación.
- El sistema **nunca** impone horario fijo unilateral sin margen de negociación del Asistente.
- El lenguaje de la interfaz evita términos de relación laboral — ver glosario abajo.
- Todo módulo que calcule costos o indemnizaciones soporta **ambos** vínculos
  (`monotributo` | `dependencia`) sin asumir que el modelo actual es permanente
  — ver `docs/PRD_02B_Gestion_Personal.md`.

Esto no es una preferencia de estilo. Es mitigación de riesgo legal documentada.

**Nota explícita (para que no se reintroduzca en otra sesión):** al analizar patrones de
otros ERPs (GlamourOS/salones de belleza) se evaluó sumar gamificación de empleados
(niveles novato/experto/master/leyenda, retos, puntos por servicio) a la PWA Asistentes.
**Se descarta explícitamente** — un sistema de niveles/rankings sobre Asistentes es
exactamente el tipo de indicio de subordinación que el punto anterior prohíbe. No
reproponer sin resolver primero el riesgo legal de fondo.

## Glosario obligatorio — en código, en UI, en commits

| Usar siempre | Nunca decir |
|---|---|
| Asistente Integral | cuidador/a, empleado/a, trabajador/a |
| Familia | cliente, usuario |
| Paciente | adulto mayor (salvo contexto clínico específico) |
| Guardia | turno, jornada, servicio |
| Proceso de Incorporación de Asistentes (uso interno — Panel y cualquier mención interna general del concepto; nunca en el sitio público, salvo que el usuario lo apruebe explícitamente como marketing) | "Filtro prestadora-original" (término retirado 2026-07-10, ver nota abajo — no usar ni siquiera internamente), "pipeline", mencionarlo en el sitio público bajo cualquier nombre |
| Certificado de Aptitud | certificado genérico, diploma, "Certificado prestadora-original" (nombre anterior, retirado 2026-07-13 por decisión explícita del Desarrollador — certifica aptitud para una tarea determinada, uso mayormente interno de la prestadora) |
| Reporte diario | informe, planilla, parte |
| Coordinador | supervisor, jefe, encargado |
| Vínculo / Cese | contrato de trabajo, despido (salvo causal literal de despido) |
| Inversor | nombre propio del socio potencial (no confirmado) |
| Superadmin | rol técnico, login propio, distinto de Admin — no confundir ni fusionar con Admin en código ni en UI |
| PLM Systems | dueña/licenciante del software — usar solo para titularidad/copyright del software, nunca como marca del negocio de cuidado domiciliario |
| Prestadora | empresa licenciataria del software (prestadora-original es la primera) — en el modelo de datos futuro, "organización"/tenant. No confundir con "Familia" ni con "Asistente" |
| Admin_prestadora (rol técnico, `usuarios.rol`) | rol de gestión acotado a la propia prestadora, cero visibilidad de otras — es el rol `admin` renombrado en el marco multi-tenant (`docs/PLAN_MULTITENANT_PLM.md` 4.1). Rename de dato + reescritura de las ~28 policies RLS que dependían del valor, ejecutados juntos en el Bloque 2 de `docs/Prompt_Claude_Code_Kickoff_Implementacion.md` (`backend/src/db/schema_multitenant_02.sql`, aplicado 2026-07-09/10) — el valor `admin` ya no existe en el dato ni en el código de autorización, no queda ningún caso de transición pendiente |
| Desarrollador (en la documentación, para referirse a quien dirige el desarrollo y aprueba las decisiones que Claude Code le eleva) | "Alberto"/"Inversor" como estand-in genérico de esa persona — no es un rol del sistema (ver `Admin`/`Superadmin` en `docs/SECURITY.md`), ni tiene relación con la fila "Inversor" de esta misma tabla (que sí es un hecho societario real, ver `docs/prestadora-original_Fundacional_v3.pdf`) |
| Cumplimiento normativo (documental, por prestadora) | compliance — término de negocio nuevo detectado sin aprobación previa en `docs/PLAN_MULTITENANT_PLM.md` (barrido 2026-07-10) y corregido; entidad futura `cumplimiento_normativo_prestadora`, todavía sin implementar en código |
| Ausente sin relevo previo | cualquier término en inglés o genérico para este caso — un Asistente que no se presenta a una guardia cuando no había ningún Asistente de prestadora-original cubriendo antes que él (ej. primera guardia del día para un Paciente). Distinto de un "ausente" con relevo: acá no hay nadie "saliente" atrapado esperando, el Paciente puede quedar completamente solo — es el escenario de mayor riesgo del protocolo de continuidad de guardia. En el esquema técnico, `incidentes_relevo.guardia_saliente_id` queda `NULL` en este caso (`backend/src/db/schema_modulo6_guardias.sql`) |

Esto aplica a nombres de variables, tablas, componentes y claves de i18n, no solo a texto visible.

**Verificación activa, no solo lista de referencia:** el glosario se filtró más de una vez
(términos en inglés colados sin que nadie lo chequeara). A partir de ahora:
- Antes de usar cualquier término de negocio nuevo en texto visible (UI, `docs/`,
  comentarios de código, mensajes de commit), confirmarlo contra este glosario. Si no está,
  no inventarlo ni usarlo todavía — proponer el término en español al Desarrollador para que
  lo apruebe, y recién ahí agregarlo como entrada nueva.
- Al cerrar cualquier tarea que haya tocado texto visible, sumar un chequeo puntual: ¿algún
  término nuevo usado hoy no está en el glosario? Si es así, la tarea no está terminada hasta
  resolverlo.

**Nota (corregida 2026-07-08, término retirado del todo 2026-07-10):** el concepto de
proceso de selección/verificación de Asistentes es de **uso interno únicamente**. No se
menciona en el sitio público — ni con nombre propio ni con un nombre genérico inventado
("proceso de selección de personal", "verificación", etc.) — salvo que el usuario decida
explícitamente en el futuro usarlo como herramienta de marketing. El nombre correcto, en
cualquier contexto interno (Panel, documentación, comentarios de código, commits) es
**"Proceso de Incorporación de Asistentes"** — el nombre anterior ("El Filtro prestadora-original") se
retiró por completo el 2026-07-10 por decisión explícita del Desarrollador: no correspondía
usarlo ni siquiera internamente, no solo en el Panel. Se reemplazó en todos los documentos
del proyecto (ver `docs/PROGRESS.md`); si aparece en algún lugar nuevo, es un término
obsoleto que hay que corregir, no reintroducir. Corrección de sitio público aplicada el
2026-07-08: se sacó del sitio público (`sitio-web`) el nav link, la sección de la home y la
página dedicada `/el-filtro`.

## Las 11 reglas no negociables

1. **Nunca hardcodear**: texto visible (usar objeto `T` de i18n), precios, honorarios,
   valores legales (cargas sociales, topes, % de indemnización — siempre desde
   `escalas_legales`), ni datos de contacto.
2. **Multiidioma desde el día uno** — cada clave nueva se agrega simultáneamente en
   `es-AR`, `en`, `pt-BR`.
3. **Todo componente que carga datos maneja 4 estados**: loading / error / vacío / listo.
4. **Toda operación destructiva** (rechazar Asistente, cancelar guardia, confirmar cese,
   borrar una escala legal vigente) requiere confirmación explícita.
5. **Todo botón que dispara una operación se deshabilita mientras está en curso** —
   nunca doble envío.
6. **CSS solo con las variables del sistema** (`docs/DESIGN_SYSTEM.md`) — nunca inventar
   colores o tipografías fuera de la paleta.
7. **Nunca loguear ni exponer en URLs/GET** datos sensibles: sueldos, causales de cese,
   certificados médicos, antecedentes penales, datos de salud del paciente.
8. **RLS estricta en Supabase** en cada tabla nueva. Admin ve todo; Coordinador ve solo
   su zona; Asistente/Familia no ven nada de `escalas_legales` ni datos laborales internos.
9. **Git**: commit y push después de cada conjunto de cambios coherente, mensaje descriptivo
   en español, formato `tipo: descripción breve`. Nunca subir `.env` ni datos reales de
   pacientes/Asistentes/familias.
10. **Nunca calcular indemnizaciones o montos legales con números escritos en el código** —
    siempre consultar `escalas_legales` vigente a la fecha del hecho (no la fecha actual),
    según el motor descripto en `docs/PRD_02B_Gestion_Personal.md`.
11. **Todo lo que se construye (sitio público, Panel, futuras PWA) debe funcionar en
    cualquier sistema operativo y cualquier navegador** (Windows/macOS/Linux/Android/iOS ×
    Chrome/Firefox/Safari/Edge). No asumir un solo navegador o plataforma al elegir una
    solución técnica. Caso concreto ya resuelto (2026-07-08): el traductor automático de
    Chrome retraducía el Panel de vuelta al español apenas cambiabas de idioma con el
    selector propio — se agregó `<meta name="google" content="notranslate">` +
    `translate="no"` en `panel/index.html` para que ningún navegador basado en Chromium
    fuerce su propia traducción sobre el i18n del sistema. Aplicar el mismo criterio
    (no depender de que un navegador/SO específico se comporte "bien") a cualquier feature
    nueva — geolocalización, notificaciones push, cámara/GPS de la futura PWA de Asistentes,
    etc.

## Protocolo de sesión

Al iniciar cualquier sesión de trabajo en este repo:

1. Leer `CLAUDE.md` (este archivo).
2. Leer `docs/CONTEXT.md`.
3. Leer `docs/PROGRESS.md`.
4. Leer el PRD de la etapa en la que se va a trabajar hoy (ver `docs/BUILD_ORDER.md`).
5. Si la etapa toca el Panel de Administración o el plantel de Asistentes, leer también
   `docs/PRD_02B_Gestion_Personal.md` completo.
6. Confirmar con una línea: *"Leí los documentos correspondientes. Etapa actual: [X].
   Última tarea completada: [Y]. Tarea de esta sesión: [Z]."*
7. Mostrar el plan de la tarea y esperar aprobación antes de escribir código.
8. Al terminar, actualizar `docs/PROGRESS.md`.

## Sobre `docs/Prompt_Claude_Code_PLM_Multitenant.md`

Es el prompt que define la dirección de arquitectura para el cambio societario descripto
arriba (PLM Systems como dueña/licenciante del software, multi-tenant real por prestadora).
**A diferencia de "Prompt de Money Suite.md" (ver abajo), este sí es vinculante** — refleja
una decisión de negocio ya tomada, no un documento de referencia genérico. Pero su propio
texto pide explícitamente no escribir código todavía: primero un inventario de qué partes
del código asumen hoy "una sola organización" (prestadora-original), y una propuesta de plan de
migración y diseño de la entidad `prestadoras` — recién después de discutir y aprobar eso
se empieza a tocar código de producción. No arrancar la implementación de multi-tenancy sin
ese paso previo ni sin confirmación explícita del usuario de que se está entrando a esa
etapa.

## Sobre "Prompt de Money Suite.md"

En la raíz del proyecto (fuera de `Workspace/`) existe un documento llamado
`Prompt de Money Suite.md`. **No es vinculante.** Es un PRD genérico de un marketplace
internacional de cuidado (niños + adultos mayores + mascotas simultáneamente), con precios,
paleta de colores, personas y alcance de negocio que **contradicen** las decisiones ya
tomadas para prestadora-original Salud (lanzamiento por división única, precio $114.000, paleta
azul/verde/naranja/rojo, marco legal argentino específico). No usar su contenido de negocio.
Algunos de sus patrones **técnicos** (convenciones de schema, estructura de seguridad,
taxonomía de eventos) sí se adoptaron donde no entraban en conflicto — están señalados
explícitamente en `docs/DATA_MODEL.md` y `docs/SECURITY.md` con la nota "(patrón adoptado de Money Suite)".
## REGLA 12 — Control estricto (no negociable, agregada 2026-07-10 por exigencia explícita del Desarrollador)

Estas cuatro reglas se aplican siempre, sin excepción, y van antes que cualquier otra
consideración de ritmo o autonomía del resto de este documento.

### 12.1 — Confirmación previa por característica, nunca por resumen

Cuando el Desarrollador pide algo con más de una característica (un panel, un flujo, un
módulo), antes de escribir una sola línea de código se entrega una lista — no un párrafo —
con una línea por cada característica mencionada en el pedido original, marcada:

- ✅ **Incluida tal cual se pidió**
- ⚠️ **Incluida con un cambio** — y cuál, y por qué, esperando aprobación antes de seguir
- ❌ **Excluida** — y el motivo exacto, esperando aprobación antes de seguir

Ninguna característica puede desaparecer adentro de una descripción general ("armé un panel
simple y funcional"). Si no está en la lista con su marca, no se avanza.

### 12.2 — Confirmación posterior, mismo formato, contra el pedido original

Al terminar, antes de decir "listo", se repite la misma lista — no una demo narrada, no un
"anda todo bien" — comparando explícitamente contra lo que se prometió en 12.1. Si algo
cambió en el camino, se marca y se explica, no se entrega en silencio.

### 12.3 — Toda afirmación sobre documentación cita archivo y línea

Nunca "según lo que dice el proyecto..." o "ya estaba resuelto en tal documento" sin decir
dónde exactamente. Siempre `archivo.md:línea` o `archivo.sql:línea`, verificable por el
Desarrollador en segundos sin tener que leer código ni entender el contexto — abre el
archivo, busca la línea, está o no está.

### 12.4 — Ningún pendiente se menciona una sola vez — lista maestra obligatoria

Todo lo que quede abierto (una tarea del usuario, una decisión pendiente, un secreto sin
cargar, una credencial sin rotar) se agrega a `docs/PENDIENTES.md` con nombre propio, fecha
de creación, y condición de cierre explícita — nunca queda solo mencionado en una entrada de
`PROGRESS.md` y de ahí en más a la buena de la memoria de la próxima sesión.

**Antes de que cualquier sesión declare una tarea cerrada**, se revisa `docs/PENDIENTES.md`
completo, línea por línea contra la lista — no de memoria. Si un ítem sigue abierto, se
reporta su estado actual (avanzó, sigue igual, se resolvió) en el mismo cierre de sesión, no
se lo deja pasar en silencio.

Motivo de esta regla, para que quede escrito: el `RAILWAY_TOKEN` pendiente de carga y la
credencial de Supabase expuesta sin rotar se mencionaron una sola vez cada una, en sesiones
distintas, y ninguna sesión posterior las volvió a chequear — no porque alguien decidiera que
no importaban, sino porque no había ningún mecanismo que obligara a que siguieran
apareciendo. Esta regla existe para que eso no se repita con ningún pendiente futuro.

### 12.5 — Nunca afirmar cobertura o certeza que no se verificó

"Leí todo", "cubrí lo más importante", "está resuelto", "no hay ningún caso más" — ninguna de
estas frases se puede decir sin haber hecho el chequeo real que la respalda en el momento en
que se dice, no antes. Si se leyó una parte de un archivo, se dice exactamente qué parte
(líneas, secciones) y que el resto queda sin revisar — nunca una frase que suene completa
sobre una revisión parcial. Si no se sabe algo, la respuesta es "no lo verifiqué" o "no tengo
esa información", no una respuesta con forma seria construida para sonar completa.

Este punto aplica igual a Claude Code y a cualquier otro modelo que trabaje en este proyecto,
incluido el que redacta este mismo documento cuando actúa como asesor del Desarrollador fuera
del repositorio. Sonar seguro no es lo mismo que estar en lo cierto, y frente a la duda, la
frase corta y honesta ("no lo sé", "no lo revisé") siempre gana sobre la frase larga y
completa que no se puede sostener si se la pone a prueba.

### 12.6 — Cruzar activamente contra lo ya decidido, no solo haberlo leído

Haber leído un documento no significa haberlo aplicado. Antes de presentar cualquier análisis,
diseño o recomendación nueva, enumerar explícitamente qué decisiones o hechos ya documentados
en `CLAUDE.md`/`PROGRESS.md`/los PRD son relevantes para lo que se está por decir, y confirmar
si la conclusión nueva es consistente con ellos — o señalar el conflicto si no lo es. No
alcanza con haber leído el documento una vez al empezar la sesión; hay que volver a él
activamente cada vez que el tema analizado lo toque, aunque ya se haya leído hace un rato.
Motivo: en esta misma conversación, un análisis de competencia trató el modelo marketplace de
prestadora-original como una fase futura y separada del modelo directo, cuando `CLAUDE.md` ya decía
explícitamente que los dos conviven en paralelo — el dato estaba leído, fresco, y no se cruzó
contra el análisis nuevo hasta que el Desarrollador lo señaló. No fue un dato perdido; fue un
dato ignorado en el momento de usarlo.

## REGLA 13 — Despliegue y aplicación de schema (no negociable, agregada 2026-07-13 tras repetirse un bug ya documentado)

### 13.1 — Vercel no tiene auto-deploy: correr `vercel --prod` es parte de terminar la tarea, no un paso opcional

Si la sesión modificó código de `panel/` (o `sitio-web/`, mismo mecanismo), la tarea **no**
está terminada solo con el commit/push a GitHub — hay que correr `vercel --prod` desde el
directorio correspondiente antes de reportar el cambio como desplegado o probarlo en
producción. Este gap ya estaba documentado en `docs/PROGRESS.md:433-434` y aun así causó una
sesión entera de debugging el 2026-07-13 (pendientes #17/#21 de `docs/PENDIENTES.md`) porque
estar escrito en un doc de referencia no bastó — tiene que ser un paso obligatorio del
protocolo de cierre de cualquier tarea que toque `panel/` o `sitio-web/`, no una nota que hay
que acordarse de ir a leer.

### 13.2 — Todo `.sql` que crea tablas nuevas contra Supabase termina con `NOTIFY pgrst, 'reload schema';`

Cuando se aplica un schema nuevo directamente contra Supabase (no vía su UI de migraciones),
el último paso del mismo procedimiento — no uno separado, ni "si hace falta" — es correr
`NOTIFY pgrst, 'reload schema';` en el SQL Editor. Sin este paso, PostgREST puede devolver 404
en tablas que sí existen, como pasó el 2026-07-13 con `alertas_tempranas_guardia`/
`configuracion_ausencia_automatica` (pendiente #21 de `docs/PENDIENTES.md`).