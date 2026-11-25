const express = require('express');
const cors = require('cors');
const { procesarDevoluciones } = require('./evaluador');
const { tokenValido } = require('./auth');

const HOST_POR_DEFECTO = '127.0.0.1';

// Autenticación de servicio: `Authorization: Bearer <SERVICIO_TOKEN>`.
function autenticar(servicioToken) {
  return (req, res, next) => {
    if (tokenValido(req.get('Authorization'), servicioToken)) return next();
    res.set('WWW-Authenticate', 'Bearer realm="devoluciones"');
    return res.status(401).json({ success: false, error: 'No autorizado' });
  };
}

/**
 * Crea la aplicación Express. Sin servicioToken no se crea (la API no arranca sin token).
 */
function crearApp({ servicioToken } = {}) {
  if (!servicioToken) {
    throw new Error('SERVICIO_TOKEN no configurado: la API no arranca sin token de servicio');
  }

  const app = express();

  // Middleware
  app.use(cors());

  /**
   * POST /api/devoluciones
   *
   * Evalúa un array de devoluciones y devuelve el resultado de cada una.
   * Requiere Authorization: Bearer <SERVICIO_TOKEN>.
   *
   * Input JSON:
   * {
   *   "devoluciones": [
   *     {
   *       "guia": "1234567890",
   *       "orden": "ORD-001",
   *       "transportadora": "SERVIENTREGA",
   *       "contador_novedades": 1,
   *       "novedad": "Dirección incorrecta",
   *       "fue_solucionada": "SI",
   *       "solucion": "Se contactó al cliente",
   *       "fecha_novedad": "2026-07-20",
   *       "fecha_solucion": "2026-07-21",
   *       "fecha_devolucion": "2026-07-25"
   *     }
   *   ]
   * }
   */
  app.post('/api/devoluciones', autenticar(servicioToken), express.json({ limit: '50mb' }), (req, res) => {
    try {
      const { devoluciones } = req.body;

      // Validar que se envíe el array
      if (!Array.isArray(devoluciones) || devoluciones.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array "devoluciones" con al menos un elemento'
        });
      }

      // Validar campos requeridos en cada devolución
      const camposRequeridos = ['guia', 'orden', 'contador_novedades', 'fue_solucionada', 'solucion', 'fecha_novedad', 'fecha_solucion', 'fecha_devolucion'];
      const errores = [];

      devoluciones.forEach((dev, index) => {
        const faltantes = camposRequeridos.filter(campo => dev[campo] === undefined || dev[campo] === null);
        if (faltantes.length > 0) {
          errores.push(`Devolución[${index}]: faltan campos ${faltantes.join(', ')}`);
        }
      });

      if (errores.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Campos requeridos faltantes',
          detalles: errores
        });
      }

      // Procesar
      const resultado = procesarDevoluciones(devoluciones);

      res.json({
        success: true,
        ...resultado
      });

    } catch (error) {
      console.error('Error procesando devoluciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Health check (sin autenticación)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

module.exports = { crearApp };

// Arranque directo: `node server.js`. Con `require` (pruebas) no se escucha.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const HOST = (process.env.HOST || '').trim() || HOST_POR_DEFECTO;

  let app;
  try {
    app = crearApp({ servicioToken: (process.env.SERVICIO_TOKEN || '').trim() });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  app.listen(PORT, HOST, () => {
    console.log(`API Devoluciones corriendo en http://${HOST}:${PORT}`);
    console.log(`POST http://${HOST}:${PORT}/api/devoluciones`);
  });
}
