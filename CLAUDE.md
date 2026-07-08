# CLAUDE.md — Reglas no negociables del proyecto prestadora-original Salud

> Este archivo se lee primero, en cada sesión, antes de escribir una sola línea de código.
> Fuente: `prestadora-original_PROMPT_MAESTRO_v1.md` Partes A, E y F (documento original del proyecto,
> no se repite acá su desarrollo — esto es la versión operativa lista para ejecutar).

## Qué es esto

prestadora-original Salud: plataforma de cuidado domiciliario de adultos mayores (CABA/GBA, Argentina).
Conecta familias con Asistentes Integrales verificados. Modelo que empieza como empresa
directa y evoluciona hacia marketplace + B2B. Es la única división en desarrollo (de 6
planificadas en prestadora-original Group).

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
| El Filtro prestadora-original (uso interno únicamente — nunca en el sitio público, salvo que el usuario lo apruebe explícitamente como marketing) | mencionarlo en el sitio público bajo cualquier nombre |
| Proceso de Incorporación de Asistentes (uso interno, Panel) | Filtro prestadora-original dentro del Panel, "pipeline" |
| Certificado prestadora-original | certificado genérico, diploma |
| Reporte diario | informe, planilla, parte |
| Coordinador | supervisor, jefe, encargado |
| Vínculo / Cese | contrato de trabajo, despido (salvo causal literal de despido) |
| Inversor | nombre propio del socio potencial (no confirmado) |
| Superadmin | rol técnico, login propio, distinto de Admin — no confundir ni fusionar con Admin en código ni en UI |

Esto aplica a nombres de variables, tablas, componentes y claves de i18n, no solo a texto visible.

**Nota (corregida 2026-07-08):** "El Filtro prestadora-original" y, en general, el concepto de
proceso de selección/verificación de Asistentes son de **uso interno únicamente**. No se
menciona en el sitio público — ni con ese nombre ni con un nombre genérico inventado
("proceso de selección de personal", "verificación", etc.) — salvo que el usuario decida
explícitamente en el futuro usarlo como herramienta de marketing. Dentro del Panel (uso
interno, Coordinador/Admin) la pantalla que avanza al Postulante por las etapas de
verificación se llama "Proceso de Incorporación de Asistentes" — no usar "Filtro prestadora-original" ahí.
Corrección aplicada el mismo día: se sacó del sitio público (`sitio-web`) el nav link, la
sección de la home y la página dedicada `/el-filtro` que mencionaban "El Filtro prestadora-original".

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
