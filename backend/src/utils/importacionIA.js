import XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';

// Fase 3 del plan "Terminar la Etapa 2 (Panel)" (importación masiva de datos con IA).
// Sigue el mismo patrón que backend/src/utils/iaWhatsapp.js: cliente de Anthropic con
// inicialización perezosa condicionada a ANTHROPIC_API_KEY, prompt que exige responder
// solo JSON, y un fallback seguro si la respuesta no es JSON válido o si falta la key
// (acá el fallback es proponer un mapeo vacío para que el Admin_prestadora lo arme a mano,
// nunca bloquear la importación por falta de IA).

const MODELO = 'claude-sonnet-5';

// Campos destino disponibles para el mapeo, por tipo — reflejan exactamente lo que
// panel/src/pages/familias/NuevoPacienteModal.jsx, EditarPacienteModal.jsx y
// crearAsistenteDirecto()/crearFamiliaDirecta() (backend/src/utils/cuentasPanel.js) aceptan.
// Se excluye `medicacion_habitual` de Paciente: es un array de objetos {nombre, dosis,
// frecuencia} que no mapea a una sola columna de planilla — queda para cargar después
// desde la ficha de la Familia, no como parte de este import (ver docs/PENDIENTES.md).
export const CAMPOS_IMPORTACION = {
  asistente: [
    'nombre', 'telefono', 'email', 'dni', 'especialidades', 'zonas',
    'tipo_vinculo', 'categoria_cct', 'valor_hora', 'sueldo_basico', 'horas_semanales',
  ],
  familia: [
    'nombreContacto', 'telefono', 'email', 'localidad', 'plan',
    'nombrePaciente', 'domicilioPaciente', 'fechaNacimientoPaciente',
    'nivelComplejidadPaciente', 'patologiasPaciente',
  ],
};

export function parsearArchivo(buffer, nombreArchivo) {
  // codepage 65001 (UTF-8) explícito: sin esto, un CSV en UTF-8 sin BOM (el caso normal al
  // exportar desde Excel/Sheets en español) se interpreta con acentos/ñ corrompidos —
  // encontrado en la verificación de esta fase con una planilla de prueba real.
  const libro = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });
  if (filas.length === 0) {
    throw new Error('El archivo no tiene filas de datos');
  }
  const headers = Object.keys(filas[0]);
  return { headers, filas };
}

const SYSTEM_PROMPT = `Sos un asistente que ayuda a mapear columnas de una planilla (Excel/CSV)
subida por una Prestadora de cuidado domiciliario a los campos internos del sistema Aurevia,
para importar Asistentes (cuidadores) o Familias/Pacientes en forma masiva. Cada Prestadora
nombra sus columnas distinto (puede venir en español, con abreviaturas, en otro orden, con
columnas de más que no aplican). Tu tarea es proponer, para cada columna del archivo, a qué
campo interno corresponde (o null si no aplica a ninguno), y marcar advertencias sobre datos
que parezcan faltantes, ambiguos o de formato dudoso mirando las filas de muestra.

Respondé únicamente con un JSON de esta forma, sin texto adicional:
{"mapeo": {"columna_del_archivo": "campo_interno_o_null", ...}, "advertencias": ["texto breve", ...]}`;

let cliente = null;
function obtenerCliente() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cliente) cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cliente;
}

export async function proponerMapeoIA({ tipo, headers, filasMuestra }) {
  const camposDisponibles = CAMPOS_IMPORTACION[tipo];
  const anthropic = obtenerCliente();
  if (!anthropic) {
    return {
      mapeo: Object.fromEntries(headers.map((h) => [h, null])),
      advertencias: ['ANTHROPIC_API_KEY no configurada — revisá y completá el mapeo a mano antes de confirmar'],
    };
  }

  const mensaje = `Tipo de importación: ${tipo}
Campos internos disponibles: ${camposDisponibles.join(', ')}
Columnas del archivo: ${headers.join(', ')}
Primeras filas de muestra (JSON): ${JSON.stringify(filasMuestra.slice(0, 5))}`;

  const respuesta = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: mensaje }],
  });

  const texto = respuesta.content?.[0]?.type === 'text' ? respuesta.content[0].text : '';

  try {
    const parseado = JSON.parse(texto);
    const mapeo = Object.fromEntries(
      headers.map((h) => {
        const campo = parseado.mapeo?.[h];
        return [h, camposDisponibles.includes(campo) ? campo : null];
      })
    );
    return { mapeo, advertencias: Array.isArray(parseado.advertencias) ? parseado.advertencias : [] };
  } catch {
    return {
      mapeo: Object.fromEntries(headers.map((h) => [h, null])),
      advertencias: ['La IA no devolvió un mapeo válido — revisá y completá el mapeo a mano antes de confirmar'],
    };
  }
}
