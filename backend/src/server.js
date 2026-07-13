import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { solicitudServicioRouter } from './routes/solicitudServicio.js';
import { postulacionAsistenteRouter } from './routes/postulacionAsistente.js';
import { panelNotificacionesRouter } from './routes/panelNotificaciones.js';
import { panelCuentasRouter } from './routes/panelCuentas.js';
import { panelUsuariosRouter } from './routes/panelUsuarios.js';
import { panelConfiguracionRouter } from './routes/panelConfiguracion.js';
import { configuracionPublicaRouter } from './routes/configuracionPublica.js';
import { revisarVencimientos } from './utils/vencimientos.js';
import { revisarAusenciasAutomaticas } from './utils/ausenciaAutomatica.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/solicitud-servicio', solicitudServicioRouter);
app.use('/api/postulacion-asistente', postulacionAsistenteRouter);
app.use('/api/panel/notificar', panelNotificacionesRouter);
app.use('/api/panel/cuentas', panelCuentasRouter);
app.use('/api/panel/usuarios', panelUsuariosRouter);
app.use('/api/panel/configuracion', panelConfiguracionRouter);
app.use('/api/configuracion-publica', configuracionPublicaRouter);

const UN_DIA_MS = 24 * 60 * 60 * 1000;
revisarVencimientos().catch((err) => console.error('Error en revisión inicial de vencimientos:', err.message));
setInterval(() => {
  revisarVencimientos().catch((err) => console.error('Error en revisión de vencimientos:', err.message));
}, UN_DIA_MS);

// Margen de tolerancia se mide en minutos (no en días como los vencimientos), por eso
// corre cada 5 minutos en vez de una vez por día.
const CINCO_MINUTOS_MS = 5 * 60 * 1000;
revisarAusenciasAutomaticas().catch((err) => console.error('Error en revisión inicial de ausencias automáticas:', err.message));
setInterval(() => {
  revisarAusenciasAutomaticas().catch((err) => console.error('Error en revisión de ausencias automáticas:', err.message));
}, CINCO_MINUTOS_MS);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en puerto ${PORT}`);
});
