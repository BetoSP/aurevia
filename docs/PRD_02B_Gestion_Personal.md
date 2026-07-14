# PRD_02B — Gestión de Personal (Vínculo, Cese, Riesgo, Cobertura)

> Fuente: `prestadora-original_PRD_Gestion_Personal_v1.md` (documento completo, 431 líneas).
> Este PRD **extiende el Módulo 4 (Plantel de Asistentes) de `PRD_02_Panel_Admin.md`,
> no es un módulo separado** — vive en la misma navegación, mismo rol de acceso
> (Admin_prestadora; Coordinador solo lectura de su zona, sin acceso a montos — ver
> `SECURITY.md`).

## Por qué existe este módulo

prestadora-original convive con dos formas de vínculo con sus Asistentes: monotributo (mayoría hoy) y
relación de dependencia (Casas Particulares, Ley 26.844 / CCT 743/16). El riesgo legal real
no es teórico: el precedente Cabify-CABA (recalificación de "colaboradores autónomos" como
empleados en relación de dependencia) es la referencia de riesgo. Este módulo existe para que
el sistema calcule costos y ceses de forma **auditable y versionada**, nunca a mano ni con
números hardcodeados — ver regla 10 de `CLAUDE.md`.

## Alcance funcional

| # | Función |
|---|---|
| 1 | Registrar tipo de vínculo por Asistente (monotributo / dependencia) |
| 2 | Motor de cálculo de cese (`calcularCese`) — 13 causales |
| 3 | Simulador de Vínculo (costo comparado monotributo vs. dependencia, sin ejecutar cese) |
| 4 | Score de riesgo de reclasificación (0-100) |
| 5 | Gestión de ausencias (enfermedad/accidente inculpable, licencias) |
| 6 | Guardias de cobertura (reemplazo temporal por ausencia) |
| 7 | Generador de documentación (liquidaciones, telegramas, certificados) |
| 8 | Tabla versionada de valores legales (`escalas_legales`) |
| 9 | Notificaciones de vencimientos de documentación (catálogo configurable por prestadora — ver `docs/PENDIENTES.md` #18 punto 1) |

## Glosario nuevo (sumar al de `CLAUDE.md`)

| Término | Definición |
|---|---|
| Vínculo | La relación contractual vigente entre la prestadora/la familia y el Asistente (monotributo o dependencia) |
| Cese | Fin del vínculo, con una causal específica y (cuando aplica) un cálculo de liquidación |
| Causal de cese | Una de las 13 razones tipificadas de fin de vínculo — ver enum `causal_cese` en `DATA_MODEL.md` |
| Escala legal | Un valor normativo versionado (tope indemnizatorio, valor hora CCT, etc.), nunca hardcodeado |
| Score de riesgo | Indicador 0-100 de probabilidad de que un vínculo monotributo sea recalificado como dependencia |
| Guardia de cobertura | Guardia cubierta por un Asistente sustituto mientras el titular está de baja |

## Modelo de datos

Ver `DATA_MODEL.md` sección "Gestión de Personal" — tablas `asistentes` (columnas
extendidas: `tipo_vinculo`, `categoria_cct`, `fecha_alta`, `fecha_baja`, `causal_baja`,
`valor_hora`, `sueldo_basico`, `horas_semanales`, `score_riesgo_reclasificacion`),
`escalas_legales`, `ausencias`, `guardias_cobertura`, `ceses`. Esas tablas ya están escritas
ahí con el SQL exacto — no reproducir aquí para evitar que las dos fuentes diverjan.

Los vencimientos de documentación del Asistente (Monotributo, ART, Seguro, Certificado de
Antecedentes Penales u otros que agregue cada prestadora) ya no viven como columnas de
`asistentes` — pasaron a las tablas `tipos_documento_asistente`/`documentos_asistente` (ver
`DATA_MODEL.md`, pendiente #18 punto 1 de `docs/PENDIENTES.md`), configurables por prestadora
sin límite de cantidad.

Regla que más se rompe (repetida a propósito): toda lectura de `escalas_legales` filtra por
`vigencia_desde <= fecha_del_hecho AND (vigencia_hasta IS NULL OR vigencia_hasta >=
fecha_del_hecho)` — la fecha del hecho que se está calculando, **nunca** la fecha actual del
sistema.

## Motor de cálculo de cese

Función pura y testeable, sin efectos secundarios de UI ni de red — debe poder testearse con
un array de fixtures de `escalas_legales` congelado:

```
calcularCese({
  asistente,          // fila de asistentes: fecha_alta, tipo_vinculo, sueldo_basico, valor_hora, horas_semanales
  fechaCese,          // fecha del hecho — clave para toda lectura de escalas_legales
  causal,             // uno de los 13 valores de causal_cese
  escalasLegales       // valores ya resueltos para fechaCese (no se consulta la DB dentro de la función)
}) => {
  montoTotal: number | null,   // null si la causal requiere cálculo manual del abogado
  detalleCalculo: object,      // desglose línea por línea, para mostrar en UI y persistir en detalle_calculo
  advertencias: string[],      // ej: "Antigüedad menor a 3 meses, verificar período de prueba"
  requiereRevisionAbogado: boolean
}
```

Esta misma función la usan dos pantallas distintas: la pantalla de Cese (Módulo 4 extendido)
y el Simulador de Vínculo (sección siguiente) — **no reimplementar la lógica dos veces**.

### Las 13 causales y su tratamiento

| Causal | Tratamiento |
|---|---|
| `renuncia` | Sin indemnización. Preaviso según antigüedad (tabla `escalas_legales` tipo `preaviso_dias`) |
| `mutuo_acuerdo` | Monto a definir por acuerdo — el sistema no calcula un monto fijo, solo registra |
| `despido_con_justa_causa` | Sin indemnización, pero requiere `revisado_por_abogado = true` obligatorio antes de cerrar el registro |
| `despido_sin_causa` | Indemnización completa: antigüedad + preaviso + integración mes despido, con tope art. 245 vía `escalas_legales` |
| `abandono_de_trabajo` | Similar a justa causa — requiere revisión de abogado |
| `muerte_del_trabajador` | Indemnización reducida a favor de derechohabientes — cálculo especial, marcar `requiereRevisionAbogado: true` |
| `muerte_del_empleador` | Indemnización reducida — solo aplica si el empleador es la familia directamente (dependencia), no si es la prestadora |
| `muerte_persona_cuidada` | Causal específica del sector — tratamiento similar a fuerza mayor, **no calcula automático**, deriva a abogado |
| `periodo_de_prueba` | Sin indemnización si está dentro del período de prueba vigente (`escalas_legales` define la duración) |
| `incapacidad_absoluta` | **No calcula automático** — fuera de alcance (ver sección "Fuera de alcance"), `montoTotal: null` |
| `jubilacion` | **No calcula automático** — fuera de alcance, `montoTotal: null` |
| `despido_por_embarazo_o_matrimonio` | Indemnización agravada — multiplicador sobre la base de `despido_sin_causa`, definido en `escalas_legales` |
| `fin_contrato_comercial` | Solo aplica a monotributistas cuyo vínculo es comercial, no laboral — **no calcula automático**, `montoTotal: null`, es el caso donde la prestadora corta relación comercial con un prestador autónomo |

Para `incapacidad_absoluta`, `jubilacion` y `fin_contrato_comercial`: el sistema registra el
cese y guarda toda la info de contexto, pero deja `monto_total = NULL` y
`requiereRevisionAbogado = true` — el cálculo se hace fuera del sistema. No inventar una
fórmula para estos tres casos.

## Simulador de Vínculo

Pantalla separada (no ejecuta ningún cese real) que compara, para un Asistente hipotético o
existente, el costo mensual total bajo monotributo vs. bajo dependencia — usa el mismo motor
`calcularCese` para proyectar el costo de un eventual cese sin causa a distintas antigüedades
(3, 6, 12, 24 meses), mostrando ambos escenarios lado a lado. Objetivo: darle a
Admin_prestadora una herramienta de decisión antes de blanquear un vínculo, no una
obligación legal automatizada.

## Score de riesgo de reclasificación

Indicador 0-100 por Asistente monotributista, recalculado cuando cambian sus datos o
periódicamente (job). Basado en 7 indicadores ponderados, cada uno con su peso almacenado en
`escalas_legales` (`tipo = 'indicador_riesgo_dependencia'`, `categoria` = nombre del
indicador) — **no hardcodear los pesos en el código**, así se pueden ajustar sin deploy.
Indicadores típicos: exclusividad de facturación a la prestadora, antigüedad del vínculo, horas
semanales promedio, uso de herramientas/uniforme provisto por la prestadora, existencia de horario
fijo impuesto, exclusividad de zona asignada, nivel de supervisión directa. El score se
guarda en `asistentes.score_riesgo_reclasificacion` y se recalcula, no se acumula histórico
en esta tabla (si se necesita histórico, agregar tabla aparte cuando haya ese requerimiento).

## Ausencias y cobertura

Flujo (8 pasos, resumido):

1. Se registra una ausencia (`ausencias`, tipo enfermedad/accidente/licencia/no justificada).
2. Si hay certificado médico, se sube a Storage (`certificado_url`).
3. Sistema identifica guardias afectadas por el rango de fechas (`guardias_afectadas`).
4. Coordinador asigna un Asistente sustituto por guardia afectada → fila en
   `guardias_cobertura` con `costo_adicional`.
5. El Asistente titular sigue devengando su `sueldo_basico`/`valor_hora` según corresponda a
   la licencia (paga o no, según `dias_computados` y el tope legal de `escalas_legales`).
6. Al cerrar la ausencia (`fecha_fin`), se recalculan `dias_computados`.
7. Se notifica a Coordinador y Familia del cambio de Asistente asignado.
8. El Simulador de Vínculo puede incluir el costo de cobertura en sus proyecciones.

## Generador de documentación

Tabla de tipos de documento generado por el módulo: liquidación final, telegrama de
notificación de cese, certificado de trabajo, certificado de remuneraciones y servicios,
notificación de vencimiento de período de prueba, constancia de ausencia justificada — todos
generados como PDF (jsPDF/react-pdf, mismo stack que el resto del proyecto) a partir de
`detalle_calculo` y los datos del Asistente, guardados en `documentos_generados` (JSONB de
rutas) dentro de `ceses`.

## Navegación

Dentro del Módulo 4 (Plantel de Asistentes) del panel: pestañas o sub-secciones "Vínculo y
Cese", "Simulador de Vínculo", "Ausencias y Cobertura", "Score de Riesgo" — no crear un ítem
de navegación de primer nivel separado.

## Fuera de alcance (explícito)

- Liquidación de sueldos automatizada / integración bancaria de pagos.
- Integración con AFIP (Mi Simplificación, Monotributo, etc.).
- Cálculo automático de indemnización para `incapacidad_absoluta` y `jubilacion`.
- Firma digital de documentos generados.

## Checklist de aceptación

- [ ] `calcularCese` es una función pura, testeada con fixtures fijas de `escalas_legales`
- [ ] Las 13 causales están implementadas con los nombres exactos del enum `causal_cese`
- [ ] `incapacidad_absoluta`, `jubilacion`, `fin_contrato_comercial` nunca calculan un monto automático
- [ ] Toda consulta a `escalas_legales` usa la fecha del hecho, no la fecha actual
- [ ] El Simulador de Vínculo reutiliza `calcularCese`, no duplica su lógica
- [ ] El score de riesgo lee sus pesos desde `escalas_legales`, no del código
- [ ] RLS: `escalas_legales`/`ceses`/`ausencias`/`guardias_cobertura` invisibles para `asistente`/`familia`
- [ ] Ninguna guardia de cobertura queda sin Asistente sustituto asignado antes de "Activa"
- [ ] Todo cese con `revisado_por_abogado = false` muestra advertencia visible en UI antes de cerrarse
