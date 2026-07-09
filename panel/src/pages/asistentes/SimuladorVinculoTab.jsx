import { useMemo } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useEscalasLegales } from '../../hooks/useEscalasLegales';
import { resolverEscalasVigentes } from '../../lib/escalasLegales';
import { calcularCese } from '../../lib/calcularCese';
import { EstadoLista } from '../../components/layout/EstadoLista';
import { Alert } from '../../components/ui/Alert';

const ANTIGUEDADES_MESES = [3, 6, 12, 24];

function fechaAltaHace(meses, hoy) {
  const d = new Date(hoy);
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}

// Nunca se inventa un valor_hora/sueldo_basico de referencia acá (regla 1 de CLAUDE.md:
// nunca hardcodear valores legales/monetarios) — si el Asistente no tiene el dato de base
// cargado en su Perfil, la proyección para ese vínculo directamente no se puede calcular.
function proyectarCosto(asistenteBase, tipoVinculo, escalasResueltas, hoy) {
  const valorHora = asistenteBase.valor_hora ? Number(asistenteBase.valor_hora) : null;
  const horasSemanales = asistenteBase.horas_semanales ? Number(asistenteBase.horas_semanales) : null;
  const sueldoBasico = asistenteBase.sueldo_basico
    ? Number(asistenteBase.sueldo_basico)
    : (valorHora && horasSemanales ? valorHora * horasSemanales * 4.33 : null);

  const asistenteHipotetico = {
    ...asistenteBase,
    tipo_vinculo: tipoVinculo,
    valor_hora: tipoVinculo === 'monotributo' ? valorHora : null,
    sueldo_basico: tipoVinculo === 'dependencia' ? sueldoBasico : null,
  };

  const faltaDato = tipoVinculo === 'monotributo' ? valorHora === null : sueldoBasico === null;

  return ANTIGUEDADES_MESES.map((meses) => {
    if (faltaDato) return { meses, montoDespidoSinCausa: null, faltaDato: true };
    const asistenteProyectado = { ...asistenteHipotetico, fecha_alta: fechaAltaHace(meses, hoy) };
    const r = calcularCese({
      asistente: asistenteProyectado, fechaCese: hoy, causal: 'despido_sin_causa', escalasLegales: escalasResueltas,
    });
    return { meses, montoDespidoSinCausa: r.montoTotal, faltaDato: false };
  });
}

export function SimuladorVinculoTab({ asistente }) {
  const { t } = useLocale();
  const { filas: escalasCrudas, estado } = useEscalasLegales();
  const hoy = new Date().toISOString().slice(0, 10);

  const proyecciones = useMemo(() => {
    if (estado !== 'listo') return null;
    const escalasResueltas = resolverEscalasVigentes(escalasCrudas, hoy);
    return {
      monotributo: proyectarCosto(asistente, 'monotributo', escalasResueltas, hoy),
      dependencia: proyectarCosto(asistente, 'dependencia', escalasResueltas, hoy),
    };
  }, [escalasCrudas, estado, asistente, hoy]);

  return (
    <div>
      <h2>{t.asistentes.simulador.titulo}</h2>
      <Alert variant="info">{t.asistentes.simulador.explicacion}</Alert>

      <EstadoLista estado={estado} vacio={false}>
        {proyecciones && (
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>{t.asistentes.simulador.antiguedad_hipotetica}</th>
                <th>{t.asistentes.vinculo_monotributo}</th>
                <th>{t.asistentes.vinculo_dependencia}</th>
              </tr>
            </thead>
            <tbody>
              {ANTIGUEDADES_MESES.map((meses, i) => (
                <tr key={meses}>
                  <td>{t.asistentes.simulador.meses.replace('{n}', meses)}</td>
                  <td>{proyecciones.monotributo[i].faltaDato ? t.asistentes.simulador.falta_dato_base : (proyecciones.monotributo[i].montoDespidoSinCausa !== null ? `$${proyecciones.monotributo[i].montoDespidoSinCausa.toLocaleString('es-AR')}` : '—')}</td>
                  <td>{proyecciones.dependencia[i].faltaDato ? t.asistentes.simulador.falta_dato_base : (proyecciones.dependencia[i].montoDespidoSinCausa !== null ? `$${proyecciones.dependencia[i].montoDespidoSinCausa.toLocaleString('es-AR')}` : '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </EstadoLista>
    </div>
  );
}
