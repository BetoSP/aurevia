import { Router } from 'express';
import multer from 'multer';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';
import { tienePermiso } from '../utils/permisos.js';
import { crearAsistenteDirecto, crearFamiliaDirecta } from '../utils/cuentasPanel.js';
import { parsearArchivo, proponerMapeoIA, CAMPOS_IMPORTACION } from '../utils/importacionIA.js';

export const panelImportacionRouter = Router();

const TIPOS_PERMITIDOS = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO },
  fileFilter(req, file, cb) {
    // Algunos navegadores/planillas mandan un mimetype genérico para CSV — se acepta
    // también por extensión para no bloquear un archivo válido por esa inconsistencia.
    const extensionValida = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    cb(null, TIPOS_PERMITIDOS.includes(file.mimetype) || extensionValida);
  },
});

function manejarErrorMulter(err, req, res, next) {
  if (err) {
    return res.status(400).json({ error: 'Archivo no permitido (solo CSV o Excel, hasta 5 MB)' });
  }
  next();
}

function requierePermiso(accion) {
  return async (req, res, next) => {
    const permitido = await tienePermiso({
      accion,
      rol: req.usuarioPanel?.rol,
      usuarioId: req.usuarioPanel?.id,
      prestadoraId: req.usuarioPanel?.prestadoraId,
    });
    if (!permitido) {
      return res.status(403).json({ error: 'Tu Prestadora no te habilitó para esta acción' });
    }
    next();
  };
}

// Sube un archivo (Excel/CSV), lo interpreta y devuelve un mapeo propuesto por IA para que
// el Admin_prestadora lo revise/corrija antes de confirmar nada (ver Fase 3 del plan
// aprobado — no se crea ningún dato todavía en este paso).
panelImportacionRouter.post(
  '/analizar',
  requiereRolPanel,
  requierePermiso('importar_datos_masivos'),
  upload.single('archivo'),
  manejarErrorMulter,
  async (req, res) => {
    const { tipo } = req.body;
    if (!['asistente', 'familia'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de importación inválido' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Falta el archivo' });
    }

    try {
      const { headers, filas } = parsearArchivo(req.file.buffer, req.file.originalname);
      const { mapeo, advertencias } = await proponerMapeoIA({ tipo, headers, filasMuestra: filas });
      res.json({
        headers,
        filas,
        mapeoPropuesto: mapeo,
        advertencias,
        camposDisponibles: CAMPOS_IMPORTACION[tipo],
        archivoNombre: req.file.originalname,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

const CAMPOS_ASISTENTE_ARRAY = new Set(['especialidades', 'zonas']);
const CAMPOS_FAMILIA_ARRAY = new Set(['patologiasPaciente']);

function valorDesdeFila(fila, mapeo, campo, esArray) {
  const columna = Object.keys(mapeo).find((col) => mapeo[col] === campo);
  if (!columna) return esArray ? [] : undefined;
  const valor = fila[columna];
  if (esArray) {
    return String(valor ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  }
  return valor === '' || valor == null ? undefined : valor;
}

// Confirma la importación: recorre cada fila del archivo (ya con el mapeo corregido por el
// Admin_prestadora) y reutiliza exactamente crearAsistenteDirecto/crearFamiliaDirecta — el
// mismo camino de creación que el alta manual de la Fase 1 (ver alcance de la Fase 3: "no se
// construye un camino de creación de datos paralelo"). Un error en una fila no aborta el
// resto del lote; se acumula en el resumen y queda en el registro de auditoría.
panelImportacionRouter.post(
  '/confirmar',
  requiereRolPanel,
  requierePermiso('importar_datos_masivos'),
  async (req, res) => {
    const { tipo, filas, mapeo, archivoNombre } = req.body;
    if (!['asistente', 'familia'].includes(tipo) || !Array.isArray(filas) || !mapeo) {
      return res.status(400).json({ error: 'Datos de importación incompletos' });
    }

    const prestadoraId = req.usuarioPanel.prestadoraId;
    const errores = [];
    let creadas = 0;

    for (let i = 0; i < filas.length; i += 1) {
      const fila = filas[i];
      try {
        if (tipo === 'asistente') {
          const datos = { prestadoraId, usuarioPanelId: req.usuarioPanel.id };
          for (const campo of CAMPOS_IMPORTACION.asistente) {
            datos[campo] = valorDesdeFila(fila, mapeo, campo, CAMPOS_ASISTENTE_ARRAY.has(campo));
          }
          await crearAsistenteDirecto(datos);
        } else {
          const datos = { prestadoraId };
          for (const campo of CAMPOS_IMPORTACION.familia) {
            datos[campo] = valorDesdeFila(fila, mapeo, campo, CAMPOS_FAMILIA_ARRAY.has(campo));
          }
          await crearFamiliaDirecta(datos);
        }
        creadas += 1;
      } catch (error) {
        errores.push({ fila: i + 1, error: error.message });
      }
    }

    const { error: errorAuditoria } = await supabase.from('importaciones_prestadora').insert({
      prestadora_id: prestadoraId,
      usuario_id: req.usuarioPanel.id,
      tipo,
      archivo_nombre: archivoNombre || null,
      filas_totales: filas.length,
      filas_creadas: creadas,
      filas_error: errores.length,
      errores,
    });
    if (errorAuditoria) {
      console.error('Error registrando auditoría de importación:', errorAuditoria.message);
    }

    res.json({ ok: true, filasTotales: filas.length, filasCreadas: creadas, filasError: errores.length, errores });
  }
);
