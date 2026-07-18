import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PRESTADORA_ID = '5d727437-a5ff-432f-b9f6-10015e61ffef'; // Sandbox

async function main() {
  const { data: familiaAuth, error: errorFamiliaAuth } = await supabase.auth.admin.createUser({
    email: 'alas.para.escribir.2026+familia.demo.continuidad@gmail.com',
    password: 'DemoContinuidad2026!',
    email_confirm: true,
  });
  if (errorFamiliaAuth) throw errorFamiliaAuth;

  await supabase.from('usuarios').insert({
    id: familiaAuth.user.id,
    rol: 'familia',
    nombre: 'DEMO — Familia Fernández',
    prestadora_id: PRESTADORA_ID,
  }).throwOnError();

  await supabase.from('familias')
    .insert({ id: familiaAuth.user.id, prestadora_id: PRESTADORA_ID, plan: 'directo' })
    .throwOnError();

  const { data: paciente } = await supabase.from('pacientes')
    .insert({
      prestadora_id: PRESTADORA_ID,
      familia_id: familiaAuth.user.id,
      nombre: 'DEMO — Roberto Fernández',
      fecha_nacimiento: '1938-04-12',
      nivel_complejidad: 'II',
      domicilio: 'Av. Rivadavia 4500, CABA',
    })
    .select().single().throwOnError();

  const { data: martaAuth } = await supabase.auth.admin.createUser({
    email: 'alas.para.escribir.2026+asistente.demo.marta@gmail.com',
    password: 'DemoContinuidad2026!',
    email_confirm: true,
  });
  await supabase.from('usuarios').insert({
    id: martaAuth.user.id, rol: 'asistente', nombre: 'DEMO — Marta Gómez', prestadora_id: PRESTADORA_ID,
  }).throwOnError();
  await supabase.from('asistentes').insert({
    id: martaAuth.user.id,
    prestadora_id: PRESTADORA_ID,
    nombre: 'DEMO — Marta Gómez',
    telefono: '+5491122334455',
    estado: 'activo',
    tipo_vinculo: 'monotributo',
  }).throwOnError();

  const { data: luciaAuth } = await supabase.auth.admin.createUser({
    email: 'alas.para.escribir.2026+asistente.demo.lucia@gmail.com',
    password: 'DemoContinuidad2026!',
    email_confirm: true,
  });
  await supabase.from('usuarios').insert({
    id: luciaAuth.user.id, rol: 'asistente', nombre: 'DEMO — Lucía Paredes', prestadora_id: PRESTADORA_ID,
  }).throwOnError();
  await supabase.from('asistentes').insert({
    id: luciaAuth.user.id,
    prestadora_id: PRESTADORA_ID,
    nombre: 'DEMO — Lucía Paredes',
    telefono: '+5491133445566',
    estado: 'activo',
    tipo_vinculo: 'monotributo',
  }).throwOnError();

  const { data: guardia } = await supabase.from('guardias')
    .insert({
      prestadora_id: PRESTADORA_ID,
      asistente_id: martaAuth.user.id,
      paciente_id: paciente.id,
      fecha: new Date().toISOString().slice(0, 10),
      hora_inicio: '06:00',
      hora_fin: '14:00',
      modalidad: 'presencial',
      estado: 'ausente',
    })
    .select().single().throwOnError();

  const { data: ausencia } = await supabase.from('ausencias')
    .insert({
      prestadora_id: PRESTADORA_ID,
      asistente_id: martaAuth.user.id,
      tipo: 'ausencia_no_justificada',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      guardias_afectadas: [guardia.id],
      observaciones: 'DEMO — No se presentó a la guardia de las 06:00. Ausente sin relevo previo (primera guardia del día del Paciente).',
    })
    .select().single().throwOnError();

  const { data: cobertura } = await supabase.from('guardias_cobertura')
    .insert({
      prestadora_id: PRESTADORA_ID,
      guardia_original_id: guardia.id,
      ausencia_id: ausencia.id,
      asistente_sustituto_id: luciaAuth.user.id,
      costo_adicional: 5000,
    })
    .select().single().throwOnError();

  console.log(JSON.stringify({
    pacienteId: paciente.id,
    martaId: martaAuth.user.id,
    luciaId: luciaAuth.user.id,
    guardiaId: guardia.id,
    ausenciaId: ausencia.id,
    coberturaId: cobertura.id,
  }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
