# Situaciones a revisar de cara al modelo multi-prestadora (y dónde ayuda la IA y dónde no)

> Documento de lectura no técnica — pensado para el Desarrollador, sin referencias a
> campos de base de datos, funciones ni nombres de archivo de código. Es la versión
> "para leer sin abrir el editor" del pendiente #18 de `docs/PENDIENTES.md` (que sí tiene
> el detalle técnico línea por línea, para cuando haga falta ubicar cada caso en el código).
>
> Contexto: el sistema pasó de pensarse para una sola empresa (prestadora-original) a licenciarse como
> producto a distintas prestadoras de cuidado domiciliario, cada una con su propia forma de
> trabajar. Esta revisión encontró 8 situaciones donde el sistema hoy asume "se hace como lo
> hace prestadora-original" y no deja margen para que otra prestadora lo haga distinto. Ninguna de estas
> situaciones se resolvió todavía — se necesita que el Desarrollador decida, una por una, si
> conviene dejarla configurable, y con qué criterio.

## 1. Con cuánta anticipación se avisa que un Asistente tiene un vencimiento

**La situación:** cada Asistente tiene documentación con fecha de vencimiento (Monotributo,
seguro, etc.). El sistema avisa cuando falta un mes para que algo venza — ese plazo de "un
mes" es el mismo para cualquier prestadora que use el sistema, no algo que cada una pueda
ajustar según cuánto tarda ella en resolver un trámite. Además, hoy ese aviso solo corre
para prestadora-original — otra prestadora licenciataria ni siquiera lo recibiría en su forma actual.

**¿Ayuda la IA acá?** No es un problema de Inteligencia Artificial — es simplemente un
número que hoy está fijo y debería poder configurarse por prestadora. Donde sí podría sumar
algo la IA, más adelante y sin urgencia, es sugiriendo un plazo de anticipación razonable
para cada prestadora en base a su propio historial (si a esa prestadora históricamente le
toma más o menos tiempo resolver un vencimiento, ajustar la sugerencia en consecuencia) —
pero el punto de fondo (que el plazo se pueda configurar) no depende de eso.

## 2. Hasta cuándo se generan guardias de una serie que se repite sin fecha de corte

**La situación:** cuando se da de alta una guardia que se repite (por ejemplo, todos los
lunes y jueves) sin definir una fecha de fin, el sistema hoy genera guardias hacia adelante
por una cantidad fija de días, igual para cualquier prestadora. Una prestadora con otro
ritmo de facturación o de revisión de agenda podría preferir un horizonte distinto (más
corto o más largo).

**¿Ayuda la IA acá?** No. Es un valor de configuración simple, sin ninguna necesidad de
inteligencia artificial de por medio.

## 3. La lista de motivos cuando un Asistente avisa que no podrá cubrir una guardia

**La situación:** cuando un Asistente avisa con anticipación que no va a poder ir a una
guardia, el Coordinador tiene que elegir el motivo de una lista cerrada de cuatro opciones
(salud, transporte, un motivo familiar, u "otro"). Cada prestadora podría tener su propia
casuística de terreno y necesitar otras categorías, o más detalle del que permite esa lista
fija.

**¿Ayuda la IA acá? Sí, hay una oportunidad concreta.** Si en el futuro el Coordinador
recibe el aviso como un mensaje de texto libre (por ejemplo, por WhatsApp — ver el
proyecto en discusión de mensajería automática) en vez de tener que completar el motivo a
mano en el Panel, un asistente de IA podría leer ese mensaje y sugerir automáticamente a
qué categoría corresponde, dejando al Coordinador solo confirmar o corregir en vez de tener
que categorizar todo desde cero. Esto reduce carga operativa del Coordinador, no reemplaza
su decisión final.

## 4. Las zonas y especialidades que se pueden elegir están pensadas solo para el área de Buenos Aires

**La situación:** cuando se carga un Asistente o se filtra el plantel, las zonas
disponibles (CABA, zona norte/oeste/sur del conurbano, La Plata) y ciertas etiquetas de
especialidad están fijas en el sistema, pensadas específicamente para la zona donde opera
prestadora-original hoy. Una prestadora licenciataria de otra provincia o de otro país no tendría forma
de cargar su propia geografía o su propio detalle de especialidades en esa parte del Panel.

**¿Ayuda la IA acá?** No directamente. Es un catálogo que debería poder cargar/editar cada
prestadora según su propia zona de trabajo — no un problema que la IA resuelva, sino una
limitación de configuración a levantar.

## 5. La forma de agrupar zonas también está pensada solo para Buenos Aires

**La situación:** relacionado con el punto anterior — incluso la manera en que el sistema
agrupa las zonas de cobertura (como "Capital", "Conurbano" u "otras") da por sentado la
geografía de Buenos Aires. Una prestadora de otra región del país directamente quedaría
encasillada en la categoría genérica "otras" para todo su territorio, perdiendo cualquier
posibilidad de agrupar sus propias zonas de forma útil.

**¿Ayuda la IA acá?** No. Es, otra vez, un tema de dejar la agrupación abierta a que cada
prestadora defina la suya, no un caso de inteligencia artificial.

## 6. Los idiomas disponibles están limitados a español, inglés y portugués

**La situación:** el sistema hoy solo permite operar en esos tres idiomas. Si una futura
prestadora licenciataria necesita operar en un país donde se habla otro idioma, hoy no hay
forma de sumarlo sin un desarrollo de sistema.

**¿Ayuda la IA acá? Sí, y es la oportunidad más clara de las ocho.** Traducir a mano un
sistema completo a un idioma nuevo cada vez que se suma una prestadora en un país distinto
es lento y caro. Una traducción automática asistida por IA podría generar un primer
borrador completo del idioma nuevo en minutos (en vez de semanas de traducción manual),
dejando a una persona solo la tarea de revisar y corregir ese borrador antes de publicarlo
— en vez de traducir todo desde cero. Esto acortaría mucho el tiempo necesario para poder
ofrecer el sistema a una prestadora en un país nuevo.

## 7. El Proceso de Incorporación de Asistentes tiene exactamente 5 etapas, iguales para todas las prestadoras

**La situación:** hoy toda prestadora que use el sistema pasa a sus Asistentes por las
mismas 5 etapas fijas (postulación, verificación de identidad, antecedentes penales,
entrevista, capacitación) — sin posibilidad de que una prestadora use un proceso más corto
o más largo, o con etapas distintas, según su propia forma de trabajar. Este es de los 8
puntos el que tiene más peso estructural: no es solo una pantalla a ajustar, es una decisión
de diseño que hoy da por sentado un único proceso para cualquier prestadora del sistema.

**¿Ayuda la IA acá?** No para el problema de fondo (dejar el proceso configurable por
prestadora es, otra vez, una decisión de diseño, no algo que resuelva la IA). Donde sí
podría aportar algo, más adelante y una vez que el proceso sea configurable, es ayudando a
una prestadora nueva a diseñar su propio proceso de incorporación sugiriéndole un punto de
partida razonable basado en lo que ya usan otras prestadoras del sistema — una especie de
"plantilla sugerida" en vez de partir de cero, sin que la IA decida el proceso por la
prestadora.

## 8. Todos los correos del sistema salen de la misma casilla, sin importar qué prestadora los generó

**La situación:** hoy, cualquier aviso o notificación por email que manda el sistema
(alertas al Coordinador, avisos de vencimiento, etc.) sale siempre desde la misma cuenta de
correo de prestadora-original, sin importar para qué prestadora se generó. Esto puede confundir a una
prestadora que no es prestadora-original (recibe/envía correos con una firma que no es la suya), y un
correo que ya salió con la firma equivocada no se puede retirar después de enviado.

**¿Ayuda la IA acá?** No. Es un tema de configuración (que cada prestadora pueda tener su
propio remitente de correo), no un problema de inteligencia artificial.

## Resumen

De los 8 puntos, la mayoría (1, 2, 4, 5, 7 y 8) son simplemente configuraciones que hoy
están fijas y deberían poder adaptarse por prestadora — no tienen relación con IA, son
decisiones de diseño/producto a tomar. Los dos casos donde la Inteligencia Artificial sí
tiene un rol concreto y justificado son:

- **El punto 3** (sugerir automáticamente la categoría de un aviso de ausencia a partir de
  un mensaje en texto libre, para aliviar la carga del Coordinador).
- **El punto 6** (generar un primer borrador de traducción para acelerar la llegada del
  sistema a una prestadora que necesita un idioma nuevo).

Ninguno de los 8 puntos está resuelto ni implementado — este documento es un insumo para
que el Desarrollador decida, caso por caso, cuáles vale la pena parametrizar y cuándo.
