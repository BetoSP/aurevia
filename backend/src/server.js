import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { solicitudServicioRouter } from './routes/solicitudServicio.js';
import { postulacionAsistenteRouter } from './routes/postulacionAsistente.js';
import { panelNotificacionesRouter } from './routes/panelNotificaciones.js';
import { panelCuentasRouter } from './routes/panelCuentas.js';
import { panelUsuariosRouter } from './routes/panelUsuarios.js';
import { panelSesionTenantRouter } from './routes/panelSesionTenant.js';
import { panelAuditoriaRouter } from './routes/panelAuditoria.js';
import { panelPrestadorasRouter } from './routes/panelPrestadoras.js';
import { panelAdminPlataformaRouter } from './routes/panelAdminPlataforma.js';
import { panelAusenciasRouter } from './routes/panelAusencias.js';
import { panelConfiguracionRouter } from './routes/panelConfiguracion.js';
import { panelImportacionRouter } from './routes/panelImportacion.js';
import { panelConfiguracionPlataformaRouter } from './routes/panelConfiguracionPlataforma.js';
import { configuracionPublicaRouter } from './routes/configuracionPublica.js';
import { revisarVencimientos } from './utils/vencimientos.js';
import { revisarAusenciasAutomaticas } from './utils/ausenciaAutomatica.js';
import { revisarNotificacionesCoordinador } from './utils/revisarNotificacionesCoordinador.js';
import { extenderSeriesGuardiaAbiertas } from './utils/generacionSeriesGuardia.js';
import { whatsappWebhookRouter } from './routes/whatsappWebhook.js';

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
app.use('/api/panel/sesion-tenant', panelSesionTenantRouter);
app.use('/api/panel/auditoria', panelAuditoriaRouter);
app.use('/api/panel/prestadoras', panelPrestadorasRouter);
app.use('/api/panel/admin-plataforma', panelAdminPlataformaRouter);
app.use('/api/panel/ausencias', panelAusenciasRouter);
app.use('/api/panel/configuracion', panelConfiguracionRouter);
app.use('/api/panel/importacion', panelImportacionRouter);
app.use('/api/panel/configuracion-plataforma', panelConfiguracionPlataformaRouter);
app.use('/api/configuracion-publica', configuracionPublicaRouter);
app.use('/api/whatsapp-webhook', whatsappWebhookRouter);

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

// Insistencia de Coordinador (punto 5, docs/PRD_06_WhatsApp_IA.md) — corre con la misma
// cadencia que revisarAusenciasAutomaticas porque también se mide en minutos, no en días.
revisarNotificacionesCoordinador().catch((err) => console.error('Error en revisión inicial de notificaciones al Coordinador:', err.message));
setInterval(() => {
  revisarNotificacionesCoordinador().catch((err) => console.error('Error en revisión de notificaciones al Coordinador:', err.message));
}, CINCO_MINUTOS_MS);

// Renovación automática del horizonte de guardias de series abiertas (pendiente #18 punto 2,
// docs/PENDIENTES.md) — se mide en días, misma cadencia que revisarVencimientos.
extenderSeriesGuardiaAbiertas().catch((err) => console.error('Error en extensión inicial de series de guardia:', err.message));
setInterval(() => {
  extenderSeriesGuardiaAbiertas().catch((err) => console.error('Error en extensión de series de guardia:', err.message));
}, UN_DIA_MS);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en puerto ${PORT}`);
});
