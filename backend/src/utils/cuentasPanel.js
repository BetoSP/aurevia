import crypto from 'crypto';
import { supabase } from '../db/connection.js';

const ETAPAS_INCORPORACION = [
  'postulacion',
  'verificacion_identidad',
  'antecedentes_penales',
  'entrevista',
  'capacitacion',
];

// Mecanismo compartido: crea una cuenta real de Supabase Auth + su fila en `usuarios`,
// sin enviar ningún email todavía. Para Familia/Asistente (panelCuentas.js) esto es correcto
// tal cual: la PWA correspondiente (Etapa 3/4) no existe aún, así que no tiene sentido invitar
// a alguien a loguearse en una app que no existe — el envío de invitación queda para cuando
// esa PWA esté en producción (usar `admin.inviteUserByEmail` en ese momento). Para
// Coordinador/Admin/Superadmin (panelUsuarios.js) el Panel SÍ existe hoy, así que
// `passwordTemporal` se devuelve al caller para que quien lo crea pueda comunicarlo — no hay
// otro canal de invitación implementado todavía.
export async function crearCuentaConPerfil({ email, nombre, telefono, rol, zonas, prestadoraId }) {
  const passwordTemporal = crypto.randomBytes(24).toString('base64url');

  const { data: authData, error: errorAuth } = await supabase.auth.admin.createUser({
    email,
    password: passwordTemporal,
    email_confirm: true,
  });

  if (errorAuth) {
    throw new Error(errorAuth.message);
  }

  const userId = authData.user.id;

  const { error: errorPerfil } = await supabase
    .from('usuarios')
    .insert({ id: userId, rol, nombre, telefono, zonas, prestadora_id: prestadoraId });

  if (errorPerfil) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(errorPerfil.message);
  }

  return { userId, passwordTemporal };
}

// `prestadoraId`/`esSuperadmin` son la misma verificación de tenant que ya hacen los
// callers antes de invocar esta función (panelUsuarios.js valida con un SELECT previo;
// panelCuentas.js borra un id recién creado en el mismo request) — se repite acá adentro
// para que la función no dependa por completo de la disciplina de cada llamador presente
// y futuro (mismo tipo de hueco que tenía panelUsuarios.js antes de este bloque).
export async function borrarCuenta(userId, { prestadoraId, esSuperadmin = false } = {}) {
  if (!esSuperadmin) {
    const { data: objetivo, error: errorObjetivo } = await supabase
      .from('usuarios')
      .select('prestadora_id')
      .eq('id', userId)
      .single();
    if (errorObjetivo || !objetivo || objetivo.prestadora_id !== prestadoraId) {
      throw new Error('No tenés permiso para dar de baja esa cuenta');
    }
  }

  const { error: errorPerfil } = await supabase.from('usuarios').delete().eq('id', userId);
  if (errorPerfil) throw new Error(errorPerfil.message);

  const { error: errorAuth } = await supabase.auth.admin.deleteUser(userId);
  if (errorAuth) throw new Error(errorAuth.message);
}

// Lógica de alta manual de un Asistente, extraída de panelCuentas.js (ruta /asistente-directo)
// en la Fase 3 (importación masiva) del plan "Terminar la Etapa 2 (Panel)" para que la
// importación fila-por-fila reutilice exactamente el mismo camino de creación que el alta
// manual de la Fase 1, en vez de duplicar la lógica (ver alcance de la Fase 3 en el plan
// aprobado: "no se construye un camino de creación de datos paralelo y distinto").
export async function crearAsistenteDirecto({
  nombre, telefono, email, dni, especialidades, zonas, estado,
  tipo_vinculo, categoria_cct, valor_hora, sueldo_basico, horas_semanales,
  prestadoraId, usuarioPanelId,
}) {
  if (!nombre || !email) {
    throw new Error('Faltan datos obligatorios (nombre, email)');
  }

  const zonasArray = Array.isArray(zonas) ? zonas : [];
  const especialidadesArray = Array.isArray(especialidades) ? especialidades : [];

  let asistenteId;
  try {
    ({ userId: asistenteId } = await crearCuentaConPerfil({
      email, nombre, telefono, rol: 'asistente', zonas: zonasArray, prestadoraId,
    }));

    const { error: errorAsistente } = await supabase.from('asistentes').insert({
      id: asistenteId,
      nombre,
      dni: dni || null,
      telefono: telefono || null,
      email,
      especialidades: especialidadesArray,
      zonas: zonasArray,
      estado: estado || 'activo',
      tipo_vinculo: tipo_vinculo || 'monotributo',
      categoria_cct: categoria_cct || null,
      valor_hora: valor_hora || null,
      sueldo_basico: sueldo_basico || null,
      horas_semanales: horas_semanales || null,
      prestadora_id: prestadoraId,
    });
    if (errorAsistente) throw new Error(errorAsistente.message);

    const { data: prestadora, error: errorPrestadora } = await supabase
      .from('prestadoras')
      .select('politica_verificacion_alta_manual')
      .eq('id', prestadoraId)
      .single();
    if (errorPrestadora) throw new Error(errorPrestadora.message);

    const politica = prestadora.politica_verificacion_alta_manual;
    if (politica === 'pendiente' || politica === 'aprobado') {
      const filasVerificacion = ETAPAS_INCORPORACION.map((etapa) => ({
        asistente_id: asistenteId,
        etapa,
        estado: politica === 'aprobado' ? 'aprobada' : 'pendiente',
        revisado_por: politica === 'aprobado' ? usuarioPanelId : null,
        completado_en: politica === 'aprobado' ? new Date().toISOString() : null,
      }));
      const { error: errorVerificaciones } = await supabase.from('verificaciones_asistente').insert(filasVerificacion);
      if (errorVerificaciones) throw new Error(errorVerificaciones.message);
    }

    return { asistenteId };
  } catch (error) {
    if (asistenteId) {
      await supabase.from('asistentes').delete().eq('id', asistenteId);
      await borrarCuenta(asistenteId, { prestadoraId });
    }
    throw error;
  }
}

// Invita a una persona al círculo de cuidado de una Familia ya existente (Fase 5): crea su
// cuenta con `crearCuentaConPerfil` igual que cualquier otro rol de login propio, y en vez
// de una fila en `familias` (eso es solo para el titular) crea la fila en `miembros_familia`
// que la vincula. Rol fijo `solo_lectura` — es el único que existe hoy (ver
// schema_circulo_cuidado.sql).
export async function invitarMiembroCirculo({ email, nombre, telefono, familiaId, prestadoraId, invitadoPor }) {
  if (!nombre || !email || !familiaId) {
    throw new Error('Faltan datos obligatorios (nombre, email, familiaId)');
  }

  let miembroId;
  try {
    ({ userId: miembroId } = await crearCuentaConPerfil({
      email, nombre, telefono, rol: 'familia', prestadoraId,
    }));

    const { error: errorMiembro } = await supabase
      .from('miembros_familia')
      .insert({ usuario_id: miembroId, familia_id: familiaId, email, rol: 'solo_lectura', creado_por: invitadoPor });
    if (errorMiembro) throw new Error(errorMiembro.message);

    return { miembroId };
  } catch (error) {
    if (miembroId) {
      await supabase.from('miembros_familia').delete().eq('usuario_id', miembroId);
      await borrarCuenta(miembroId, { prestadoraId });
    }
    throw error;
  }
}

// Revoca el acceso de un miembro invitado del círculo de cuidado — borra su fila en
// `miembros_familia` (RLS/`ON DELETE CASCADE` no alcanza porque el borrado real es la
// cuenta completa, no la fila) y su cuenta, reutilizando `borrarCuenta` para no duplicar la
// validación de tenant que ya hace esa función.
export async function revocarMiembroCirculo(usuarioId, { prestadoraId, familiaId }) {
  const { data: miembro, error: errorMiembro } = await supabase
    .from('miembros_familia')
    .select('familia_id')
    .eq('usuario_id', usuarioId)
    .single();
  if (errorMiembro || !miembro || miembro.familia_id !== familiaId) {
    throw new Error('Esta persona no pertenece al círculo de cuidado de esta Familia');
  }

  await supabase.from('miembros_familia').delete().eq('usuario_id', usuarioId);
  await borrarCuenta(usuarioId, { prestadoraId });
}

// Lógica de alta manual de Familia+Paciente, extraída de panelCuentas.js (ruta
// /familia-directa) por el mismo motivo que crearAsistenteDirecto de arriba.
export async function crearFamiliaDirecta({
  nombreContacto, telefono, email, localidad, plan,
  nombrePaciente, domicilioPaciente, fechaNacimientoPaciente, nivelComplejidadPaciente, patologiasPaciente,
  prestadoraId,
}) {
  if (!nombreContacto || !email || !nombrePaciente) {
    throw new Error('Faltan datos obligatorios (nombreContacto, email, nombrePaciente)');
  }

  let familiaId;
  let solicitudId;
  try {
    const { data: solicitud, error: errorSolicitud } = await supabase
      .from('solicitudes')
      .insert({
        prestadora_id: prestadoraId,
        nombre: nombreContacto,
        telefono: telefono || '',
        email,
        nombre_paciente: nombrePaciente,
        localidad: localidad || '',
        canal: 'alta_manual',
        estado: 'asignada',
        tipo_servicio: 'Cuidado domiciliario',
        modalidad: 'presencial',
        dias_horario: 'A definir',
      })
      .select()
      .single();
    if (errorSolicitud) throw new Error(errorSolicitud.message);
    solicitudId = solicitud.id;

    ({ userId: familiaId } = await crearCuentaConPerfil({
      email, nombre: nombreContacto, telefono, rol: 'familia', prestadoraId,
    }));

    const { error: errorFamilia } = await supabase
      .from('familias')
      .insert({ id: familiaId, solicitud_id: solicitudId, prestadora_id: prestadoraId, plan: plan || null });
    if (errorFamilia) throw new Error(errorFamilia.message);

    const { data: paciente, error: errorPaciente } = await supabase
      .from('pacientes')
      .insert({
        familia_id: familiaId,
        nombre: nombrePaciente,
        domicilio: domicilioPaciente || localidad || null,
        fecha_nacimiento: fechaNacimientoPaciente || null,
        nivel_complejidad: nivelComplejidadPaciente || null,
        patologias: patologiasPaciente || [],
        prestadora_id: prestadoraId,
      })
      .select()
      .single();
    if (errorPaciente) throw new Error(errorPaciente.message);

    const { error: errorUpdate } = await supabase
      .from('solicitudes')
      .update({ familia_id: familiaId })
      .eq('id', solicitudId);
    if (errorUpdate) throw new Error(errorUpdate.message);

    return { familiaId, pacienteId: paciente.id };
  } catch (error) {
    if (familiaId) {
      await supabase.from('pacientes').delete().eq('familia_id', familiaId);
      await supabase.from('familias').delete().eq('id', familiaId);
      await borrarCuenta(familiaId, { prestadoraId });
    }
    if (solicitudId) {
      await supabase.from('solicitudes').delete().eq('id', solicitudId);
    }
    throw error;
  }
}
