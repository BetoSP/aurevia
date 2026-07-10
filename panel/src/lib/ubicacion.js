// Best-effort: no todos los navegadores/SO exponen geolocalización (o el usuario la niega),
// y el checkpoint de salida/check-in/check-out no puede depender de que esté disponible
// (CLAUDE.md regla 11 — nunca asumir un comportamiento uniforme de navegador/SO).
export function obtenerUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) => resolve({ lat: posicion.coords.latitude, lng: posicion.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { timeout: 5000 }
    );
  });
}
