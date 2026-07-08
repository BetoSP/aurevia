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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en puerto ${PORT}`);
});
