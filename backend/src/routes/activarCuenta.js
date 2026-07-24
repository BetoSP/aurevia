import { Router } from 'express';
import { activarCuentaConToken } from '../utils/activacionCuenta.js';

export const activarCuentaRouter = Router();

// Sin auth a propósito: quien llega acá todavía no tiene sesión (pendiente #75,
// docs/PENDIENTES.md). El token de un solo uso es la única credencial — nunca se recibe ni
// se devuelve el id de la Prestadora, el rol ni ningún otro dato del usuario.
activarCuentaRouter.post('/', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'faltan_datos' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password_debil' });
  }

  try {
    await activarCuentaConToken(token, password);
    res.json({ ok: true });
  } catch (err) {
    const errores = ['token_invalido', 'token_ya_usado', 'token_vencido'];
    if (errores.includes(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error al activar cuenta:', err.message);
    res.status(500).json({ error: 'error_interno' });
  }
});
