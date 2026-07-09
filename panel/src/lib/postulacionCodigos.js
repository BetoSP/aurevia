// postulaciones.especialidades/zonas/disponibilidad se guardan como códigos separados por
// coma (ver TrabajaConNosotrosForm.jsx del sitio-web) — nunca como texto ya traducido, para
// que una postulación en cualquier idioma guarde siempre el mismo valor. Estas funciones
// traducen esos códigos a la etiqueta del locale activo del Panel para mostrarlos y filtrarlos.
export function traducirCodigos(valorGuardado, labels) {
  return (valorGuardado || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((codigo) => labels[codigo] ?? codigo)
    .join(', ');
}

export function contieneCodigo(valorGuardado, codigo) {
  if (!codigo) return true;
  return (valorGuardado || '').split(',').map((v) => v.trim()).includes(codigo);
}
