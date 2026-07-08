import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { solicitudServicioRouter } from './routes/solicitudServicio.js';
import { postulacionAsistenteRouter } from './routes/postulacionAsistente.js';
import { panelNotificacionesRouter } from './routes/panelNotificaciones.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/solicitud-servicio', solicitudServicioRouter);
app.use('/api/postulacion-asistente', postulacionAsistenteRouter);
app.use('/api/panel/notificar', panelNotificacionesRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en puerto ${PORT}`);
});
