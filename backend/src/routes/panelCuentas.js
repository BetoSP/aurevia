import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';
import { crearCuentaConPerfil, borrarCuenta } from '../utils/cuentasPanel.js';

export const panelCuentasRouter = Router();

// Crear una cuenta real (Auth + perfil) es una acción sensible y difícil de revertir —
// se restringe a Admin, a diferencia del resto del panel que también admite Coordinador.
function requiereAdmin(req, res, next) {
  if (req.usuarioPanel?.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo Admin puede crear cuentas' });
  }
  next();
}

panelCuentasRouter.post('/familia', requiereRolPanel, requiereAdmin, async (req, res) => {
  const { solicitudId } = req.body;
  if (!solicitudId) {
    return res.status(400).json({ error: 'Falta solicitudId' });
  }

  const { data: solicitud, error: errorSolicitud } = await supabase
    .from('solicitudes')
    .select('*')
    .eq('id', solicitudId)
    .single();

  if (errorSolicitud || !solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }
  if (solicitud.familia_id) {
    return res.status(409).json({ error: 'Esta solicitud ya tiene una Familia asociada' });
  }

  let familiaId;
  try {
    familiaId = await crearCuentaConPerfil({
      email: solicitud.email,
      nombre: solicitud.nombre,
      telefono: solicitud.telefono,
      rol: 'familia',
    });

    const { error: errorFamilia } = await supabase
      .from('familias')
      .insert({ id: familiaId, solicitud_id: solicitudId });
    if (errorFamilia) throw new Error(errorFamilia.message);

    const { data: paciente, error: errorPaciente } = await supabase
      .from('pacientes')
      .insert({
        familia_id: familiaId,
        nombre: solicitud.nombre_paciente || solicitud.nombre,
        domicilio: solicitud.localidad,
      })
      .select()
      .single();
    if (errorPaciente) throw new Error(errorPaciente.message);

    const { error: errorUpdate } = await supabase
      .from('solicitudes')
      .update({ familia_id: familiaId })
      .eq('id', solicitudId);
    if (errorUpdate) throw new Error(errorUpdate.message);

    res.json({ ok: true, familiaId, pacienteId: paciente.id });
  } catch (error) {
    if (familiaId) {
      await supabase.from('pacientes').delete().eq('familia_id', familiaId);
      await supabase.from('familias').delete().eq('id', familiaId);
      await borrarCuenta(familiaId);
    }
    res.status(500).json({ error: error.message });
  }
});
