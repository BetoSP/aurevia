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
import { panelInformesObraSocialRouter } from './routes/panelInformesObraSocial.js';
import { panelVitalesAutorizacionRouter } from './routes/panelVitalesAutorizacion.js';
import { panelConfiguracionPlataformaRouter } from './routes/panelConfiguracionPlataforma.js';
import { configuracionPublicaRouter } from './routes/configuracionPublica.js';
import { activarCuentaRouter } from './routes/activarCuenta.js';
import { revisarVencimientos } from './utils/vencimientos.js';
import { revisarAusenciasAutomaticas } from './utils/ausenciaAutomatica.js';
import { revisarNotificacionesCoordinador } from './utils/revisarNotificacionesCoordinador.js';
import { extenderSeriesGuardiaAbiertas } from './utils/generacionSeriesGuardia.js';
import { revisarRecordatoriosPush } from './utils/revisarRecordatoriosPush.js';
import { whatsappWebhookRouter } from './routes/whatsappWebhook.js';
import { appAsistentesRouter } from './routes/appAsistentes.js';
import { appFamiliasRouter } from './routes/appFamilias.js';
import { revisarAlertasIA } from './utils/revisarAlertasIA.js';
import { revisarAvisosAutomaticosCese } from './utils/avisoAutomaticoCese.js';

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
app.use('/api/panel/informes-obra-social', panelInformesObraSocialRouter);
app.use('/api/panel/vitales-autorizacion', panelVitalesAutorizacionRouter);
app.use('/api/panel/configuracion-plataforma', panelConfiguracionPlataformaRouter);
app.use('/api/configuracion-publica', configuracionPublicaRouter);
app.use('/api/activar-cuenta', activarCuentaRouter);
app.use('/api/whatsapp-webhook', whatsappWebhookRouter);
app.use('/api/app-asistentes', appAsistentesRouter);
app.use('/api/app-familias', appFamiliasRouter);

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

// Push a Asistentes (nueva guardia asignada, mensajes del coordinador, recordatorios) —
// docs/PRD_04_05_App_Servicio.md:115. Misma cadencia que revisarAusenciasAutomaticas.
revisarRecordatoriosPush().catch((err) => console.error('Error en revisión inicial de recordatorios push:', err.message));
setInterval(() => {
  revisarRecordatoriosPush().catch((err) => console.error('Error en revisión de recordatorios push:', err.message));
}, CINCO_MINUTOS_MS);

// IA Nivel 2 (Alertas por patrones) — job nocturno, docs/AI_PROMPTS.md:43. Misma cadencia
// que revisarVencimientos (se mide en días, no minutos); el disparo inmediato por palabra
// clave crítica corre aparte, en el momento de confirmar el reporte (appAsistentes.js).
revisarAlertasIA().catch((err) => console.error('Error en revisión inicial de alertas IA Nivel 2:', err.message));
setInterval(() => {
  revisarAlertasIA().catch((err) => console.error('Error en revisión de alertas IA Nivel 2:', err.message));
}, UN_DIA_MS);

// Aviso automático de cese de servicio al Asistente (Fase 6) — el plazo se mide en horas,
// misma cadencia que revisarAusenciasAutomaticas.
revisarAvisosAutomaticosCese().catch((err) => console.error('Error en revisión inicial de avisos automáticos de cese:', err.message));
setInterval(() => {
  revisarAvisosAutomaticosCese().catch((err) => console.error('Error en revisión de avisos automáticos de cese:', err.message));
}, CINCO_MINUTOS_MS);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en puerto ${PORT}`);
});
