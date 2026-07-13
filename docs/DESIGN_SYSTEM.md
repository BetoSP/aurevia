# DESIGN_SYSTEM.md — Identidad visual para código

## Benchmark estético de competidores (2026-07-07)

> La documentación de negocio (`prestadora-original_Anexo_Tecnico_v4`, `prestadora-original_Auditoria_Estrategica_v1`)
> ya analiza a los competidores por **prestaciones** (verificación, GPS, precios, IA). Esta
> sección cubre el ángulo que faltaba: cómo se ven, porque acá sí afecta decisiones de código
> (`DESIGN_SYSTEM.md` es el único lugar de `Workspace/docs/` donde el análisis de mercado es
> relevante para la implementación).

Relevamiento visual, julio 2026, en dos rondas (la segunda a partir de una lista adicional
de sitios que aportó el usuario, incluyendo Instagram — ver limitación abajo):

| Sitio | Paleta | Tono / nota visual |
|---|---|---|
| EnCasa (`encasa.com.ar`) | Blanco + celeste/teal | Corporativo-cálido, fotografía de staff/pacientes |
| Cuidarlos (`cuidarlos.com`) | Blanco + negro, casi sin color | Tech/producto, mockups de celular, bloques repetitivos |
| Medincare (`grupomedincare.com.ar`) | Blanco + azul/teal, iconografía SVG | Institucional, poca fotografía humana |
| Cuidando en Casa (`cuidandoencasa.com`) | Blanco + verde | Cálido, foto real de cuidador+paciente |
| Ver Salud (`versalud.com.ar`) | Blanco + celeste + **magenta/fucsia en fotos** | Único relevado con un color fuera de la paleta azul/verde estándar — se nota, en buen sentido |
| Casamed Salud (`casamedsalud.com.ar`) | Blanco + azul | Genérico, una sola foto de enfermera, sin personalidad |
| Situ Care (`situ.care`) | Blanco + teal | Usa la metáfora "Sherpa" para darle calidez — el único con un concepto narrativo, no solo lista de servicios |
| Home Care BA (`homecareba.org`) | Blanco + **rojo** de acento | Fotografía cálida/íntima, pero el rojo es un uso de color más atrevido que el resto |
| Continuum (`continuum.com.ar`) | Blanco + azul | Fotografía en contexto domiciliario, tono "centrado en la persona, no en la enfermedad" |
| Cuidarte Argentina (`cuidarteargentina.com.ar`) | Blanco + azul | El más flojo del relevamiento — menús duplicados, imagen de banco genérica, "se lee funcional y desactualizado" (cita literal del análisis) |
| InDom (`indom.com.ar`) | Blanco + azul/gris | Institucional maduro, fotografía de banco de imágenes correcta pero sin identidad propia |
| +Vida Salud (`masvidaessalud.com.ar`) | Blanco + azul/verde | Sin fotografía — todo ilustrado con íconos geométricos simples, "enfoque humano" solo en el texto, no en la imagen |
| API Cuidados Domiciliarios (`api.org.ar`) | Blanco + gris + azul | Casi sin fotografía, muy institucional/wireframe |
| Amparando Salud (`amparandosalud.com.ar`) | Blanco + azul | **Ojo**: por el contenido relevado parece más un estudio de asesoría legal en salud que un competidor de cuidado domiciliario directo — no asumir que compite 1 a 1, confirmar antes de sumarlo al análisis de negocio |
| Cuidar Buenos Aires, `app.cuidadosdomiciliarios.com` | — | Sitios con muy poco contenido accesible por herramientas automáticas (probablemente SPA/JS pesado) — no se pudo evaluar en profundidad, requiere revisión visual manual si se los quiere comparar en serio |

**Conclusión del benchmark: todos convergen en la misma fórmula** — fondo blanco,
acento azul/teal/verde, sans-serif sin personalidad, mucho whitespace, tono
"institucional-cálido" indistinguible entre marcas. Las únicas dos excepciones notadas
(Ver Salud con magenta, Home Care BA con rojo) confirman la regla: alcanza con un solo
color fuera de la paleta esperada para destacar en este rubro. Ningún competidor relevado
usa tipografía display, ni tiene dirección de arte propia consistente entre foto y foto —
es una categoría visualmente genérica. Esto es una oportunidad real, no solo un
lindo-tener: en un mercado donde nadie se diferencia estéticamente, verse distinto es
gratis en términos de percepción de superioridad, incluso antes de comparar funcionalidad.

**Competidores nuevos detectados en esta búsqueda, no presentes en el corpus de negocio
original (`prestadora-original_Anexo_Tecnico_v4`) — dejar constancia para que se evalúe si suman al
análisis de negocio, esto acá solo cubre el ángulo visual:** Cuidarnos (UTEP/Movimiento
Evita), Cuidando en Casa, Ver Salud, Casamed Salud, Cuidar Buenos Aires, Situ Care, Home
Care BA, Amparando Salud (con la salvedad de arriba), Continuum, Cuidarte Argentina, InDom,
+Vida Salud, API Cuidados Domiciliarios, Go Home Cuidados Domiciliarios (Instagram),
CuidArteBien (cooperativa, Córdoba/Santa Fe, activa en Instagram/Reels).

## Instagram — vacío detectado, no cubierto por ningún PRD original

Ningún documento de `Workspace/docs/` decía nada sobre identidad visual para redes
sociales. Es un vacío real señalado por el usuario, no solo un detalle menor: la mayoría
de los competidores chicos/medianos (Go Home, CuidArteBien) compiten más en Instagram que
en su sitio web. **Limitación a declarar:** las herramientas de investigación disponibles
en esta sesión no pueden "ver" Instagram como una persona — el contenido es
JS-renderizado y con restricciones de scraping, así que solo se pudo observar cadencia de
publicación y tipo de contenido (fotos/carruseles/reels), no calidad visual real de grilla,
paleta ni dirección de arte. Lo que sí se pudo confirmar: hay competidores activos y con
publicación regular en ese canal (Go Home: ~750 seguidores, posteo constante 2024-2026;
CuidArteBien: reels con producción cuidada, cooperativa multi-sede). **Antes de construir
nada de Etapa 1, definir explícitamente**: grilla de Instagram con sistema de plantillas
(no publicaciones sueltas sin identidad), paleta y tipografía consistentes con el sitio
(mismo `--azul-oscuro` + Playfair Display, no un estilo distinto "para redes"), y quién es
responsable de este canal — no está definido en ningún PRD actual y requiere una decisión
de negocio, no solo de diseño.

### Qué ya tiene prestadora-original a favor (no perder al implementar)

- **Playfair Display para títulos** ya rompe con la sans-serif genérica de los cuatro
  competidores relevados — es el diferenciador más barato de mantener y el más fácil de
  perder si un desarrollador "simplifica" a una sola fuente sans en el camino. No negociar
  esto en la implementación.
- La paleta funcional (`--azul-oscuro #1F4E79`) es más oscura y con más carácter que el
  celeste claro/teal que usan EnCasa y Medincare — mantenerla como color dominante de marca,
  no aclararla "para que se vea más liviano".

### Recomendaciones para superar al resto visualmente (a aplicar en Etapa 1)

- **No repetir la fórmula fondo-blanco-completo.** Usar bloques con `--fondo-alt` y el azul
  oscuro de marca como fondo de secciones completas (hero, testimonios), no solo como acento
  de botón — ningún competidor se anima a esto, todos usan blanco de punta a punta.
  Combinar la paleta funcional (verde-exito, naranja-alerta, rojo-peligro) con dark mode.
- **Fotografía real y propia, no genérica de banco de imágenes**, con dirección de arte
  consistente (misma luz, mismo grado de color en todas las fotos) — es lo único que
  Cuidando en Casa y EnCasa hacen bien y Cuidarlos/Medincare no; superarlos significa
  hacerlo mejor y de forma sistemática, no solo igual.
- **Micro-interacciones y transiciones** (hover states, transiciones de sección, loading
  states con identidad, no spinners genéricos) — ningún competidor relevado invierte en
  esto, es terreno libre para diferenciarse con poco esfuerzo de desarrollo.
- **Iconografía propia** en vez de sets genéricos (Font Awesome/Heroicons sin editar) —
  Medincare ya se apoya en iconos SVG genéricos; un set de íconos con el mismo espíritu que
  Playfair Display (con algo de personalidad, no solo funcional) refuerza la distancia visual.
- **Definir una identidad de Instagram desde Etapa 1, no después** — grilla con sistema de
  plantillas propio, misma paleta y tipografía que el sitio (ver sección "Instagram" arriba).
  Ningún competidor grande lo hace bien; los que sí publican seguido (Go Home, CuidArteBien)
  lo hacen sin un sistema visual reconocible — ahí también hay espacio para diferenciarse.


> Fuente: `docs/Exclusivo prestadora-original/prestadora-original_Manual_Identidad_v1.html` + `prestadora-original_PROMPT_MAESTRO_v1.md` Parte B.
> Advertencia que hay que respetar: el manual se declara "Provisional — identidad
> definitiva pendiente de definición". Construir el sistema de estilos de forma
> centralizada (variables CSS, nunca hardcodeado por componente) para que un reemplazo
> futuro de marca no requiera tocar componentes uno por uno.

## Paleta funcional de UI (estable — no es branding de división)

```css
:root {
  --azul-oscuro: #1F4E79;      /* color principal de marca */
  --azul-medio: #2E75B6;        /* acentos y secundario */
  --verde-exito: #28A745;       /* confirmaciones, éxito */
  --naranja-alerta: #FD7E14;    /* alertas moderadas (nivel amarilla) */
  --rojo-peligro: #DC3545;      /* errores, emergencias (nivel roja) */
  --fondo-alt: #F0F4F8;         /* fondos de sección */
  --texto-principal: #1A1A2E;   /* cuerpo de texto */
  --texto-secundario: #666666;  /* labels, subtítulos */
}
```

Regla: ningún componente define un color fuera de estas variables. Si hace falta un tono
nuevo, se agrega acá primero, con justificación.

## Colores de división (solo referencia — NO usar en prestadora-original Salud)

```css
--salud: #2E75B6;      /* única división activa hoy — coincide con --azul-medio */
--junior: #F4820A;
--pets: #4A7C3F;
--bienestar: #7B6BB5;
--hogar: #C0622A;
--legal: #1F3A6E;
--group: #2C2C3E;
```

## Tipografía

- **Display** (títulos, encabezados principales): Playfair Display — weights 400, 700, 900
- **Body** (interfaz, párrafos, formularios, navegación): DM Sans — weights 300, 400, 500, 600

```css
:root {
  --font-display: 'Playfair Display', serif;
  --font-body: 'DM Sans', sans-serif;
}
```

## Logos disponibles

Solo **prestadora-original Salud** tiene el logo necesario para el desarrollo actual (1 variante con
texto). Los logos de prestadora-original Group y de otras divisiones no se usan en esta etapa.

## Estructura de archivos de estilos recomendada

```
src/styles/
├── variables.css      ← todo lo de arriba: colores, tipografía, espaciados
├── global.css         ← reset + base
└── components.css     ← estilos de componentes reutilizables (Button, Alert, FormField)
```

## Estados visuales de alertas (Nivel 2 de IA)

Estas tres clases mapean directo a los niveles que devuelve el motor de alertas
(ver `AI_PROMPTS.md`):

```css
.alerta-verde  { border-left: 4px solid var(--verde-exito); }
.alerta-amarilla { border-left: 4px solid var(--naranja-alerta); }
.alerta-roja   { border-left: 4px solid var(--rojo-peligro); }
```

## Estados visuales de guardias (Módulo 6 del Panel Admin)

Patrón adoptado de análisis de GlamourOS/ERP salones: colores automáticos por estado en
vista calendario/lista, para escaneo visual rápido sin leer texto. Reutiliza las mismas
variables de la paleta funcional, no colores nuevos:

```css
.guardia-programada { border-left: 4px solid var(--azul-medio); }
.guardia-activa     { border-left: 4px solid var(--verde-exito); }
.guardia-completada { border-left: 4px solid var(--texto-secundario); }
.guardia-cancelada  { border-left: 4px solid var(--rojo-peligro); }
.guardia-ausente    { border-left: 4px solid var(--naranja-alerta); }
```

`ausente` se agregó como quinto valor de `guardias.estado` al diseñar el schema real
(`backend/src/db/schema_modulo6_guardias.sql`) — distinto de `cancelada`, esta sección había
quedado con solo 4 reglas. Corregido al implementar Módulo 6 Parte 1 (2026-07-10).

## Convenciones de UI (patrón adoptado de análisis de GlamourOS/ERP salones — no vinculante,
## solo se toman estas dos prácticas puntuales, ver justificación en memoria de sesión)

- **Teléfono siempre como link, nunca texto plano.** Cualquier campo de teléfono/WhatsApp
  visible en UI (ficha de Familia, ficha de Asistente, tabla de postulantes) se renderiza
  como `wa.me/{telefono}`, no como texto estático — reduce fricción de contacto en un solo
  clic, consistente con el botón de WhatsApp flotante que ya define `PRD_01_Sitio_Web.md`.
- **Listas largas de opciones se agrupan por categoría, nunca scroll vertical infinito.**
  Aplica directo a la Sección D del formulario de postulación (`PRD_03_Reclutamiento.md`):
  discapacidades, patologías, tareas de cuidado directo/acompañamiento/domésticas — cada
  subgrupo se muestra como su propia sección colapsable o con su propio encabezado visual,
  no como un único muro de checkboxes.
