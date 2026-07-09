// Convención de UI (docs/DESIGN_SYSTEM.md): todo teléfono visible se linkea a WhatsApp,
// nunca como `tel:` ni texto plano — reduce fricción de contacto en un solo clic.
export function linkWhatsapp(telefono) {
  const numero = (telefono || '').replace(/\D/g, '');
  return `https://wa.me/${numero}`;
}
