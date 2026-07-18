const RADIO_TIERRA_KM = 6371;

// Fórmula de Haversine — suficiente para el uso que le damos acá (saber si un check-in/
// check-out ocurrió razonablemente cerca del domicilio del Paciente), no hace falta
// precisión geodésica mayor.
export function distanciaKm(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RADIO_TIERRA_KM * c;
}
