# PRD_06 — WhatsApp Business (Meta) + agente de IA asistiendo

> ✅ **ESTADO (actualizado 2026-07-14): implementado, desplegado y probado.** Este documento
> registró el diseño acordado el 2026-07-11 con varios puntos centrales abiertos; el
> 2026-07-13 el Desarrollador cerró los cinco puntos pendientes (A-E, ver sección de abajo) y
> dio el kickoff de implementación el mismo día. El código (backend + Panel) se construyó,
> se aplicó y verificó contra Supabase real, se desplegó (Railway + `vercel --prod`) y se
> probó en navegador real contra el Panel desplegado (proyecto Vercel renombrado desde
> entonces a `aurevia-panel`). Ver pendiente #9 de
> `docs/PENDIENTES.md` (🟢 Resuelto 2026-07-13), que tiene el detalle completo de la
> implementación y de lo explícitamente diferido (envío real a Asistentes y endurecimiento
> del webhook para producción, a probar con una prestadora real con cuenta Meta activa).

## Por qué existe este documento

Cierra (cuando se apruebe) el pendiente #9: "proveedor de WhatsApp Business API, o decisión
explícita de posponer la mensajería automática". La decisión de fondo ya tomada es **no usar
un intermediario/BSP (Twilio, 360dialog, MessageBird)** — se integra directo contra la **Meta
Cloud API de WhatsApp Business**, con un agente de IA ayudando en el proceso. Comparación de
proveedores considerada y descartada: ver el intercambio del 2026-07-11 (no repetido acá,
consultar el historial de la conversación si hace falta el detalle de precios/tradeoffs).

## Decisiones ya tomadas (no rediscutir sin motivo nuevo)

1. **Integración directa con Meta Cloud API**, no con un BSP intermediario.
2. **El número de WhatsApp Business y la cuenta de Meta deben ser de cada prestadora
   licenciataria, nunca de Xeitra como plataforma central.** Dos motivos,
   ambos explícitos del Desarrollador (2026-07-11):
   - Operativo: quien manda y recibe respuestas tiene que ser la propia prestadora, no un
     número compartido entre licenciatarias.
   - Legal: cualquier decisión tomada en esa conversación (con un suplente, un franquero, un
     familiar) es responsabilidad exclusiva de la prestadora — **Xeitra no debe tener
     ninguna responsabilidad legal sobre el contenido de esas conversaciones**, consistente
     con su rol de licenciante de software, no de operador del servicio de cuidado.
   - Consecuencia técnica directa: credenciales de Meta (WABA ID, phone number ID, token de
     acceso) son un dato **por-`prestadora_id`**, nunca una credencial compartida a nivel de
     plataforma — mismo patrón multi-tenant que el resto del sistema, pero con una capa extra
     de cuidado por tratarse de credenciales de una cuenta externa de terceros con costo real
     asociado (Regla 7/8 de `CLAUDE.md` aplican con el mismo peso que a datos sensibles).
   - **Costo del envío de mensajes lo paga la prestadora**, no Xeitra como
     plataforma — cada licenciataria factura directo con Meta desde su propia cuenta.
3. **La configuración vive dentro de la pestaña "Servicios" del Módulo 8 (Configuración),
   extendiendo la tabla/pestaña "Notificaciones" ya existente** (patrón evento → canal →
   destinatarios que ya usa `configuracion_notificaciones` para email) — no una sección nueva
   separada. Cada prestadora define, por evento, si además de (o en vez de) email quiere
   WhatsApp saliente.
4. **El agente de IA asiste, pero la decisión final siempre queda en manos del
   licenciatario** — no actúa de forma autónoma en un canal con peso legal. El Desarrollador
   pidió expresamente (2026-07-11) que el agente ayude en las tres tareas siguientes,
   "salvaguardando siempre las decisiones del licenciatario/prestador de servicios":
   - Redactar/proponer el texto de las plantillas de mensaje.
   - Gestionar (o guiar paso a paso) el trámite de aprobación de esas plantillas ante Meta.
   - Participar en las respuestas de conversaciones entrantes (del suplente, franquero,
     personal de emergencia, familiar) — siempre con el licenciatario en control de qué se
     manda finalmente.

## Puntos A-E — decididos 2026-07-13

Los cinco puntos que mantenían este documento "en discusión" ya tienen decisión explícita
del Desarrollador. Se conserva el planteo original de cada uno (para contexto) seguido de
la **decisión tomada**.

### A. Restricción de Meta sobre plantillas pre-aprobadas

Meta exige que cualquier mensaje que **inicia el negocio** (no una respuesta dentro de las
24hs de que la otra persona escribió primero) use una plantilla pre-aprobada por Meta — no
texto 100% libre generado en el momento. Un mensaje de escalada de relevo es, casi siempre,
un mensaje que inicia el negocio (nadie del lado del suplente/franquero escribió primero).

**Decisión (2026-07-13):**
- La IA arma el borrador de la plantilla (texto + variables); el licenciatario lo revisa/
  edita y confirma; recién ahí se envía a Meta para aprobación. Estado visible en el Panel
  (pestaña Servicios → Notificaciones) por plantilla: Borrador → Enviada a Meta → Aprobada /
  Rechazada. Si Meta rechaza, la IA propone una corrección según el motivo del rechazo.
- **Si un evento todavía no tiene ninguna plantilla aprobada, el aviso se manda por el canal
  que sí está disponible (email, `enviarEmailCoordinador`) y la responsabilidad de tomar
  acción pasa al Coordinador — el sistema y la IA tienen la responsabilidad de garantizar
  que ese aviso efectivamente le llegue** (nunca queda silenciosamente sin canal ni sin
  avisar a nadie mientras se espera la aprobación de Meta).
- Variables de cada plantilla (nombre del Asistente ausente, Paciente, horario, nivel de
  escalada) se mapean a los parámetros que Meta permite dentro de una plantilla aprobada —
  detalle de implementación, no bloquea el diseño.

### B. Alcance exacto y límites de autonomía del agente de IA

El Desarrollador pidió las tres tareas (redacción, trámite de aprobación, participación en
respuestas entrantes) "y cualquier otra en la que pueda colaborar" — alcance deliberadamente
abierto, pero eso es justamente lo que había que acotar antes de construir algo.

**Decisión (2026-07-13):** ningún mensaje entrante puede quedar sin respuesta. El Coordinador
siempre ve lo que la IA respondió (registrado en el sistema, no oculto). Para situaciones
comunes la IA puede actuar de forma automática — pero cuáles cuentan como "comunes" es
**configurable por prestadora, caso por caso**, no una lista fija igual para todas. Cuando la
IA no tiene una respuesta clara, avisa de inmediato al Coordinador en vez de decidir "no sé"
en silencio o dejar el mensaje sin atender. Motor de IA: mismo proveedor que Niveles 1-2
(Anthropic/Claude, `docs/CONTEXT.md:158`) salvo que la implementación encuentre un motivo
técnico concreto para otra cosa.

### C. Almacenamiento de credenciales de Meta por prestadora

Token de acceso, WABA ID y phone number ID de cada prestadora son credenciales de una cuenta
externa con costo real y capacidad de enviar mensajes en su nombre — de sensibilidad
comparable a una clave de API de pago.

**Decisión (2026-07-13): Supabase Vault** (el mecanismo de secretos cifrados ya integrado en
Supabase, en vez de una tabla propia con cifrado manual o un servicio externo nuevo) — un
secreto de Vault por prestadora. El Panel nunca muestra el valor real una vez guardado (solo
"configurado ✓" / botón "reemplazar", como un campo de contraseña). Solo el backend puede
pedir el valor descifrado, y solo en el momento de mandar un mensaje — **ni siquiera
`superadmin` puede leerlo en texto plano desde el Panel**, mismo criterio que sueldos/
certificados médicos (Regla 7 de `CLAUDE.md`). Acceso para cargar/reemplazar el secreto
acotado a `admin_prestadora` de esa prestadora únicamente.

### D. Catálogo inicial de eventos con WhatsApp saliente

Hoy el único evento con lógica de negocio real que podría disparar un mensaje es la escalada
de relevo (`configuracion_escalada_relevo`) — y la lógica de escalada en sí (Parte 2 de
Módulo 6) todavía no está construida, solo el CRUD de configuración (pendiente #8, ya
resuelto).

**Decisión (2026-07-13):** el catálogo inicial arranca con **dos** eventos, no solo uno:
escalada de relevo, y **vencimientos de documentación** (hoy solo-email vía
`revisarVencimientos`/`backend/src/utils/vencimientos.js`) — el Desarrollador confirmó que
este segundo caso también es importante desde esta primera vuelta.

### E. Insistencia si el Coordinador no responde a la notificación de una alerta temprana/incidente

Requerimiento planteado por el Desarrollador el 2026-07-13, todavía sin diseño: hoy ni el
"Registrar aviso previo" (alertas tempranas, pendiente #20) ni la detección automática de
ausencia notifican a nadie — solo quedan visibles en la pantalla de Continuidad del Panel, a
la espera de que el Coordinador la esté mirando (ver hallazgo del pendiente #21). Cuando se
resuelva el canal de notificación (email ya disponible vía `enviarEmailCoordinador`,
`backend/src/utils/email.js`, mismo patrón que `revisarVencimientos`; WhatsApp sujeto a este
documento), el Coordinador tiene que recibir un reintento/insistencia si no responde a la
primera notificación, con estas condiciones explícitas del Desarrollador:

- **El intervalo de reintento es configurable por prestadora** — nunca un número fijo en el
  código (Regla 1 de `CLAUDE.md`), consistente con el resto de `configuracion_escalada_relevo`.
- **El intervalo no es constante: se acorta a medida que se reduce el tiempo que falta para
  que la guardia quede sin Asistente cubriendo.** Es decir, la urgencia de la insistencia
  aumenta cuanto más cerca está el momento en que el Paciente queda sin cobertura, no es un
  simple "cada X minutos" parejo durante todo el proceso.

**Estructura en dos fases, aclarada por el Desarrollador el 2026-07-13** (esto resuelve la
pregunta de diseño que había quedado abierta sobre si esto reutiliza o no
`configuracion_escalada_relevo` — son dos fases secuenciales, no el mismo mecanismo):

1. **Fase de notificación/reacción humana:** se avisa al Coordinador (con la insistencia de
   intervalo variable descripta arriba) y se le da la oportunidad de resolver él mismo.
2. **Fase automática, opcional por prestadora:** si pasa el tiempo configurado y el
   Coordinador no reaccionó, **y solo si la prestadora activó esta opción**, recién ahí
   entran solas las fases ya previstas en `configuracion_escalada_relevo` (Suplente →
   Franquero → Personal de emergencia → Familiar). Si la prestadora no activó la
   automatización, el sistema no toma ninguna acción por su cuenta — queda todo en manos del
   Coordinador.

**Coordinador alternativo (backup), requerimiento agregado el 2026-07-13:** cada prestadora
tiene que poder configurar, opcionalmente, un segundo Coordinador al que se le empiecen a
mandar las notificaciones si el primero no respondió dentro del plazo configurado — antes de
(o en paralelo a) que entre la fase automática del punto 2.

**Decisión sobre el orden (2026-07-13):** el orden exacto entre "insistirle más al
Coordinador 1", "pasar al Coordinador 2" y "entrar en fase automática" **depende de la
premura de la situación** (cuánto tiempo falta para que el Paciente quede sin cobertura), y
ese criterio de premura es a su vez **configurable por prestadora** — no un orden fijo igual
para todas. Detalle de implementación pendiente: cómo se traduce "premura" en un número
concreto de minutos/umbrales configurables (mismo patrón que el intervalo de reintento
descripto arriba), a definir junto con el diseño de la tabla de configuración.

**¿Es útil la IA en esta fase?** Pregunta que hizo el Desarrollador el 2026-07-13 — recomendación
de Claude Code, no una decisión tomada:
- **Sí, para redactar el contenido de la notificación con contexto útil** (no solo "hay un
  problema", sino algo como "Guardia de [Paciente] sin cobertura en 40 min, sin Asistente
  saliente, este Asistente ya avisó por temas de salud dos veces este mes") — esto ya estaba
  cubierto por el punto 4 de este documento (el agente redacta/propone texto).
- **Sí, más adelante, para sugerir el mejor suplente disponible** en la fase automática en vez
  de seguir siempre el orden fijo de prioridad — pero esto depende de tener datos históricos
  suficientes, por eso ya figura como diferido en `docs/BUILD_ORDER.md` ("IA Niveles 3-5 —
  matching").
- **No, para decidir si/cuándo pasar de una fase a la otra** (Coordinador 1 → Coordinador 2 →
  fase automática) — esto tiene que seguir siendo una regla determinística por tiempo, igual
  que ya hace `backend/src/utils/ausenciaAutomatica.js`, no un juicio de un modelo de IA: hay
  un Paciente que puede quedar solo de por medio, y cualquier reclamo futuro necesita poder
  explicarse con una regla clara de tiempo, no con "el modelo decidió esto en el momento".

## Qué NO se decide en este documento

- No se diseña la tabla de datos definitiva ni las rutas de backend — eso es trabajo de
  implementación, que todavía necesita el kickoff explícito del Desarrollador (ver nota de
  estado al inicio del documento), no autorizado solo por haber cerrado los puntos A-E.
- No se estima costo ni estimación de tiempo — depende directamente de qué tan grande termine
  siendo el alcance real de la implementación una vez que arranque.
- No se define todavía el número concreto de minutos/umbrales de "premura" del punto E — el
  criterio (que depende de la premura y es configurable por prestadora) ya está decidido, el
  número/mecanismo exacto es detalle de implementación.

## Cómo se relaciona con el resto del proyecto

- Pendiente #9 (`docs/PENDIENTES.md`) — remite acá para su cierre.
- Pestaña "Servicios" del Módulo 8, ya construida (pendiente #8, resuelto) — este documento
  extiende la pestaña "Notificaciones" del mismo módulo, no crea una pestaña nueva.
- `docs/PRD_02_Panel_Admin.md:91-94` (Continuidad de guardia, Parte 2 de Módulo 6) — el caso
  de uso principal que dispara el primer evento de WhatsApp saliente.
- Pendiente #16 (`docs/PENDIENTES.md`) — auditoría de qué otras políticas deberían
  parametrizarse por prestadora; este documento es un ejemplo puntual de ese mismo principio
  aplicado a un canal de mensajería.
- Memoria de sesión `project_ia_oportunidades` y `feedback_tres_relaciones_distintas` — este
  caso vive en la relación "Asistente durante el trabajo" (punto 2 de esa nota), no en
  reclutamiento ni en la relación con Familias — las reglas de riesgo legal de `CLAUDE.md`
  sobre subordinación aplican con todo su peso acá.
