-- Etapa 2m — agrega la columna DNI, que el formulario de postulación (PRD_03_Reclutamiento.md,
-- Sección A) ya pedía como campo obligatorio pero nunca se persistió en el schema real.
-- Se agrega en postulaciones (dato crudo del formulario público) y en asistentes (copiado al
-- iniciar el Proceso de Incorporación) — necesario para poder emitir documentación real
-- (Función 7 de PRD_02B_Gestion_Personal.md: certificados, liquidaciones, telegramas).
-- Nullable porque las postulaciones/asistentes ya existentes no tienen este dato cargado.

ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS dni TEXT;
