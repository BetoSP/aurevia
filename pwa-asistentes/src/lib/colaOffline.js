// Cola de acciones pendientes de sincronizar (check-in y confirmación de Reporte Diario)
// cuando el Asistente se queda sin señal. Ver Fase 9 del plan de rediseño de frontend —
// IndexedDB en vez de Background Sync API (no soportada en Safari/iOS), reintento manual
// al abrir/volver a la app.

const DB_NOMBRE = 'aurevia-offline';
const DB_VERSION = 1;
const ALMACEN = 'cola';

function abrirDB() {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(DB_NOMBRE, DB_VERSION);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: 'id' });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function transaccion(modo, ejecutar) {
  const db = await abrirDB();
  const almacen = db.transaction(ALMACEN, modo).objectStore(ALMACEN);
  return new Promise((resolve, reject) => {
    const pedido = ejecutar(almacen);
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export function nuevoId() {
  return crypto.randomUUID();
}

// tipo: 'checkin' | 'reporte'. payload: datos a enviar. guardiaId: para agrupar/mostrar.
export async function agregarACola({ id, tipo, guardiaId, payload }) {
  const item = { id, tipo, guardiaId, payload, creadoEn: Date.now(), error: null };
  await transaccion('readwrite', (almacen) => almacen.put(item));
  return item;
}

export async function listarCola() {
  const resultado = await transaccion('readonly', (almacen) => almacen.getAll());
  return (resultado || []).sort((a, b) => a.creadoEn - b.creadoEn);
}

export async function quitarDeCola(id) {
  return transaccion('readwrite', (almacen) => almacen.delete(id));
}

export async function marcarError(id, mensajeError) {
  const db = await abrirDB();
  const almacen = db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN);
  return new Promise((resolve, reject) => {
    const pedidoGet = almacen.get(id);
    pedidoGet.onsuccess = () => {
      const item = pedidoGet.result;
      if (!item) return resolve();
      item.error = mensajeError;
      const pedidoPut = almacen.put(item);
      pedidoPut.onsuccess = () => resolve();
      pedidoPut.onerror = () => reject(pedidoPut.error);
    };
    pedidoGet.onerror = () => reject(pedidoGet.error);
  });
}

export async function pendientesDeGuardia(guardiaId) {
  const cola = await listarCola();
  return cola.filter((item) => item.guardiaId === guardiaId);
}
